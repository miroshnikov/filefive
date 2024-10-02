import { dirname, join } from 'node:path'
import { URI } from '../types'
import { isLocal, parseURI, createURI } from '../utils/URI'
import Connection from '../Connection'
import App from '../App'


export default async function (uri: URI, name: string) {
    const {id, path} = parseURI(uri)
    await Connection.get(id).mv(path, join(dirname(path), name))
    if (!isLocal(uri)) {
        App.remoteWatcher.refresh(createURI(id, dirname(path)))
    }
}