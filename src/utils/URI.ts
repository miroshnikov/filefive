import { URI, ConnectionID, Path } from '../types'


export function isLocal(uri: string) {
    return uri.startsWith('file:')
}

export function parseURI(uri: URI) {
    const { protocol, pathname, username, hostname, port: p } = new URL(uri)
    const port = p ? parseInt(p) : defaultPort(protocol)

    return {
        scheme: protocol.slice(0,-1),
        id: protocol == 'file:' ? 'file://' : `${protocol}//${username}@${hostname}:${port}` as ConnectionID,
        path: decodeURI(pathname) as Path,
        user: username,
        host: hostname,
        port
    }
}

function defaultPort(protocol: string) {
    switch (protocol) {
        case 'ftp:': return 21
        case 'ssh:': return 22
    }
    return 80
}
