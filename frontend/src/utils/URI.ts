import { URL } from 'whatwg-url'
import { URI, ConnectionID, Path } from '../../../src/types'
import { connectionID } from '../../../src/utils/URI'

export function parseURI(uri: URI) {
    const { protocol, pathname, username, hostname, port } = new URL(uri)

    return {
        id: connectionID(protocol.slice(0,-1), username, hostname, parseInt(port)),
        scheme: protocol.slice(0,-1),
        path: decodeURI(pathname) as Path,
        user: username,
        host: hostname,
        port
    }
}

export function createURI(id: ConnectionID, path: Path): URI {
    const u = new URL(id)
    u.pathname = path;
    return u.toString() as URI
}