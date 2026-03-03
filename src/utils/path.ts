import { basename, dirname } from 'path'

export function winToUnix(path: string): string {
    return '/' + path.replace(/\\/g, '/')
}

export function unixToWin(path: string): string {
    path = path.replace(/^\//, '').replace(/\//g, '\\')
    if (!path) {
        path = '\\'
    } else if (path.match(/^[a-zA-Z]:$/)) {
        path += '\\'
    }
    return path
}

export function split(path: string): string[] {
    const parts = []
    while (path && path != '/' && path != '.') {
        parts.push( basename(path) )
        path = dirname(path);
    }
    return parts.reverse()
}
