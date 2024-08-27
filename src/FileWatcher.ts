import { watch } from 'node:fs/promises'
import { WatchEventType } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { Path } from './types'
import { stat, LocalFileInfo } from './Local'
import ReferenceCountMap from './utils/ReferenceCountMap'


export default class {
    constructor(private listener: (path: Path, stat: LocalFileInfo|null, event?: WatchEventType) => void) {}

    async watch(path: Path) {
        if (this.watched.inc(path)) {
            return
        }
        try {
            const ac = new AbortController()
            this.watched.set(path, ac)
            for await (const {eventType, filename} of watch(path, { signal: ac.signal })) {

                let newPath = path
                if (eventType == "rename" && basename(path) !== filename) {
                    newPath = join(dirname(path), filename)
                    this.watched.renameKey(path, newPath)
                }
                try {
                    this.listener(path, stat(newPath), eventType)
                } catch (e) {
                    this.listener(path, null, eventType)
                }
            }
        } catch(e) {
            console.error('Error while watch file', e)
        }
    }

    unwatch(dir: Path) {
        this.watched.dec(dir)?.abort()
    }

    private watched = new ReferenceCountMap<Path, AbortController>
}