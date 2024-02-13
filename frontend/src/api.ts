import { URI, AppConfig, ConnectionID, ConnectionConfig, Files, QueueEvent } from '../../src/types'

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
    config: () => invoke<AppConfig>('config'),

    onError: listener => subscribe<any>('error', (error) => listener(error)),

    connect: file => invoke<{ id: ConnectionID, config: ConnectionConfig }>('connect', { file }),
    disconnect: id => invoke<void>('disconnect', { id }),

    watch: dir => invoke<void>('watch', { dir }),
    unwatch: dir => invoke<void>('unwatch', { dir }),
    refresh: dir => invoke<void>('refresh', { dir }),
    onDirChange: listener => subscribe<{uri: URI, files: Files}>('fs', ({uri, files}) => listener(uri, files)),

    copy: (src, dest) => invoke<string>('copy', { src, dest }),
    remove: files => invoke<void>('remove', { files }),
    open: file => invoke<void>('open', { file }),

    resolve: (id, action) => invoke<void>('resolve', { id, action }),
    stop: id => invoke<void>('stop', { id }),
    onQueueUpdate: listener => subscribe<{id: string, event: QueueEvent}>('queue', ({id, event}) => listener(id, event))
}