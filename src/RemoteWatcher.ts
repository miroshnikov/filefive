import { URI, Files } from './types'
import ReferenceCountMap from './utils/ReferenceCountMap'
import Connection from './Connection'
import { parseURI } from './utils/URI'


export default class RemoteWatcher {
    constructor(
        private listener: (uri: URI, files: Files) => void,
        private onMissing: (uri: URI) => void,
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
        console.log('RemoteWatcher:refresh', uri, this.watched.has(uri));
        if (this.watched.has(uri)) {
            try {
                Connection.list(id, path).then(files => this.listener(uri, this.transform(files)))
            } catch (e) {
                this.unwatch(uri)
                this.onMissing(uri)
            }
        }
            
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
