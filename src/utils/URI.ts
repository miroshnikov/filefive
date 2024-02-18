import { URI, ConnectionID, Path } from '../types'


export function isLocal(uri: string) {
    return uri.startsWith('file:')
}

export function connectionID(scheme: string, user: string, host: string, port:number): ConnectionID {
    return scheme == 'file' ? 'file://' : `${scheme}://${user}@${host}:${port}` as ConnectionID
}

export function parseURI(uri: URI) {
    const { protocol, pathname, username, hostname, port: p } = new URL(uri)
    const port = p ? parseInt(p) : defaultPort(protocol)

    return {
        id: connectionID(protocol.slice(0,-1), username, hostname, port),
        scheme: protocol.slice(0,-1),
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
