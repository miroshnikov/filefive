import { Path } from './types'

export type FileItem = {
    path: Path
    name: string
    dir: boolean
    size: number
    modified: Date
} & {[key: string|symbol]: any}

export type FileSystemURI = `${string}://${string}@${string}:${number}`

export enum FileAttributeType {
    String = 'string',
    Number = 'number',
    Date = 'date'
}

export interface FileAttribute {
    name: string
    type: FileAttributeType
    title: string
}

export type FileAttributes = Readonly<FileAttribute>[]


export abstract class FileSystem {
    abstract open(): Promise<any>
    abstract close(): void
    abstract opened(): boolean
    abstract pwd(): Promise<Path>
    abstract ls(dir: Path): Promise<FileItem[]>
    abstract get(remote: Path, local: Path): Promise<void>
    abstract put(local: Path, remote: Path): Promise<void>
    abstract rm(path: Path, recursive: boolean): Promise<void>
    abstract mkdir(path: Path): Promise<void>
    abstract mv(from: Path, to: Path): Promise<void>
    abstract cp(from: Path, to: Path, recursive: boolean): Promise<void>
    abstract write(path: Path, data: string): Promise<void>
}
