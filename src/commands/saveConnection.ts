import { read } from '../Local'
import { connectionID } from '../utils/URI'
import { Path, ConnectionSettings, ExplorerSettings, ExplorerConfig, ConnectionConfig } from '../types'
import { stat } from '../Local'
import { whereEq, omit } from 'ramda'
import { writeFile } from 'node:fs/promises'
import Password from '../Password'


export function getLayout(settings: ExplorerSettings): ExplorerConfig {
    return {
        columns: settings.columns.filter(whereEq({visible: true})).map(({name, width}) => ({name, width})),
        sort: settings.sort
    }
}


export type SaveConnectionSettings = 
    | Pick<ConnectionConfig, 'scheme'|'host'|'port'|'user'|'password'> 
    | Pick<ConnectionSettings, 'layout'|'path'>


export default async function (path: Path, settings: SaveConnectionSettings) {
    const content = stat(path) ? await read(path) : null
    if (stat(path)) {
        if (!content) {
            throw new Error(`cant read connection file: ${path}`)
        }
    }

    let config = content ? JSON.parse(content) as ConnectionConfig : {} as Partial<ConnectionConfig>

    if ('scheme' in settings) {
        config = {...config, ...omit(['password'], settings)}
        Password.set(
            connectionID(settings.scheme, settings.user, settings.host, settings.port), 
            settings.password, 
            true
        )
    } else {
        if (settings.layout) {
            config.layout =  {
                local: getLayout(settings.layout.local),
                remote: getLayout(settings.layout.remote)
            }
        }
        if (settings.path) {
            config.path = settings.path
        }
    }

    await writeFile(path, JSON.stringify(config))
}

/*
import { connectionID } from '../utils/URI'
import Password from '../Password'
import { omit } from 'ramda'
import { writeFile } from 'node:fs/promises'


export interface Session {
    scheme: string
    host: string
    port: number
    user: string
    password: string
}

export default async function (path: string, content: string) {
    const connection: Session = JSON.parse(content)
    Password.set(
        connectionID(connection.scheme, connection.user, connection.host, connection.port), 
        connection.password, 
        true
    )
    writeFile(path, JSON.stringify(omit(['password'], connection)))
}
*/