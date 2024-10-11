import { URI, FailureType } from '../types'
import Connection from '../Connection'
import { parseURI, isLocal } from '../utils/URI'
import { join } from 'node:path'
import App from '../App'


export default function (name: string, parent: URI) {
    const {id, path} = parseURI(parent)
    try {
        Connection.get(id).mkdir(join(path, name))
    } catch (error) {
        App.onError({ type: FailureType.RemoteError, id, error })
    }
    if (!isLocal(parent)) {
        App.remoteWatcher.refresh(parent)
    }
}
