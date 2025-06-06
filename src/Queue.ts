import { basename, dirname, join } from 'node:path'
import { Path, URI, ConnectionID, QueueType, QueueState, QueueActionType, QueueAction, FailureType } from './types'
import { FileSystem, FileItem } from './FileSystem'
import { stat, touch, list } from './Local'
import { parseURI, createURI } from './utils/URI'
import { pipe, prop, memoizeWith, identity, whereEq } from 'ramda'
import { Subject, Subscription } from 'rxjs'
import Connection from './Connection'
import logger from './log'
import RemoteWatcher from './RemoteWatcher'


export default class Queue {
    constructor(
        private type: QueueType,
        private connId: ConnectionID,
        src: URI[],
        dest: URI,
        private watcher: RemoteWatcher,
        private onState: (state: QueueState) => void,
        private onConflict: (src: FileItem, dest: FileItem) => void,
        private onError: (reason: any) => void,
        private onComplete: () => void
    ) {
        if (type == QueueType.Download) {
            this.download(src, parseURI(dest)['path'])
        } else if (type == QueueType.Upload) {
            this.upload(src.map(uri => parseURI(uri)['path']), dest)
        } else {
            this.remove(src.map(uri => parseURI(uri)['path']))
        }
    }

    public resolve(action: QueueAction, forAll = false) {
        forAll && (this.action = action)
        const drained = !this.queue.length
        this.queue.push( ...this.pending.splice(0, forAll ? this.pending.length : 1).map(f => ({from: f.src, to: f.dest.path, action})) )
        drained && this.queue$.next(this.queue.shift())
        if (this.pending.length) {
            const { src, dest } = this.pending[0]
            this.onConflict(src, dest)
        }
    }

    public close() {
        if (this.processing?.closed === false) {
            this.processing?.unsubscribe()
            this.onComplete()
            if (this.type == QueueType.Upload || this.type == QueueType.Remove) {
                this.touched.forEach(path => this.watcher.refresh(this.connId + path as URI))
            }
        }
    }

    private async download(src: URI[], dest: string) {
        await this.enqueue(
            src.map(pipe(parseURI, prop('path'))), 
            dest,
            memoizeWith(identity, (path: string) => Connection.list(this.connId, path))
        )

        const transmit = async (fs: FileSystem, from: FileItem, to: Path) => {
            await touch(to)
            logger.log(`start downloading ${from.path} -> ${to}`)
            try {
                await fs.get(from.path, to)
            } catch(error) { 
                this.onError(error) 
            }
            logger.log(`end downloading ${from.path}`)
            this.sendState(from.size)
        }

        this.processing = this.queue$.subscribe(async ({from, to, action}) => {
            let a = action ?? this.action
            const existing = stat(to)
            if (existing) {
                if (a) {
                    if (a.type == QueueActionType.Skip) {
                        this.sendState(from.size)
                        return this.next()
                    }
                } else {
                    this.putOnHold(from, existing)
                    return this.next()
                }                
            }
            const [fs, close] = await Connection.transmit(this.connId)
            existing ? 
                this.applyAction(a, from, existing, transmit.bind(this, fs)).then(close) : 
                transmit(fs, from, to).then(close)
            this.next()
        })
        this.next()
    }

    private async upload(src: Path[], dest: URI) {
        const conn = Connection.get(this.connId)
        const to = parseURI(dest)['path']
        await this.enqueue(
            src, 
            to,
            path => Promise.resolve(list(path))
        )
        this.touched.add(to)
        
        const transmit = async (fs: FileSystem, from: FileItem, to: string) => {
            if (!(stat(from.path))) {
                return
            }
            logger.log(`start uploading ${from.path} -> ${to}`)
            try {
                const dir = dirname(to)
                if (!this.touched.has(dir)) {
                    await fs.mkdir(dir)
                }
                await fs.put(from.path, to)
                this.touched.add(dir)
            } catch(error) { 
                this.onError(error) 
            }
            logger.log(`end uploading ${from.path}`)
            this.sendState(from.size)
        }

        const ls = memoizeWith(identity, async (path: string) => {
            try {
                return await conn.ls(path)
            } catch(e) {}
            return []
        })
        const exists = async (path: string) => (await ls(dirname(path))).find(whereEq({path}))

        this.processing = this.queue$.subscribe(async ({from, to, action}) => {
            let a = action ?? this.action
            const existing = await exists(to)
            if (existing) {
                if (a) {
                    if (a.type == QueueActionType.Skip) {
                        this.sendState(from.size)
                        return this.next()
                    }
                } else {
                    this.putOnHold(from, existing)
                    return this.next()
                }                
            }
            const [fs, close] = await Connection.transmit(this.connId)
            existing ? 
                this.applyAction(a, from, existing, transmit.bind(this, fs)).then(close) : 
                transmit(fs, from, to).then(close)
            this.next()
        })
        this.next()
    }

    private async remove(paths: Path[]) {
        this.totalCnt = paths.length
        const touched = new Map<Path, FileItem[]|null>()
        paths.forEach(async path => {
            const dir = dirname(path)
            const [conn, close] = await Connection.transmit(this.connId)
            if (!touched.has(dir)) {
                try {
                    touched.set(dir, await conn.ls(dir)) 
                } catch(e) {
                    touched.set(dir, null)
                }
            }
            const name = basename(path)
            const file = touched.get(dir)?.find(f => f.name == name)
            if (file) {
                try {
                    await conn.rm(path, file.dir)
                } catch (error) {
                    this.onError({
                        type: FailureType.RemoteError,
                        id: this.connId,
                        error
                    })
                }
            }
            close()
            this.sendState(0)
            if (this.doneCnt == this.totalCnt) {
                this.onComplete()
                touched.forEach((files, dir) => {
                    this.watcher.refresh(createURI(this.connId, dir))
                })
            }
        })
    }


    private next() {
        if (this.queue.length) {
            this.queue$.next(this.queue.shift())
        } else if (!this.pending.length) {
            this.close()
        }
    }

    private async enqueue(paths: Path[], dest: Path, ls: (path: string) => Promise<FileItem[]>) {
        const add = async (path: Path, to: Path) => {
            const from = (await ls(dirname(path))).find(whereEq({path}))
            from && (from.dir ? 
                (await ls(path)).forEach(async f => await add(f.path, join(to, basename(path)))) : 
                this.queue.push({ from, to: join(to, basename(path)) })
            )
        }

        for (const path of paths) {
            await add(path, dest)
        }

        this.queue.forEach(({from: {size}}) => { this.totalCnt++; this.totalSize += size })
    }

    private applyAction(action: QueueAction, from: FileItem, to: FileItem, transmit: (from: FileItem, to: string) => Promise<void>) {
        switch (action.type) {
            case QueueActionType.Replace:
                return transmit(from, to.path)
        }
    }

    private putOnHold(src: FileItem, dest: FileItem) {
        this.pending.push({src, dest})
        if (this.pending.length == 1) {
            this.onConflict(src, dest)
        }
    }

    private sendState(size: number) {
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


    private queue: { from: FileItem, to: Path, action?: QueueAction }[] = []
    private queue$ = new Subject<{ from: FileItem, to: Path, action?: QueueAction }>()
    private processing: Subscription
    private totalCnt = 0
    private doneCnt = 0
    private totalSize = 0
    private doneSize = 0
    private pending: { src: FileItem, dest: FileItem }[] = []
    private action: QueueAction
    private touched = new Set<Path>()
}


export const queues = new Map<string, Queue>()