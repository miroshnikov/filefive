import { join } from 'node:path'
import TransmitQueue from './Queue'
import { Path, ConnectionID, QueueState, QueueActionType } from '../types'
import { FileSystem, FileItem } from '../FileSystem'
import { stat, touch } from '../Local'
import Connection from '../Connection'
import { lsRemote } from './Queue'


export default class DownloadQueue extends TransmitQueue {
    
    constructor(
        private connId: ConnectionID,
        private src: Path[],
        private dest: Path,
        onState: (state: QueueState) => void,
        onConflict: (src: FileItem, dest: FileItem) => void,
        private onError: (reason: any) => void,
        onComplete: () => void
    ) {
        super(onState, onConflict, onComplete)
    }


    public async create() {
        await this.enqueue(
            this.src, 
            this.dest,
            lsRemote(this.connId)
        )

        const transmit = async (fs: FileSystem, from: FileItem, dirs: string[], to: Path) => {
            const dest = join(to, ...dirs, from.name)
            await touch(dest)
            try {
                await fs.get(from.path, dest)
            } catch(error) { 
                this.onError(error) 
            }
            this.sendState(from.size)
        }

        if (this.stopped) {
            return
        }

        this.processing = this.queue$.subscribe(async ({from, dirs, to, action}) => {
            let a = action ?? this.action
            const existing = stat(join(to, ...dirs, from.name))
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
            const [fs, close] = await Connection.transmit(this.connId)
            existing ? 
                this.applyAction(a, from, dirs, to, existing, transmit.bind(this, fs)).then(close) : 
                transmit(fs, from, dirs, to).then(close)
            this.next()
        })
        this.next()
    }
}
