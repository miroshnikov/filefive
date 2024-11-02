import { LocalFileSystemID, URI } from '../types'
import Connection from '../Connection'
import { parseURI, createURI, isLocal } from '../utils/URI'
import { dirname } from 'node:path'
import saveSettings from './saveSettings'
import App from '../App'


export default async function (file: URI, content: string, settingsPath: string) {
    const {id, path} = parseURI(file)
    if (id == LocalFileSystemID && path == settingsPath) {
        await saveSettings(settingsPath, content)
    } else {
        await Connection.get(id).write(path, content)
    }
    if (!isLocal(file)) {
        App.remoteWatcher.refresh(createURI(id, dirname(path)))
    }
}
