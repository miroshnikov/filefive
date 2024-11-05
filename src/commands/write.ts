import { URI } from '../types'
import Connection from '../Connection'
import { parseURI, createURI, isLocal } from '../utils/URI'
import { dirname } from 'node:path'
import App from '../App'


export default async function (file: URI, content: string) {
    const {id, path} = parseURI(file)

    await Connection.get(id).write(path, content)

    if (!isLocal(file)) {
        App.remoteWatcher.refresh(createURI(id, dirname(path)))
    }
}
