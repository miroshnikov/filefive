import TransmitQueue from './Queue'
import { dirname } from 'node:path'
import { Path, URI, ConnectionID, QueueState, QueueActionType } from '../types'
import { FileSystem, FileItem } from '../FileSystem'
import { memoizeWith, identity, whereEq } from 'ramda'
import Connection from '../Connection'
import { stat, list } from '../Local'
import RemoteWatcher from '../RemoteWatcher'


export default class UploadQueue extends TransmitQueue {

    constructor(
        private connId: ConnectionID,
        private src: Path[],
        private dest: Path,
        onState: (state: QueueState) => void,
        onConflict: (src: FileItem, dest: FileItem) => void,
        private onError: (reason: any) => void,
        onComplete: () => void,
        private watcher: RemoteWatcher
    ) {
        super(onState, onConflict, onComplete)
    }

    public async create() {
        const conn = Connection.get(this.connId)
        await this.enqueue(
            this.src, 
            this.dest,
            path => Promise.resolve(list(path))
        )
        this.touched.add(this.dest)
        
        const transmit = async (fs: FileSystem, from: FileItem, to: string) => {
            if (!(stat(from.path))) {
                return
            }
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

    public close() {
        super.close()
        this.touched.forEach(path => this.watcher.refresh(this.connId + path as URI))
    }

    private touched = new Set<Path>()
}
