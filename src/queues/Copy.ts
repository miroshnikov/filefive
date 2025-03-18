import { dirname, join } from 'node:path'
import TransmitQueue from './Queue'
import { Path, ConnectionID, QueueState, LocalFileSystemID, FilterSettings } from '../types'
import { FileSystem, FileItem } from '../FileSystem'
import { createURI } from '../utils/URI'
import RemoteWatcher from '../RemoteWatcher'


export default class CopyQueue extends TransmitQueue {
    constructor(
        connId: ConnectionID,
        src: Path[],
        dest: Path,
        filter: FilterSettings,
        fromRoot: Path|undefined,
        onState: (state: QueueState) => void,
        onConflict: (src: FileItem, dest: FileItem) => void,
        private onError: (reason: any) => void,
        onComplete: (stopped: boolean) => void,
        private watcher: RemoteWatcher,
        private move: boolean
    ) {
        super(connId, connId, src, dest, filter, fromRoot, onState, onConflict, onComplete)
    }

    protected async enqueue(paths: Path[], dest: Path) {
        if (this.move) { // No filter
            const stat = this.stat(this.from)
            await Promise.all(
                paths
                    .filter(path => path != dest && dirname(path) != dest)
                    .map(async path => {
                        const from = await stat(path)
                        if (from) {
                            this.queue.push({
                                from,
                                dirs: [],
                                to: this.dest
                            })
                            this.totalCnt++
                            this.totalSize++
                        }
                    })
            )
        } else {
            await super.enqueue(paths, dest)
        }
    }

    protected async transmit(fs: FileSystem, from: FileItem, dirs: string[], to: Path) {
        if (this.stopped) {
            return
        }
        try {
            let p: Promise<void>
            if (this.move) {
                p = fs.mv(from.path, join(to, ...dirs, from.name))
                const parent = dirname(from.path)
                this.touched.set(parent, [ ...(this.touched.get(parent) ?? []), p])
            } else {
                p = fs.cp(from.path, join(to, ...dirs, from.name), from.dir)
            }
            await p
            this.touched.set(to, [...(this.touched.get(to) ?? []), p])
        } catch(error: any) { 
            this.onError(error) 
        }
        this.sendState(from.size)
    }

    protected async finalize() {
        if (this.to != LocalFileSystemID) {
            await Promise.all(Array.from(this.touched.values()).flat())
            Array.from(this.touched.keys()).forEach(path => 
                this.watcher.refresh(createURI(this.to, path))
            )
        }
    }

    private touched = new Map<Path, Promise<void>[]>()
}