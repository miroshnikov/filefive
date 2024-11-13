import { basename, dirname, normalize, join, sep } from 'node:path'
import { Path, ConnectionID, QueueState, QueueActionType, QueueAction, LocalFileSystemID, FilterSettings } from '../types'
import { FileSystem, FileItem } from '../FileSystem'
import { Subject, Subscription } from 'rxjs'
import { whereEq } from 'ramda'
import Connection from '../Connection'
import { stat as localStat } from '../Local'
import { filterRegExp } from '../utils/filter'


export interface Queue {
    create(): Promise<void>
    resolve(action: QueueAction, forAll: boolean): void
    stop(): void
}


export const lsRemote = (connId: ConnectionID) => {
    const cache = new Map<string, Promise<FileItem[]|null>>()
    return async (path: string): Promise<FileItem[]|null> => {
        if (cache.has(path)) {
            return cache.get(path)
        }
        const [conn, close] = await Connection.transmit(connId)
        try {
            const list = conn.ls(path)
            cache.set(path, list)
            return list
        } catch(e) {
            cache.set(path, null)
        } finally {
            close()
        }
        return null
    }
}


export default abstract class TransmitQueue implements Queue {

    constructor(
        protected from: ConnectionID,
        protected to: ConnectionID,
        protected src: Path[],
        protected dest: Path,
        protected filter: FilterSettings,
        private onState: (state: QueueState) => void,
        private onConflict: (src: FileItem, dest: FileItem) => void,
        private onComplete: () => void
    ) {}

    public async create() {
        await this.enqueue(this.src, this.dest)

        if (this.stopped) {
            return
        }

        const stat = this.stat(this.to)

        this.processing = this.queue$.subscribe(async ({from, dirs, to, action}) => {
            let a = action ?? this.action
            const existing = await stat(join(to, ...dirs, from.name))
            if (existing) {
                if (a) {
                    if (a.type == QueueActionType.Skip) {
                        this.sendState(from.size)
                        return this.next()
                    }
                } else {
                    this.putOnHold(from, dirs, to, existing)
                    return this.next()
                }                
            }

            const [fs, close] = await Connection.transmit(this.from != LocalFileSystemID ? this.from : this.to)

            this.transmits++
            (new Promise((resolve) =>
                resolve(
                    existing ? 
                        this.applyAction(a, from, dirs, to, existing, this.transmit.bind(this, fs)) : 
                        this.transmit(fs, from, dirs, to)
                )
            )).then(() => {
                close()
                if (--this.transmits == 0 && this.closed) {
                    this.close()
                }
            })

            this.next()
        })
        this.next()
    }

    protected async enqueue(paths: Path[], dest: Path) {
        const ls = this.ls(this.from)

        let matchFilter = (file: FileItem) => true
        if (this.filter) {
            const re = filterRegExp(this.filter)
            matchFilter = (file: FileItem) => {
                const found = re.exec(file.name)
                return this.filter?.invert ?? false ? found === null : found !== null
            }
        }

        paths = paths.map(normalize).filter(path => !paths.find(ancestor => path.startsWith(ancestor + sep)))

        const add = async (path: Path, to: Path, dirs: string[] = []): Promise<any> => {
            if (this.stopped) {
                return
            }
            const parent = dirname(path)
            const from = (await ls(parent))?.find(whereEq({path}))
            if (from) {
                if (from.dir) {
                    return Promise.all(
                        (await ls(from.path))?.map(child => add(child.path, to, [...dirs, basename(path)]))
                    )
                } else {
                    if (matchFilter(from)) {
                        this.queue.push({ from, to, dirs })
                        this.totalCnt++
                        this.totalSize += from.size
                    }
                }
            }
        }

        await Promise.all(paths.map(path => add(path, dest)))
    }

    protected abstract transmit(fs: FileSystem, from: FileItem, dirs: string[], to: Path): Promise<void>

    public stop() {
        if (!this.stopped) {
            this.stopped = true
            this.pending = []
            this.close()
        }
    }

    public resolve(action: QueueAction, forAll = false) {
        forAll && (this.action = action)
        const drained = !this.queue.length
        this.queue.push(
            ...this.pending
                .splice(0, forAll ? this.pending.length : 1)
                .map(f => ({from: f.src, dirs: f.dirs, to: f.to, action}))
        )
        drained && this.queue$.next(this.queue.shift())
        if (this.pending.length) {
            const { src, dest } = this.pending[0]
            this.onConflict(src, dest)
        }
    }
 
    protected next() {
        if (this.queue.length) {
            this.queue$.next(this.queue.shift())
        } else if (!this.pending.length) {
            this.close()
        }
    }

    protected async close() {
        if (this.processing?.closed === false) {
            this.processing?.unsubscribe()
        }
        this.closed = true
        if (this.transmits == 0) {
            this.finalize()
            this.onComplete()
        }
    }

    protected sendState(size: number) {
        this.doneCnt++;
        this.doneSize += size;
        this.onState({ 
            totalCnt: this.totalCnt, 
            doneCnt: this.doneCnt, 
            totalSize: this.totalSize, 
            doneSize: this.doneSize,
            pending: this.pending.length
        })
    }

    protected async applyAction(
        action: QueueAction, 
        from: FileItem, 
        dirs: string[], 
        to: string,
        existing: FileItem, 
        transmit: (from: FileItem, dirs: string[], to: string) => Promise<void>
    ) {
        switch (action.type) {
            case QueueActionType.Replace: {
                await transmit(from, dirs, to)
            }
        }
    }

    protected putOnHold(src: FileItem, dirs: string[], to: Path, dest: FileItem) {
        this.pending.push({src, dirs, to, dest})
        if (this.pending.length == 1) {
            this.onConflict(src, dest)
        }
    }

    protected ls(connId: ConnectionID): (path: string) => Promise<FileItem[]|null> {
        return connId == LocalFileSystemID ? 
            (dir: string) => Connection.get(connId).ls(dir) : 
            lsRemote(connId)
    }

    protected stat(connId: ConnectionID): (path: string) => Promise<FileItem|null> {
        if (connId == LocalFileSystemID) {
            return (path: string) => Promise.resolve(localStat(path))
        }
        const ls = this.ls(connId)
        return async (path: string) => (await ls(dirname(path)))?.find(whereEq({path}))
    }

    protected async finalize() {}

    protected queue$ = new Subject<typeof this.queue[number]>()
    protected processing: Subscription
    protected queue: { from: FileItem, dirs: string[], to: Path, action?: QueueAction }[] = []
    protected pending: { src: FileItem, dirs: string[], to: Path, dest: FileItem }[] = []
    protected action: QueueAction
    protected stopped = false
    protected totalCnt = 0
    protected doneCnt = 0
    protected totalSize = 0
    protected doneSize = 0
    private transmits = 0
    private closed = false
}

export const queues = new Map<string, Queue>()