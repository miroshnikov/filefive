import { WatchEventType } from 'node:fs';
import { Path } from './types'
import { list, watch, LocalFiles } from './Local'
import ReferenceCountMap from './utils/ReferenceCountMap'


export default class {
    constructor(private listener: (dir: Path, files: LocalFiles, event?: WatchEventType, target?: string) => void) {}

    watch(dir: Path) {
        this.watched.inc(dir) || this.watched.set(dir, watch(dir, (event, target) => this.listener(dir, list(dir), event, target)))
        this.listener(dir, list(dir))
    }

    unwatch(dir: Path) {
        this.watched.dec(dir)?.()
    }

    private watched = new ReferenceCountMap<string, ReturnType<typeof watch>>
}