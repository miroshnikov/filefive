import { basename, dirname } from 'path'

export function winToUnix(path: string): string {
    return '/' + path.replace(/\\/g, '/')
}

export function unixToWin(path: string): string {
    return path.replace(/^\//, '').replace(/\//g, '\\')
}

export function split(path: string): string[] {
    const parts = []
    while (path && path != '/' && path != '.') {
        parts.push( basename(path) )
        path = dirname(path);
    }
    return parts.reverse()
}
