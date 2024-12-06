import { URI } from '../types'
import { isLocal, parseURI } from '../utils/URI'
import { stat } from '../Local'
import LocalWatcher from '../LocalWatcher'
import RemoteWatcher from '../RemoteWatcher'
import FileWatcher from '../FileWatcher'


export default async function (uri: URI, local: LocalWatcher, remote: RemoteWatcher, file: FileWatcher) {
    if (isLocal(uri)) {
        const { path } = parseURI(uri)
        const f = stat(path)
        if (f) {
            if (f.dir) {
                local.watch(path)
            } else {
                file.watch(path)
            }
        } else {
            local.watch(path)
        }
    } else {
        remote.watch(uri)
    }
}