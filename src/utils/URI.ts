import { URI, ConnectionID, Path, LocalFileSystemID } from '../types'
import { URL, parseURL, serializeURL } from 'whatwg-url'

export function isLocal(uri: string) {
    return uri.startsWith('file:')
}

export function connectionID(scheme: string, user: string, host: string, port: number): ConnectionID {
    switch (scheme) {
        case 'file': 
            return LocalFileSystemID
        case 's3': 
            scheme = host.match(/^https?:\/\//)[0].slice(0, -3)
            host = host.substring(scheme.length+3)
            break
    }
    return `${scheme}://${user}@${host}:${port}` as ConnectionID
}


// https://url.spec.whatwg.org/#special-scheme
// https://jsdom.github.io/whatwg-url/#url=bmF0czovL2xvY2FsaG9zdDo0MjAwLw==&base=ZmlsZTovLy8=

export function parseURI(uri: URI) {
    const { protocol, pathname, username, hostname, port: p } = new URL(uri)
    const port = p ? parseInt(p) : defaultPort(protocol.slice(0,-1))

    return {
        id: connectionID(protocol.slice(0,-1), username, hostname, port),
        scheme: protocol.slice(0,-1),
        path: decodeURI(pathname) as Path,
        user: username,
        host: hostname,
        port
    }
}

export function createURI(id: ConnectionID, path: Path): URI {
    const u = parseURL(id)
    u.path = path
    if (!u.port) {
        u.port = defaultPort(u.scheme)
    }
    return serializeURL(u) as URI
}

function defaultPort(protocol: string) {
    switch (protocol) {
        case 'file':  return null
        case 'ftp':   return 21
        case 'sftp':  return 22
        case 'http':  return 80
        case 'https': return 443
    }
    console.error(`Default port for ${protocol} is not defined`)
    return null
}


