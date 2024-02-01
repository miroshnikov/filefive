import { Files, Path } from './types'

export type FileSystemURI = `${string}://${string}@${string}:${number}`


export abstract class FileSystem {
    abstract open(): Promise<FileSystemURI>
    abstract close(): void
    abstract pwd(): Promise<Path>
    abstract ls(dir: Path): Promise<Files>
    abstract get(remote: Path, local: Path): Promise<void>
    abstract put(local: Path, remote: Path): Promise<void>
    abstract rm(path: Path, recursive: boolean): Promise<void>
    abstract mkdir(path: Path): Promise<void>
}
