import { URI, Path, LocalFileSystemID } from './types'
import { parseURI, createURI } from './utils/URI'
import { commands } from './commands'
import { tmpdir } from 'node:os'
import { join, basename, dirname } from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises';
import FileWatcher from './FileWatcher'
import Connection from './Connection'
import App from './App'


const files = new Map<Path, { file: URI, deletion: ReturnType<typeof setTimeout>, sending: boolean, changed: boolean }>()

const watcher = new FileWatcher(path => send(path))

export async function open(file: URI, onLoad: (file: Path) => void) {
    const { path } = parseURI(file)

    try {
        const tmpDir = await mkdtemp(join(tmpdir(), 'f5-'))
        const tmpName = join(tmpDir, basename(path))

        return commands.copy(
            [file],
            createURI(LocalFileSystemID, tmpDir),
            false,
            null,
            null,
            null,
            () => {
                files.set(
                    tmpName,
                    { file, deletion: resetDeletion(tmpName, null), sending: false, changed: false }
                )
                watcher.watch(tmpName)
                onLoad(tmpName)
            }
        )
    } catch (err) {
        console.error(err);
    }
}

async function send(file: Path) {
    const watched = files.get(file)
    if (!watched) {
        return
    }
    if (watched.sending) {
        watched.changed = true
        return
    }
    watched.sending = true
    watched.deletion = resetDeletion(file, watched.deletion)

    const { id, path } = parseURI(watched.file)
    const [conn, close] = await Connection.transmit(id)
    await conn.put(file, path)
    close()
    App.remoteWatcher.refresh(createURI(id, dirname(path)))
    watched.sending = false
    if (watched.changed) {
        watched.changed = false
        send(file)
    }
}

function resetDeletion(file: Path, current: ReturnType<typeof setTimeout>) {
    clearTimeout(current)
    return setTimeout(() => {
        files.delete(file)
        rm(dirname(file), { force: true, recursive: true })
    }, 1000*60*60)
}