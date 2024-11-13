import { join } from 'node:path'
import TransmitQueue from './Queue'
import { LocalFileSystemID, Path, ConnectionID, QueueState, FilterSettings } from '../types'
import { FileSystem, FileItem } from '../FileSystem'
import { stat } from '../Local'
import RemoteWatcher from '../RemoteWatcher'
import { createURI } from '../utils/URI'


export default class UploadQueue extends TransmitQueue {

    constructor(
        connId: ConnectionID,
        src: Path[],
        dest: Path,
        filter: FilterSettings,
        onState: (state: QueueState) => void,
        onConflict: (src: FileItem, dest: FileItem) => void,
        private onError: (reason: any) => void,
        onComplete: () => void,
        private watcher: RemoteWatcher
    ) {
        super(LocalFileSystemID, connId, src, dest, filter, onState, onConflict, onComplete)
    }

    protected async transmit(fs: FileSystem, from: FileItem, dirs: string[], to: Path) {
        if (this.stopped) {
            return
        }

        if (!(stat(from.path))) {
            return
        }
        try {
            let targetDir = to
            for (const dir of dirs) {
                targetDir = join(targetDir, dir)
                if (!this.touched.has(targetDir)) {
                    try {
                        this.touched.set(targetDir, fs.mkdir(targetDir))
                    } catch (e) {}
                }
                await this.touched.get(targetDir)
            }
            if (!this.stopped) {
                await fs.put(from.path, join(targetDir, from.name))
            }
        } catch(error) {
            this.onError(error)
        }
        this.sendState(from.size)
    }

    protected async finalize() {
        this.touched.set(this.dest, Promise.resolve())
        await Promise.all(Array.from(this.touched.values()))
        Array.from(this.touched.keys()).forEach(path => 
            this.watcher.refresh(createURI(this.to, path))
        )
    }

    private touched = new Map<Path, Promise<void>>()
}
