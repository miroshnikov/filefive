import { homedir } from 'node:os'
import { normalize, basename, dirname, join } from 'node:path'
import { readdirSync, statSync, watch as fsWatch, WatchEventType } from 'node:fs';
import { mkdir, unlink, rename, cp, open, rm, readFile, writeFile } from 'node:fs/promises'
import { URI, FileInfo } from './types'



export type LocalFileInfo = FileInfo & { inode: number }
export type LocalFiles = LocalFileInfo[]

export function pwd(): string {
    return homedir()
}

export function stat(path: string): LocalFileInfo|null {
    path = normalize(path)
    try {
        const stat = statSync(path)
        return {
            URI: `file://${path}` as URI,
            path,
            name: basename(path),
            dir: stat.isDirectory(), 
            size: stat.size,        // in bytes
            modified: stat.mtime,
            inode: stat.ino
        }
    } catch (e) {
        return null
    }
}

export function list(dir: string): LocalFiles {
    return readdirSync(dir).map(name => stat(join(dir, name))).filter(f => f)
}

export async function move(from: string, to: string, force = false): Promise<true|LocalFileInfo> {
    await mkdir(dirname(to), { recursive: true })
    const existing = stat(to)
    if (existing) {
        if (force) {
            await unlink(to)
        } else {
            return existing
        }
    }
    await rename(from, to)
    return true
}

export async function copy(from: string, to: string, force = false): Promise<true|LocalFileInfo> {
    await mkdir(dirname(to), { recursive: true })
    const existing = stat(to)
    if (existing && !force) {
        return existing
    }
    await cp(from, to, { recursive: true })
    return true
}

export async function del(path: string): Promise<void> {
    return rm(path, { recursive: true, force: true })
}


export async function touch(path: string, data?: string): Promise<void> {
    if (!stat(path)) {
        await mkdir(dirname(path), { recursive: true })
        data !== undefined ? await writeFile(path, data) : await (await open(path, 'a')).close()
    }
}

export function watch(path: string, listener: (event: WatchEventType, file: string) => void): () => void {
    const watcher = fsWatch(path, listener)
    return () => watcher.close()
}

export async function read(path: string): Promise<string> {
    return await readFile(path, { encoding: 'utf8' })
}