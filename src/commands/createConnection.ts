import { connectionID } from '../utils/URI'
import Password from '../Password'
import { omit } from 'ramda'
import { writeFile } from 'node:fs/promises'


interface NewConnection {
    scheme: string
    host: string
    port: number
    user: string
    password: string
}

export default async function (path: string, content: string) {
    const connection: NewConnection = JSON.parse(content)
    Password.set(
        connectionID(connection.scheme, connection.user, connection.host, connection.port), 
        connection.password, 
        true
    )
    writeFile(path, JSON.stringify(omit(['password'], connection)))
}