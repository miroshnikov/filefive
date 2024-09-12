import { read } from '../Local'
import { ConnectionConfig, Path } from '../types'
import Password from '../Password'
import { connectionID } from '../utils/URI'


export default async function (path: Path): Promise<ConnectionConfig> {
    const config = JSON.parse( await read(path) ) as ConnectionConfig
    config.password = await Password.get(connectionID(config.scheme, config.user, config.host, config.port))
    return config
}
