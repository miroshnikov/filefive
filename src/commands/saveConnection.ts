import { read } from '../Local'
import { connectionID } from '../utils/URI'
import { Path, ConnectionSettings, ExplorerLayout, ExplorerConfig, ConnectionConfig } from '../types'
import { stat } from '../Local'
import { whereEq, omit } from 'ramda'
import { writeFile } from 'node:fs/promises'
import Password from '../Password'


export function getLayout(settings: ExplorerLayout): ExplorerConfig {
    return {
        columns: settings.columns.filter(whereEq({visible: true})).map(({name, width}) => ({name, width})),
        sort: settings.sort
    }
}


export type SaveConnectionSettings = 
    | Pick<ConnectionConfig, 'scheme'|'host'|'port'|'user'|'password'> 
    | Pick<ConnectionSettings, 'layout'|'path'|'history'>


export default async function (path: Path, settings: SaveConnectionSettings) {
    const content = stat(path) ? await read(path) : null
    if (stat(path)) {
        if (!content) {
            throw new Error(`Cant read connection file: ${path}`)
        }
    }

    let config = content ? JSON.parse(content) as ConnectionConfig : {} as Partial<ConnectionConfig>

    if ('scheme' in settings) {
        config = {...config, ...omit(['password'], settings)}
        if (settings.password.length) {
            Password.save(
                connectionID(settings.scheme, settings.user, settings.host, settings.port), 
                settings.password
            )
        }
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
        if (settings.history) {
            config.history = settings.history
        }
    }

    if (!config) {
        throw new Error(`Save invalid config into ${path}`)
    }

    await writeFile(path, JSON.stringify(config))
}
