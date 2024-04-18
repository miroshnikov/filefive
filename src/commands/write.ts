import { URI, FailureType } from '../types'
import Connection from '../Connection'
import { parseURI, createURI, isLocal } from '../utils/URI'
import { dirname } from 'node:path'
import App from '../App'


export default function (file: URI, content: string, connPath: string) {
    const {id, path} = parseURI(file)

    // if (isLocal(file) && path.startsWith(connPath) && !content) {
        // TODO add password to credentials
    // }
    Connection.get(id).write(path, content)
    if (!isLocal(file)) {
        const {id, path} = parseURI(file)
        App.remoteWatcher.refresh(createURI(id, dirname(path)))
    }
}
