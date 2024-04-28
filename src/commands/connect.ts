import { readFileSync } from 'node:fs';
import { Path, ConnectionID, ConnectionConfig, ConnectionSettings } from '../types'
import { connectionID } from '../utils/URI'
import Connection from '../Connection'
import Password from '../Password'
import { whereEq } from 'ramda'



export default async function (file: Path, onError: (id: ConnectionID, e: any) => void): Promise<{ id: ConnectionID, settings: ConnectionSettings } | false> {
    const config = JSON.parse( readFileSync(file).toString() ) as ConnectionConfig
    const id = connectionID(config.scheme, config.user, config.host, config.port)
    await Password.get(id)
    try {
        const attributes = await Connection.open(config.scheme, config.user, config.host, config.port)
        const pwd = await Connection.get(id).pwd()
        const columns: ConnectionSettings['columns'] = 'columns' in config ? 
            attributes.map(a => {
                const c = config.columns.find(whereEq({name: a.name}))
                return {
                    ...a,
                    visible: !!c,
                    width: c?.width ?? 300
                }                
            }) :
            attributes.map(a => ({
                ...a,
                visible: true,
                width: 300
            }))
            const sorted = 'sort' in config && columns.find(whereEq({name: config.sort[0]}))
            if (sorted) {
                sorted.sort = config.sort[1]
            }
        return { id, settings: { pwd, columns } }
    } catch (error) {
        onError(id, error)
        return false
    }
}