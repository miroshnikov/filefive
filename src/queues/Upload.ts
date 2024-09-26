import TransmitQueue from './Queue'
import { dirname, join } from 'node:path'
import { Path, ConnectionID, QueueState, QueueActionType } from '../types'
import { FileSystem, FileItem } from '../FileSystem'
import { memoizeWith, identity, whereEq } from 'ramda'
import Connection from '../Connection'
import { stat, list } from '../Local'
import RemoteWatcher from '../RemoteWatcher'
import { createURI } from '../utils/URI'


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
        this.touched.set(this.dest, Promise.resolve())
        
        const transmit = async (fs: FileSystem, from: FileItem, dirs: string[], to: string) => {
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

        const ls = memoizeWith(
            identity, 
            async (path: string) => {
                try {
                    return await conn.ls(path)
                } catch(e) {}
                return []
            }
        )

        if (this.stopped) {
            return
        }

        const exists = async (path: string) => (await ls(dirname(path))).find(whereEq({path}))

        this.processing = this.queue$.subscribe(async ({from, dirs, to, action}) => {
            let a = action ?? this.action
            const dest = join(...[to, ...dirs, from.name])
            const existing = await exists(dest)
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
                this.transmits.push( transmit(fs, from, dirs, to).then(close) )
            this.next()
        })
        this.next()
    }

    protected finalize() {
        Array.from(this.touched.keys()).forEach(path => 
            this.watcher.refresh(createURI(this.connId, path))
        )
    }

    private touched = new Map<Path, Promise<void>>()
}
