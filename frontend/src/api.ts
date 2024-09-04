import { URI, AppSettings, ConnectionID, ConnectionSettings, Files, QueueEvent, Path } from '../../src/types'
import { LocalFileInfo } from '../../src/Local'


async function invoke<T>(method: string, data: {} = {}): Promise<T> {
    const resp = await fetch(`/api/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    const txt = await resp.text()
    return txt ? JSON.parse(txt) : null
}

const channels = new Map<string, ((event: {}) => void)[]>
const ws = new WebSocket(`ws://${location.host}/events`);  
ws.onmessage = ({data}) => {
    const event = JSON.parse(data)
    if (event && typeof event == 'object' && 'channel' in event) {
        (channels.get(event['channel']) ?? []).forEach(callback => callback(event))
    }
}

function subscribe<Event extends {}>(channel: string, callback: (event: Event) => void) {
    const callbacks = channels.get(channel)
    channels.set(channel, callbacks ? [...callbacks, callback] : [callback])
}

window.f5 = {
    config: () => invoke<AppSettings>('config'),

    onError: listener => subscribe<any>('error', (error) => listener(error)),

    connect: file => invoke<{ id: ConnectionID, settings: ConnectionSettings }>('connect', { file }),
    login: (id: ConnectionID, password: string, remember: boolean) => invoke<void>('login', { id, password, remember }),
    disconnect: id => invoke<void>('disconnect', { id }),

    watch: dir => invoke<void>('watch', { dir }),
    unwatch: dir => invoke<void>('unwatch', { dir }),
    refresh: dir => invoke<void>('refresh', { dir }),

    onDirChange: listener => subscribe<{uri: URI, files: Files}>('dir', ({uri, files}) => listener(uri, files)),
    onFileChange: listener => subscribe<{path: Path, stat: LocalFileInfo|null}>('file', ({path, stat}) => listener(path, stat)),

    copy: (src, dest) => invoke<string>('copy', { src, dest }),
    remove: (files, force) => invoke<void>('remove', { files, force }),
    open: file => invoke<void>('open', { file }),
    mkdir: (name, parent) => invoke<void>('mkdir', { name, parent }),
    write: (path, content) => invoke<void>('write', { path, content }),
    rename: (path, name) => invoke<void>('rename', { path, name }),

    resolve: (id, action) => invoke<void>('resolve', { id, action }),
    stop: id => invoke<void>('stop', { id }),
    onQueueUpdate: listener => subscribe<{id: string, event: QueueEvent}>('queue', ({id, event}) => listener(id, event))
}