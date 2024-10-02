import { join } from 'node:path'
import TransmitQueue from './Queue'
import { LocalFileSystemID, Path, ConnectionID, QueueState } from '../types'
import { FileSystem, FileItem } from '../FileSystem'
import { touch } from '../Local'


export default class DownloadQueue extends TransmitQueue {
    
    constructor(
        connId: ConnectionID,
        src: Path[],
        dest: Path,
        onState: (state: QueueState) => void,
        onConflict: (src: FileItem, dest: FileItem) => void,
        private onError: (reason: any) => void,
        onComplete: () => void
    ) {
        super(connId, LocalFileSystemID, src, dest, onState, onConflict, onComplete)
    }

    protected async transmit(fs: FileSystem, from: FileItem, dirs: string[], to: Path) {
        if (this.stopped) {
            return
        }
        
        const dest = join(to, ...dirs, from.name)
        await touch(dest)
        try {
            await fs.get(from.path, dest)
        } catch(error) { 
            this.onError(error) 
        }
        this.sendState(from.size)
    }
}
