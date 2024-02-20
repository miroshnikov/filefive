import { URI } from '../types'
import Connection from '../Connection'
import { parseURI, createURI, isLocal } from '../utils/URI'
import { dirname } from 'node:path'
import App from '../App'


export default function (file: URI, content: string) {
    const {id, path} = parseURI(file)
    Connection.get(id).write(path, content)
    if (!isLocal(file)) {
        const {id, path} = parseURI(file)
        App.remoteWatcher.refresh(createURI(id, dirname(path)))
    }
}
