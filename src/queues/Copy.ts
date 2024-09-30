import { dirname, join } from 'node:path'
import TransmitQueue from './Queue'
import { Path, ConnectionID, QueueState, LocalFileSystemID, QueueActionType } from '../types'
import { FileSystem, FileItem } from '../FileSystem'
import { stat as localStat } from '../Local'
import Connection from '../Connection'
import { lsRemote } from './Queue'
import { whereEq } from 'ramda'
import RemoteWatcher from '../RemoteWatcher'
import { createURI } from '../utils/URI'


export default class CopyQueue extends TransmitQueue {
    constructor(
        private connId: ConnectionID,
        private src: Path[],
        private dest: Path,
        onState: (state: QueueState) => void,
        onConflict: (src: FileItem, dest: FileItem) => void,
        private onError: (reason: any) => void,
        onComplete: () => void,
        private watcher: RemoteWatcher,
        private move: boolean
    ) {
        super(onState, onConflict, onComplete)
    }

    public async create() {

        const stat = async (path: string) => {
            return this.connId == LocalFileSystemID ?
                localStat(path) :
                (await lsRemote(this.connId)(dirname(path))).find(whereEq({path}))
        }

        await Promise.all(
            this.src.filter(path => dirname(path) != this.dest).map(async path => {
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

        const transmit = async (fs: FileSystem, from: FileItem, dirs: string[], to: string) => {
            if (this.stopped) {
                return
            }
            try {
                if (this.move) {
                    this.connId != LocalFileSystemID && this.touched.add(dirname(from.path))
                    await fs.mv(from.path, join(to, from.name))
                } else {
                    // TODO:  copy remote files
                }
                this.connId != LocalFileSystemID && this.touched.add(to)
            } catch(error) { 
                this.onError(error) 
            }
            this.sendState(1)
        }

        this.processing = this.queue$.subscribe(async ({from, dirs, to, action}) => {
            let a = action ?? this.action
            const existing = await stat(join(to, from.name))
            if (existing) {
                if (a) {
                    if (a.type == QueueActionType.Skip) {
                        this.sendState(1)
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

    protected finalize() {
        Array.from(this.touched.keys()).forEach(path => 
            this.watcher.refresh(createURI(this.connId, path))
        )
    }

    private touched = new Set<Path>()
}