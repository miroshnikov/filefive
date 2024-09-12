import { URI } from '../types'
import Connection from '../Connection'
import { parseURI, createURI, isLocal } from '../utils/URI'
import { dirname, join } from 'node:path'
import App from '../App'
// import { stat } from '../Local'
// import saveConnection from './saveConnection'
// import saveSettings from './saveSettings'


export default async function (file: URI, content: string, dataPath: string, settingsPath: string) {
    const {id, path} = parseURI(file)
    
    // if (isLocal(file)) {
    //     if (path.startsWith(join(dataPath, 'connections'))) {
    //         stat(path) ? 
    //             saveConnection(path, content):
    //             createConnection(path, content)
    //         return
    //     } else if (path == settingsPath) {
    //         saveSettings(settingsPath, content)
    //         return
    //     }
    // }
    Connection.get(id).write(path, content)
    if (!isLocal(file)) {
        App.remoteWatcher.refresh(createURI(id, dirname(path)))
    }
}
