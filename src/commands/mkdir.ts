import { URI } from '../types'
import Connection from '../Connection'
import { parseURI, isLocal } from '../utils/URI'
import { join } from 'node:path'
import App from '../App'


export default function (name: string, parent: URI) {
    const {id, path} = parseURI(parent)
    Connection.get(id).mkdir(join(path, name))
    if (!isLocal(parent)) {
        App.remoteWatcher.refresh(parent)
    }
}
