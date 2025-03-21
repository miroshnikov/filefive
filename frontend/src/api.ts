import { 
    URI, 
    AppSettings, 
    ConnectionID, 
    ConnectionSettings, 
    ConnectionConfig, 
    Files, 
    QueueEvent, 
    Path, 
    Failure, 
    FailureType, 
    DeepPartial,
    FilterSettings
} from '../../src/types'
import { LocalFileItem } from '../../src/Local'
import { error$ } from './observables/error'


async function invoke<T>(method: string, data: {} = {}, signal?: AbortSignal): Promise<T> {
    return fetch(`/api/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        ...(signal ? { signal } : {})
    })
    .then(resp => {
        if (!resp.ok) {
            return resp.json().then(error => {
                const message = 'message' in error ? error.message : String(error)
                error$.next({ type: FailureType.APIError, message, method }) 
            })
        }
        return resp.json()
    })
    .catch(e => {
        process.env.NODE_ENV == 'development' && console.error(`/api/${method}`, e)
    })
}

const channels = new Map<string, ((event: {}) => void)[]>
const ws = new WebSocket(`ws://${location.host}/events`);  
ws.onmessage = ({data}) => {
    const event = JSON.parse(data)
    if (event && typeof event == 'object' && 'channel' in event) {
        (channels.get(event['channel']) ?? []).forEach(callback => callback(event))
    }
}

let reload: ReturnType<typeof setTimeout> 
ws.onclose = (e) => {
    clearTimeout(reload)
    console.debug('Disconnected. Reloading...')
    reload = setTimeout(() => window.location.reload(), 2000)
}

function subscribe<Event extends {}>(channel: string, callback: (event: Event) => void) {
    const callbacks = channels.get(channel)
    channels.set(channel, callbacks ? [...callbacks, callback] : [callback])
}

window.f5 = {
    settings: () => invoke<AppSettings>('getapp'),
    saveSettings: (settings: DeepPartial<AppSettings>) => invoke<void>('saveapp', { settings }),

    onError: listener => subscribe<any>('error', (error) => listener(error)),

    connect: (file, signal) => invoke<{ id: ConnectionID, sid: string, settings: ConnectionSettings }>('connect', { file }, signal),
    login: (id: ConnectionID, password: string|false, remember: boolean) => invoke<void>('login', { id, password, remember }),
    disconnect: (id: ConnectionID, sid: string) => invoke<void>('disconnect', { id, sid }),

    watch: dir => invoke<void>('watch', { dir }),
    unwatch: dir => invoke<void>('unwatch', { dir }),
    refresh: dir => invoke<void>('refresh', { dir }),

    onDirChange: listener => subscribe<{uri: URI, files: Files}>('dir', ({uri, files}) => listener(uri, files)),
    onFileChange: listener => subscribe<{path: Path, stat: LocalFileItem|null}>('file', ({path, stat}) => listener(path, stat)),

    copy: (src, dest, move = false, filter?: FilterSettings, root?: Path, sid?: string) => invoke<string>('copy', { src, dest, move, filter, root, sid }),
    duplicate: (src, filter: FilterSettings = null) => invoke<void>('duplicate', { src, filter }),
    remove: (files) => invoke<string|null>('remove', { files }),
    clear: (file) => invoke<void>('clear', { file }),
    open: (file, app) => invoke<string>('open', { file, app }),
    mkdir: (name, parent) => invoke<void>('mkdir', { name, parent }),
    read: (file) => invoke<string>('read', { file }),
    write: (path, content) => invoke<void>('write', { path, content }),
    rename: (path, name) => invoke<void>('rename', { path, name }),

    get: (path) => invoke<ConnectionConfig|null>('get', { path }),
    save: (path, settings) => invoke<void>('save', { path, settings }),

    resolve: (id, action, forAll, sid) => invoke<void>('resolve', { id, action, forAll, sid }),
    stop: id => invoke<void>('stop', { id }),
    onQueueUpdate: listener => subscribe<{id: string, event: QueueEvent}>('queue', ({id, event}) => listener(id, event))
}

window.f5.onError((error: Failure) => error$.next(error))