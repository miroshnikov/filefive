import { basename, dirname, normalize, sep } from 'node:path'
import { Path, QueueState, QueueActionType, QueueAction } from '../types'
import { FileItem } from '../FileSystem'
import { whereEq } from 'ramda'
import { Subject, Subscription } from 'rxjs'


export interface Queue {
    create(): Promise<void>
    resolve(action: QueueAction, forAll: boolean): void
    close(): void
} 

export default abstract class TransmitQueue implements Queue {

    constructor(
        private onState: (state: QueueState) => void,
        private onConflict: (src: FileItem, dest: FileItem) => void,
        private onComplete: () => void
    ) {}

    public abstract create(): Promise<void>

    public async close() {
        if (this.processing?.closed === false) {
            this.processing?.unsubscribe()
        }
        await Promise.allSettled(this.transmits)
        this.finalize()
        this.onComplete()
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

    protected async enqueue(paths: Path[], dest: Path, ls: (path: string) => Promise<FileItem[]>) {
        paths = paths.map(normalize).filter(path => !paths.find(ancestor => path.startsWith(ancestor + sep)))

        const add = async (path: Path, to: Path, dirs: string[] = []) => {
            const parent = dirname(path)
            const from = (await ls(parent)).find(whereEq({path}))
            if (from) {
                if (from.dir) {
                    const items = await ls(path)
                    for (const item of items) {
                        await add(item.path, to, [...dirs, basename(path)])
                    }
                } else {
                    this.queue.push({ from, to, dirs })
                }
            }
        }

        for (const path of paths) {
            await add(path, dest)
        }

        this.queue.forEach(({from: {size}}) => { this.totalCnt++; this.totalSize += size })
    }

    protected next() {
        if (this.queue.length) {
            this.queue$.next(this.queue.shift())
        } else if (!this.pending.length) {
            this.close()
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

    protected applyAction(
        action: QueueAction, 
        from: FileItem, 
        dirs: string[], 
        to: string,
        existing: FileItem, 
        transmit: (from: FileItem, dirs: string[], to: string) => Promise<void>
    ) {
        switch (action.type) {
            case QueueActionType.Replace: {
                const p = transmit(from, dirs, to)
                this.transmits.push(p)
                return p
            }

        }
    }

    protected putOnHold(src: FileItem, dirs: string[], to: Path, dest: FileItem) {
        this.pending.push({src, dirs, to, dest})
        if (this.pending.length == 1) {
            this.onConflict(src, dest)
        }
    }

    protected finalize() {}

    protected queue$ = new Subject<typeof this.queue[number]>()
    protected processing: Subscription
    private queue: { from: FileItem, dirs: string[], to: Path, action?: QueueAction }[] = []
    private pending: { src: FileItem, dirs: string[], to: Path, dest: FileItem }[] = []
    protected action: QueueAction
    protected transmits: Promise<void>[] = []
    private totalCnt = 0
    private doneCnt = 0
    private totalSize = 0
    private doneSize = 0
}

export const queues = new Map<string, Queue>()