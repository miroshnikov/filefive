import { mkdir, writeFile, rename, cp } from 'node:fs/promises'
import { dirname } from 'node:path'
import { FileItem, FileSystem, FileSystemURI, FileAttributes, FileAttributeType } from '../FileSystem'
import { pwd, list, copy, del } from '../Local'
import { Path, LocalFileSystemID } from '../types'


export const ATTRIBUTES: FileAttributes = [
    {
        name: "name",     
        type: FileAttributeType.String, 
        title: "Name"
    },
    {
        name: "size",     
        type: FileAttributeType.Number, 
        title: "Size"
    },
    {
        name: "modified", 
        type: FileAttributeType.Date, 
        title: "Last Modified"
    }
]


export default class Local extends FileSystem {
    open() {
        return Promise.resolve(LocalFileSystemID as FileSystemURI)
    }

    opened() { return true }

    close(): void {}

    pwd(): Promise<string> {
        return Promise.resolve(pwd())
    }

    ls(dir: string): Promise<FileItem[]> {
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

    async rename(from: Path, to: Path): Promise<void> {
        await rename(from, to)
    }

    async mv(from: Path, to: Path): Promise<void> {
        try {
            await del(to)
        } catch (e) {}
        await mkdir(dirname(to), { recursive: true })
        await rename(from, to)
    }

    async cp(from: Path, to: Path, recursive: boolean): Promise<void> {
        await cp(from, to, { recursive, force: true })
    }

    async write(path: Path, data: string): Promise<void> {
        return writeFile(path, data)
    }
}
