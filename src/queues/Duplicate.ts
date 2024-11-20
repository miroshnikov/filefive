import CopyQueue from './Copy'
import { Path, ConnectionID, QueueState, FilterSettings, QueueActionType } from '../types'
import { FileItem } from '../FileSystem'
import RemoteWatcher from '../RemoteWatcher'


export default class DuplicateQueue extends CopyQueue {
    constructor(
        connId: ConnectionID,
        src: Path[],
        dest: Path,
        filter: FilterSettings,
        onState: (state: QueueState) => void,
        onConflict: (src: FileItem, dest: FileItem) => void,
        onError: (reason: any) => void,
        onComplete: (stopped: boolean) => void,
        watcher: RemoteWatcher
    ) {
        super(connId, src, dest, filter, onState, onConflict, onError, onComplete, watcher, false)
        this.resolve({ type: QueueActionType.Rename }, true)
    }

    protected async enqueue(paths: Path[], dest: Path) {
        await super.enqueue(paths, dest)

        for (const item of this.queue) {
            if (item.dirs.length) {
                const name = item.dirs[0]
                if (!this.newNames.has(name)) {
                    this.newNames.set(name, await this.rename(name, item.to))
                }
                item.dirs[0] = this.newNames.get(name)
            }
        }
    }

    private newNames = new Map<string, string>()
}

