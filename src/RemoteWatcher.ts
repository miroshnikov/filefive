import { sep }  from 'node:path'
import { URI, Files } from './types'
import ReferenceCountMap from './utils/ReferenceCountMap'
import Connection from './Connection'
import { parseURI } from './utils/URI'


export default class RemoteWatcher {
    constructor(
        private listener: (uri: URI, files: Files) => void,
        private onMissing: (uri: URI) => void
    ) {}

    public watch(uri: URI) {
        this.watched.inc(uri) || this.watched.set(uri, false)
        this.refresh(uri)        
    }

    public unwatch(uri: URI) {
        this.watched.dec(uri)
    }

    public refresh(uri: URI) {
        if (this.watched.has(uri)) {
            this.list(uri)
            Array.from(this.watched.keys()).forEach(dir => {
                if (dir.startsWith(uri + sep)) {
                    this.list(dir)
                }
            })
        }
    }

    private list(uri: URI) {
        const { id, path } = parseURI(uri)
        Connection.list(id, path)
            .then(files => this.listener(uri, files))
            .catch(() => {
                this.watched.del(uri)
                this.onMissing(uri)
            })
    }

    private watched = new ReferenceCountMap<URI, boolean>
}
