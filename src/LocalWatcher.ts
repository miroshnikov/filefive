import { WatchEventType } from 'node:fs';
import { join } from 'node:path'
import { Path } from './types'
import { list, watch, LocalFiles, stat } from './Local'
import ReferenceCountMap from './utils/ReferenceCountMap'


export default class {
    constructor(
        private listener: (dir: Path, files: LocalFiles, event?: WatchEventType, target?: string) => void,
        private onMissing: (path: string) => void,
        private transform = (files: LocalFiles) => files
    ) {}

    watch(dir: Path): LocalFiles {
        try {
            this.watched.inc(dir) || this.watched.set(dir, watch(dir, (event, target) => {
                if (event == 'rename') {
                    const child = join(dir, target)
                    if (this.watched.has(child) && !stat(child)) {
                        this.watched.del(child)
                        this.onMissing(child)
                    }
                }
                try {
                    this.listener(dir, this.transform(list(dir)), event, target)
                } catch (e) {
                    this.watched.del(dir)
                    this.onMissing(dir)
                }
            }))
    
            const files = this.transform(list(dir))
            this.listener(dir, files)
            return files

        } catch (e) {
            this.watched.del(dir)
            this.onMissing(dir)
        }
        return []
    }

    unwatch(dir: Path) {
        this.watched.dec(dir)?.()
    }

    private watched = new ReferenceCountMap<string, ReturnType<typeof watch>>
}