import { Files } from './types'
import unqid from './utils/uniqid'

export type TransformFn = (files: Files) => Files


const transformations: {id: string, f: TransformFn}[] = []

export function add(f: TransformFn) {
    const id = unqid()
    transformations.push({ id, f})
    return id
}

export function remove(id: string) {
    const i = transformations.findIndex(t => t.id == id)
    if (i>=0) {
        transformations.splice(i, 1)
    }
}

export default function (files: Files): Files {
    return transformations.reduce((files, {f}) => f(files), files)
}