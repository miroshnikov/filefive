import { read } from '../Local'
import { connectionID } from '../utils/URI'
import { Path, ConnectionSettings, ExplorerSettings, ExplorerConfig, ConnectionConfig } from '../types'
import { stat } from '../Local'
import { whereEq, omit } from 'ramda'
import { writeFile } from 'node:fs/promises'
import Password from '../Password'


export function getSettings(settings: ExplorerSettings): ExplorerConfig {
    return {
        columns: settings.columns.filter(whereEq({visible: true})).map(({name, width}) => ({name, width})),
        sort: settings.sort,
        history: settings.history,
        filter: settings.filter
    }
}


export type SaveConnectionSettings = 
    | (Pick<ConnectionConfig, 'scheme'|'host'|'port'|'user'|'password'> & { savePassword: boolean })
    | Pick<ConnectionSettings, 'local'|'remote'|'path'|'sync'>


export default async function (path: Path, settings: SaveConnectionSettings) {
    const content = stat(path) ? await read(path) : null
    if (stat(path) && !content) {
        throw new Error(`Cant read connection file: ${path} ${typeof content}`)
    }

    let config = content ? JSON.parse(content) as ConnectionConfig : {} as Partial<ConnectionConfig>

    if ('scheme' in settings) {
        const id = connectionID(settings.scheme, settings.user, settings.host, settings.port)
        config = {...config, ...omit(['password', 'savePassword'], settings)}
        Password.delete(id, true)
        if (settings.password.length) {
            Password.set(id, settings.password, true, settings.savePassword)
        }
    } else {
        if (settings.local) {
            config.local = getSettings(settings.local)
        }
        if (settings.remote) {
            config.remote = getSettings(settings.remote)
        }
        if (settings.path) {
            config.path = settings.path
        }
        config.sync = settings.sync
    }

    if (!config) {
        throw new Error(`Save invalid config into ${path}`)
    }
    await writeFile(path, JSON.stringify(config))
}
