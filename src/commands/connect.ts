import { readFileSync } from 'node:fs';
import { parse } from 'path'
import { Path, ConnectionID, ConnectionConfig, ConnectionSettings, ExplorerConfig, ExplorerSettings, SortOrder } from '../types'
import { FileAttributes } from '../FileSystem'
import { ATTRIBUTES as LOCAL_ATTRIBUTES } from '../fs/Local'
import { connectionID } from '../utils/URI'
import Connection from '../Connection'
import Password from '../Password'
import { whereEq, isNotNil } from 'ramda'



export function explorerSettings(attributes: FileAttributes, config?: ExplorerConfig): ExplorerSettings {
        return { 
            columns:
                config ? 
                    [
                        ...config.columns
                            .map(({name, width}) => {
                                const attribute = attributes.find(whereEq({name}))
                                return attribute ? { ...attribute, visible: true, width } : null
                            })
                            .filter(isNotNil),
                        ...attributes
                            .filter(({name}) => !config.columns.find(c => name == c.name))
                            .map(a => ({...a, visible: false, width: 300}))
                     ] :
                    attributes.map(a => ({...a, visible: true, width: 300})), 
            ...(config ? { sort: config.sort } : { sort: ['name', SortOrder.Asc] } ) 
        }
}


export default async function (file: Path, onError: (id: ConnectionID, e: any) => void): Promise<{ id: ConnectionID, settings: ConnectionSettings } | false> {
    const config = JSON.parse( readFileSync(file).toString() ) as ConnectionConfig
    const id = connectionID(config.scheme, config.user, config.host, config.port)
    await Password.get(id)
    try {
        const attributes = await Connection.open(config.scheme, config.user, config.host, config.port)
        const pwd = await Connection.get(id).pwd()
        const settings: ConnectionSettings = {
            name: parse(file).name,
            attributes,
            pwd, 
            layout: {
                local: explorerSettings(LOCAL_ATTRIBUTES, config.layout?.local), 
                remote: explorerSettings(attributes, config.layout?.remote)
            },
            path: {
                local: config.path?.local,
                remote: config.path?.remote ?? pwd
            }
        }
        return { id, settings }
    } catch (e) {
        onError(id, e)
        return false
    }
}
