import { dirname, join } from 'node:path'
import TransmitQueue from './Queue'
import { Path, ConnectionID, QueueState, LocalFileSystemID, FilterSettings } from '../types'
import { FileSystem, FileItem } from '../FileSystem'
import RemoteWatcher from '../RemoteWatcher'
import { createURI } from '../utils/URI'
import { filterRegExp } from '../utils/filter'


export default class CopyQueue extends TransmitQueue {
    constructor(
        connId: ConnectionID,
        src: Path[],
        dest: Path,
        filter: FilterSettings,
        onState: (state: QueueState) => void,
        onConflict: (src: FileItem, dest: FileItem) => void,
        private onError: (reason: any) => void,
        onComplete: () => void,
        private watcher: RemoteWatcher,
        private move: boolean
    ) {
        super(connId, connId, src, dest, filter, onState, onConflict, onComplete)
    }

    protected async enqueue(paths: Path[], dest: Path) {

        let applyFilter = (file: FileItem) => true
        if (this.filter) {
            const re = filterRegExp(this.filter)
            applyFilter = (file: FileItem) => {
                if (file.dir) {
                    return true
                }
                const found = re.exec(file.name)
                return this.filter?.invert ?? false ? found === null : found !== null
            }
        }
        
        const stat = this.stat(this.from)
        await Promise.all(
            paths
                .filter(path => path != dest && dirname(path) != dest)
                .map(async path => {
                    const from = await stat(path)
                    if (from) {
                        if (applyFilter(from)){
                            this.queue.push({
                                from,
                                dirs: [],
                                to: this.dest
                            })
                            this.totalCnt++
                            this.totalSize++
                        }
                    }
                })
        )
    }

    protected async transmit(fs: FileSystem, from: FileItem, dirs: string[], to: Path) {
        if (this.stopped) {
            return
        }
        try {
            let p: Promise<void>
            if (this.move) {
                p = fs.mv(from.path, join(to, from.name))
                const parent = dirname(from.path)
                this.touched.set(parent, [ ...(this.touched.get(parent) ?? []), p])
            } else {
                p = fs.cp(from.path, join(to, from.name), from.dir)
            }
            this.touched.set(to, [ ...(this.touched.get(to) ?? []), p])
            await p
        } catch(error) { 
            this.onError(error) 
        }
        this.sendState(1)
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