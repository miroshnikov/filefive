import { FileSystem, FileSystemURI } from '../FileSystem'
import { pwd, list, copy, del } from '../Local'
import { Path, LocalFileSystemID, Files } from '../types'
import { mkdir, writeFile } from 'node:fs/promises'

export default class Local extends FileSystem {
    open() {
        return Promise.resolve(LocalFileSystemID as FileSystemURI)
    }

    close(): void {}

    pwd(): Promise<string> {
        return Promise.resolve(pwd())
    }

    ls(dir: string): Promise<Files> {
        return Promise.resolve(list(dir))
    }

    async get(fromRemote: string, toLocal: string): Promise<void> {
        await copy(fromRemote, toLocal, true)
    }

    async put(fromLocal: string, toRemote: string): Promise<void> {
        await copy(fromLocal, toRemote)
    }

    async rm(path: Path, recursive: boolean): Promise<void> {
        return del(path)
    }

    async mkdir(path: Path): Promise<void> {
        await mkdir(path, { recursive: true })
    }

    async write(path: Path, data: string): Promise<void> {
        await writeFile(path, data)
    }
}
