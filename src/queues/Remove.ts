import { basename, dirname, normalize, sep } from 'node:path'
import { Queue } from './Queue'
import { Path, ConnectionID, QueueState, QueueAction } from '../types'
import Connection from '../Connection'
import { createURI } from '../utils/URI'
import RemoteWatcher from '../RemoteWatcher'
import { lsRemote } from './Queue'


export default class RemoveQueue implements Queue {
    constructor(
        private connId: ConnectionID,
        private paths: Path[],
        private onState: (state: QueueState) => void,
        private onError: (reason: any) => void,
        private onComplete: (stopped: boolean) => void,
        private watcher: RemoteWatcher
    ) {}


    public async create() {
        const paths = this.paths.map(normalize).filter(path => !this.paths.find(ancestor => path.startsWith(ancestor + sep)))

        interface ItemToRemove {
            path: string
            dir: boolean
            children: ItemToRemove[]
        }

        let totalCnt = 0
        let doneCnt = 0

        const ls = lsRemote(this.connId)

        const add = async (path: string, tree: ItemToRemove[]): Promise<ItemToRemove[]> => {
            const parent = dirname(path)
            const file = (await ls(parent))?.find(f => f.name == basename(path))
            if (!file) {
                return tree
            }
            this.touched.add(parent)
            let children: ItemToRemove[] = []
            if (file.dir) {
                children = (await Promise.all(
                    (await ls(file.path) ?? []).map(({path}) => add(path, []))
                )).flat(1)
            }
            totalCnt++
            return [...tree, { path, dir: file.dir, children }]
        }

        const files: ItemToRemove[] = []
        for (const path of paths) {
            files.push( ...await add(path, []) )
        }

        if (this.stopped) {
            return
        }

        const rm = async (item: ItemToRemove) => {
            for (const child of item.children) {
                await rm(child)
            }

            const [conn, close] = await Connection.transmit(this.connId)
            if (this.stopped) {
                close()
                return
            }

            try {
                await conn.rm(item.path, item.dir)
                this.onState({
                    totalCnt,
                    doneCnt: ++doneCnt,
                    totalSize: 0,
                    doneSize: 0,
                    pending: 0
                })
            } catch (error) {
                this.onError(error)
            } finally {
                close()
            }
        }

        await Promise.allSettled( files.map(rm) )

        this.touched.forEach(path => this.watcher.refresh(createURI(this.connId, path)))

        this.onComplete(this.stopped)
    }

    public stop() {
        this.stopped = true
    }

    public resolve(action: QueueAction, forAll: boolean): void {}

    private touched = new Set<Path>()
    private stopped = false
}