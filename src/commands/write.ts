import { LocalFileSystemID, URI } from '../types'
import Connection from '../Connection'
import { parseURI, createURI, isLocal } from '../utils/URI'
import { dirname } from 'node:path'
import saveSettings from './saveSettings'
import { commands } from '.'
import { mergeDeepRight } from 'ramda'
import App from '../App'


export default async function (file: URI, content: string, jsonMerge: boolean, settingsPath: string) {
    const {id, path} = parseURI(file)
    if (jsonMerge) {
        try {
            const fileContent = await commands.read(file)
            if (fileContent) {
                content = JSON.stringify( 
                    mergeDeepRight(
                        JSON.parse(fileContent), 
                        JSON.parse(content)
                    )
                )
            }
        } catch (e) {}
    }
    if (id == LocalFileSystemID && path == settingsPath) {
        await saveSettings(settingsPath, content)
    } else {
        await Connection.get(id).write(path, content)
    }
    if (!isLocal(file)) {
        App.remoteWatcher.refresh(createURI(id, dirname(path)))
    }
}
