import { URI, Path, AppConfig, CommandID, ConnectionID, ConnectionConfig, Files, QueueEvent, QueueAction } from '../../src/types'

async function invoke<T>(method: string, data: {} = {}): Promise<T> {
    const resp = await fetch(`api/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    return await resp.json()
}

const ws = new WebSocket(`ws://${location.host}/events`);

function subscribe<Event extends {}>(channel: string, callback: (event: Event) => void) {
    ws.onmessage = ({data}) => {
        if ('channel' in data && data['channel'] == channel) {
            callback(data)
        }
    }
}

window.f5 = {    
    config: () => invoke<AppConfig>('config'),
    connect: file => invoke<{ id: ConnectionID, config: ConnectionConfig }>('connect', { file }),
    disconnect: id => invoke<void>('disconnect', { id }),

    watch: dir => invoke<void>('watch', { dir }),
    unwatch: dir => invoke<void>('unwatch', { dir }),
    refresh: dir => invoke<void>('refresh', { dir }),
    onDirChange: listener => subscribe<{uri: URI, files: Files}>('fs', ({uri, files}) => listener(uri, files)),

    resolve: (id, action) => invoke<void>('resolve', { id, action }),
    stop: id => invoke<void>('stop', { id }),
    onQueueUpdate:  listener => subscribe<{id: string, event: QueueEvent}>('queue', ({id, event}) => listener(id, event))
}