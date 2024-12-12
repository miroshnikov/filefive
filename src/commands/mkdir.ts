import { URI, FailureType, LocalFileSystemID } from '../types'
import { mkdir } from 'node:fs/promises'
import Connection from '../Connection'
import { parseURI, isLocal } from '../utils/URI'
import { join } from 'node:path'
import { split } from '../utils/path'
import App from '../App'


export default async function (name: string, parent: URI) {
    let {id, path} = parseURI(parent)
    try {
        if (id == LocalFileSystemID) {
            await mkdir(join(path, name), { recursive: true })
        } else {
            const parts = split(name)
            const conn = Connection.get(id)
            for (let i=0; i<parts.length; i++) {
                path = join(path, parts[i])
                try {
                    await conn.mkdir(path)
                } catch (e) {
                    if (i == parts.length-1) {
                        throw e
                    }
                }
            }
        }
    } catch (error) {
        App.onError({ type: FailureType.RemoteError, id, message: 'message' in error ? error.message : String(error) })
    }
    if (!isLocal(parent)) {
        App.remoteWatcher.refresh(parent)
    }
}
