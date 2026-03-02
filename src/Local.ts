import { homedir, platform } from 'node:os'
import { normalize, basename, dirname, join, isAbsolute } from 'node:path/posix'
import osPath from 'node:path'
import { readdirSync, statSync, lstatSync, readlinkSync, watch as fsWatch, WatchEventType } from 'node:fs';
import { mkdir, unlink, rename, cp, open, rm, readFile, writeFile, watch as asyncWatch } from 'node:fs/promises'
import { winToUnix, unixToWin } from './utils/path'
import { FileItem } from './FileSystem'



export type LocalFileItem = FileItem & { inode: number }
export type LocalFiles = LocalFileItem[]

export function isWin() {
    return platform() === 'win32'
}

export function osify(path: string): string {
    return isWin() ? unixToWin(path) : path
}

export function unosify(path: string): string {
    return isWin() ? winToUnix(path) : path
}


export function pwd(): string {
    return unosify(homedir())
}

export function stat(path: string): LocalFileItem|null {
    path = normalize(path)
    const actualPath = osify(path)
    console.log('stat:', actualPath)
    try {
        let stat = lstatSync(actualPath)
        let target: string
        if (stat.isSymbolicLink()) {
            target = readlinkSync(actualPath)
            if (!isAbsolute(target)) {
                target = osPath.normalize(osPath.join(osPath.dirname(actualPath), target))
            }
            stat = statSync(target)
        }
        return {
            path,
            name: basename(path),
            dir: stat.isDirectory(), 
            size: stat.size,        // in bytes
            modified: stat.mtime,
            inode: stat.ino,
            ...(target ? { target } : {})
        }
    } catch (e) {
        return null
    }
}

export function list(dir: string): LocalFiles {
    console.log('list:', dir, osify(dir))
    return readdirSync(osify(dir)).map(name => stat(join(dir, name))).filter(f => f)
}

export async function mkDirRecursive(path: string) {
    return mkdir(osify(path), { recursive: true })
}

export async function move(from: string, to: string, force = false): Promise<true|LocalFileItem> {
    await mkDirRecursive(dirname(to))
    const existing = stat(to)
    if (existing) {
        if (force) {
            await unlink(osify(to))
        } else {
            return existing
        }
    }
    await rename(osify(from), osify(to))
    return true
}

export async function copy(from: string, to: string, force = false): Promise<true|LocalFileItem> {
    await mkDirRecursive(dirname(to))
    const existing = stat(to)
    if (existing && !force) {
        return existing
    }
    await cp(osify(from), osify(to), { recursive: true })
    return true
}

export async function del(path: string): Promise<void> {
    return rm(osify(path), { recursive: true, force: true })
}

export async function touch(path: string, data?: string): Promise<void> {
    if (!stat(path)) {
        await mkDirRecursive(dirname(path))
        data !== undefined ? await writeFile(osify(path), data) : await (await open(osify(path), 'a')).close()
    }
}

export function watch(path: string, listener: (event: WatchEventType, file: string) => void): () => void {
    const watcher = fsWatch(osify(path), listener)
    return () => watcher.close()
}

export function watchChanges(path: string, ac: AbortController) {
    return asyncWatch(osify(path), { signal: ac.signal })
}


export async function read(path: string): Promise<string> {
    return await readFile(osify(path), { encoding: 'utf8' })
}
