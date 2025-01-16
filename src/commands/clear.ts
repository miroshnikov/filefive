import { dirname } from 'node:path'
import { URI, Path, LocalFileSystemID, FailureType } from '../types'
import { createURI, parseURI } from '../utils/URI'
import Connection from '../Connection'
import App from '../App'


export default async function (file: URI, force: boolean) {
    if (!force) {
        App.onError({ type: FailureType.ConfirmClear, file } )
        return
    }

    const { id, path } = parseURI(file)
    
    await Connection.get(id).write(path, '') 

    if (id != LocalFileSystemID) {
        App.remoteWatcher.refresh(createURI(id, dirname(path)))
    }
}