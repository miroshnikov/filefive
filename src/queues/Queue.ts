import { basename, dirname, join, normalize, sep } from 'node:path'
import { Path, QueueState, QueueActionType, QueueAction } from '../types'
import { FileItem } from '../FileSystem'
import { whereEq } from 'ramda'
import { Subject, Subscription } from 'rxjs'


export interface Queue {
    create(): Promise<void>
    close(): void
} 

export default abstract class TransmitQueue implements Queue {

    constructor(
        private onState: (state: QueueState) => void,
        private onConflict: (src: FileItem, dest: FileItem) => void,
        private onComplete: () => void
    ) {}

    public abstract create(): Promise<void>

    public close() {
        if (this.processing?.closed === false) {
            this.processing?.unsubscribe()
            this.onComplete()
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

    protected async enqueue(paths: Path[], dest: Path, ls: (path: string) => Promise<FileItem[]>) {
        paths = paths.map(normalize).filter(path => !paths.find(ancestor => path.startsWith(ancestor + sep)))

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

    protected applyAction(action: QueueAction, from: FileItem, to: FileItem, transmit: (from: FileItem, to: string) => Promise<void>) {
        switch (action.type) {
            case QueueActionType.Replace:
                return transmit(from, to.path)
        }
    }

    protected putOnHold(src: FileItem, dest: FileItem) {
        this.pending.push({src, dest})
        if (this.pending.length == 1) {
            this.onConflict(src, dest)
        }
    }

    private queue: { from: FileItem, to: Path, action?: QueueAction }[] = []
    protected queue$ = new Subject<{ from: FileItem, to: Path, action?: QueueAction }>()
    protected processing: Subscription
    private totalCnt = 0
    private doneCnt = 0
    private totalSize = 0
    private doneSize = 0
    private pending: { src: FileItem, dest: FileItem }[] = []
    protected action: QueueAction
}

export const queues = new Map<string, Queue>()