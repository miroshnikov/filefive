import { basename, dirname, join } from 'node:path'
import TransmitQueue from './Queue'
import { Path, URI, ConnectionID, QueueType, QueueState, QueueActionType, QueueAction, FailureType } from '../types'
import { FileSystem, FileItem } from '../FileSystem'
import { stat, touch, list } from '../Local'
import Connection from '../Connection'
import { parseURI, createURI } from '../utils/URI'
import { pipe, prop, memoizeWith, identity, whereEq } from 'ramda'
import logger from '../log'


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
            memoizeWith(identity, (path: string) => Connection.list(this.connId, path))
        )

        const transmit = async (fs: FileSystem, from: FileItem, to: Path) => {
            await touch(to)
            logger.log(`start downloading ${from.path} -> ${to}`)
            try {
                await fs.get(from.path, to)
            } catch(error) { 
                this.onError(error) 
            }
            logger.log(`end downloading ${from.path}`)
            this.sendState(from.size)
        }

        this.processing = this.queue$.subscribe(async ({from, to, action}) => {
            let a = action ?? this.action
            const existing = stat(to)
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
}