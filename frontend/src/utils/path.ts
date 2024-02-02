import { curry } from 'ramda'

export function basename(path: string): string {
    return segments(path).pop()
}

export function dirname(path: string): string {
    return '/' + segments(path).slice(0, -1).join('/')
}

export function depth(path: string): number {
    return segments(path).length
}

export function join(...paths: string[]): string {
    return normalize(paths.reduce((all, path) => [...all, ...segments(path)], []).join('/'))
}

export function normalize(path: string): string {
    return '/' + segments(path).join('/')       // TODO '..' etc
}

export function segments(path: string): string[] {
    return path.split('/').filter(part => part.length)
}


export const descendantOf = curry((ancestor: string, path: string) => normalize(path).startsWith(normalize(ancestor)))

export const childOf = curry((parent: string, path: string) => path == parent || dirname(path) == parent)
