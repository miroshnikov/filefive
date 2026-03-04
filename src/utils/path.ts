import { basename, dirname } from 'node:path/posix'

export function split(path: string): string[] {
    const parts = []
    while (path && path != '/' && path != '.') {
        parts.push( basename(path) )
        path = dirname(path);
    }
    return parts.reverse()
}
