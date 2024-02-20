import { URI, Files } from './types'
import ReferenceCountMap from './utils/ReferenceCountMap'
import Connection from './Connection'
import { parseURI } from './utils/URI'


export default class RemoteWatcher {
    constructor(
        private listener: (uri: URI, files: Files) => void,
        private transform = (files: Files) => files
    ) {}

    public watch(uri: URI) {
        this.watched.inc(uri) || this.watched.set(uri, false)
        this.refresh(uri)        
    }

    public unwatch(uri: URI) {
        this.watched.dec(uri)
    }

    public refresh(uri: URI) {
        const { id, path } = parseURI(uri)
        this.watched.has(uri) && Connection.get(id)?.ls(path).then(files => this.listener(uri, this.transform(files)))
    }

    public touch(uri: URI) {
        this.watched.modify(uri, true)
    }

    public refreshTouched() {
        // ...refresh()
        // set all to false
    }

    private watched = new ReferenceCountMap<URI, boolean>
}
