import { basename, dirname, sep } from 'path'

export function split(path: string): string[] {
    const parts = []
    while (path && path != sep && path != '.') {
        parts.push( basename(path) )
        path = dirname(path);
    }
    return parts.reverse()
}
