import { URI } from '../types'
import Connection from '../Connection'
import { parseURI, createURI, isLocal } from '../utils/URI'
import { dirname, join } from 'node:path'
import { stat } from '../Local'
import App from '../App'
import { omit } from 'ramda'
import { writeFile } from 'node:fs/promises'
import saveConnection from './saveConnection'
import createConnection from './createConnection'



export default async function (file: URI, content: string, dataPath: string) {
    const {id, path} = parseURI(file)
    
    if (isLocal(file)) {
        if (path.startsWith(join(dataPath, 'connections'))) {
            stat(path) ? 
                saveConnection(path, content):
                createConnection(path, content)
            return
        } else if (path == join(dataPath, 'settings.json')) {
            await writeFile(path, JSON.stringify(omit(['paths'], JSON.parse(content))))
            return
        }
    }
    Connection.get(id).write(path, content)
    if (!isLocal(file)) {
        App.remoteWatcher.refresh(createURI(id, dirname(path)))
    }
}
