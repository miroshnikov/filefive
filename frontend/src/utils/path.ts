import { curry } from 'ramda'

export let sep = '/'

export function basename(path: string): string {
    return segments(path).pop()
}

export function dirname(path: string): string {
    return sep + segments(path).slice(0, -1).join(sep)
}

export function depth(path: string): number {
    return segments(path).length
}

export function join(...paths: string[]): string {
    return normalize(paths.reduce((all, path) => [...all, ...segments(path)], []).join(sep))
}

export function normalize(path: string): string {
    return sep + segments(path).join(sep)       // TODO '..' etc
}

export function parse(path: string) {
    const base = basename(path)
    const dot = base.lastIndexOf('.')
    const name = dot ? base.substring(0, dot) : base
    const ext = dot ? base.substring(dot) : ''
    const parts = segments(path)
    return {
        dir: dirname(path),
        root: (path.length && path[0] == sep) ? sep : '',
        top: parts.length ? parts[0] : '',
        base,
        name,
        ext
    }
}

export function segments(path: string): string[] {
    return path.split(sep).filter(part => part.length)
}


export const descendantOf = curry((ancestor: string, path: string) => normalize(path).startsWith(normalize(ancestor)))

export const childOf = curry((parent: string, path: string) => path == parent || dirname(path) == parent)
