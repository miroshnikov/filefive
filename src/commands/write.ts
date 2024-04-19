import { URI } from '../types'
import Connection from '../Connection'
import { parseURI, createURI, isLocal, connectionID } from '../utils/URI'
import { dirname } from 'node:path'
import { stat } from '../Local'
import App from '../App'
import Password from '../Password'
import { omit } from 'ramda'


interface NewConnection {
    scheme: string
    host: string
    port: number
    user: string
    password: string
}

export default function (file: URI, content: string, connPath: string) {
    const {id, path} = parseURI(file)

    if (isLocal(file) && path.startsWith(connPath) && !stat(path)) {
        const connection: NewConnection = JSON.parse(content)
        Password.set(
            connectionID(connection.scheme, connection.user, connection.host, connection.port), 
            connection.password, 
            true
        )
        content = JSON.stringify(omit(['password'], connection))
    }
    Connection.get(id).write(path, content)
    if (!isLocal(file)) {
        App.remoteWatcher.refresh(createURI(id, dirname(path)))
    }
}
