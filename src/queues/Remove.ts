import { basename, dirname } from 'node:path'
import { Queue } from './Queue'
import { Path, ConnectionID, QueueState, FailureType, QueueAction } from '../types'
import { FileItem } from '../FileSystem'
import Connection from '../Connection'
import { createURI } from '../utils/URI'
import RemoteWatcher from '../RemoteWatcher'


export default class RemoveQueue implements Queue {
    constructor(
        private connId: ConnectionID,
        private paths: Path[],
        private onState: (state: QueueState) => void,
        private onError: (reason: any) => void,
        private onComplete: () => void,
        private watcher: RemoteWatcher
    ) {}


    public async create() {
        const totalCnt = this.paths.length
        let doneCnt = 0

        this.paths.forEach(async path => {
            const dir = dirname(path)
            const [conn, close] = await Connection.transmit(this.connId)
            if (this.closed) {
                return
            }
            if (!this.touched.has(dir)) {
                try {
                    this.touched.set(dir, await conn.ls(dir))
                } catch(e) {
                    this.touched.set(dir, null)
                }
            }
            const name = basename(path)
            const file = this.touched.get(dir)?.find(f => f.name == name)
            if (file) {
                try {
                    await conn.rm(path, file.dir)
                } catch (error) {
                    this.onError({
                        type: FailureType.RemoteError,
                        id: this.connId,
                        error
                    })
                }
            }
            close()
            
            this.onState({
                totalCnt,
                doneCnt: ++doneCnt,
                totalSize: 0,
                doneSize: 0,
                pending: 0
            })

            if (doneCnt == totalCnt) {
                this.close()
            }
        })
    }

    public close() {
        this.closed = true
        this.onComplete()
        this.touched.forEach((files, dir) => {
            this.watcher.refresh(createURI(this.connId, dir))
        })
    }

    public resolve(action: QueueAction, forAll: boolean): void {
    }

    private touched = new Map<Path, FileItem[]|null>()
    private closed = false
}