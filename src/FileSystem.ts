import { Files, Path } from './types'

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


export abstract class FileSystem {
    abstract open(): Promise<any>
    abstract close(): void
    abstract pwd(): Promise<Path>
    abstract ls(dir: Path): Promise<Files>
    abstract get(remote: Path, local: Path): Promise<void>
    abstract put(local: Path, remote: Path): Promise<void>
    abstract rm(path: Path, recursive: boolean): Promise<void>
    abstract mkdir(path: Path): Promise<void>
    abstract write(path: Path, data: string): Promise<void>
}
