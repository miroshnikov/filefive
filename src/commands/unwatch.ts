import { URI } from '../types'
import { isLocal, parseURI } from '../utils/URI'
import LocalWatcher from '../LocalWatcher'
import RemoteWatcher from '../RemoteWatcher'
import FileWatcher from '../FileWatcher'


export default async function (uri: URI, local: LocalWatcher, remote: RemoteWatcher, file: FileWatcher) {
    if (isLocal(uri)) {
        const { path } = parseURI(uri)
        local.unwatch(path)
        file.unwatch(path)
    } else {
        remote.unwatch(uri)
    }
}