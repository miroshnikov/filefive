import { URI, Path, QueueActionType } from '../types'
import { dirname } from 'node:path'
import { isLocal, parseURI } from '../utils/URI'
import { ConnectionID, QueueEventType, QueueType, FilterSettings, FailureType } from '../types'
import { Queue, queues } from '../queues/Queue'
import CopyQueue from '../queues/Copy'
import DownloadQueue from '../queues/Download'
import UploadQueue from '../queues/Upload'
import unqid from '../utils/uniqid'
import App from '../App'
import { pipe, prop } from 'ramda'



export default function (src: URI[], filter?: FilterSettings) {
    if (!src.length) {
        return
    }

    const { id: connection } = parseURI(src[0])

    const targets = new Map<Path, Path[]>()
    src.forEach(uri => {
        const { path } = parseURI(uri)
        const parent = dirname(path)
        if (!targets.has(parent)) {
            targets.set(parent, [])
        }
        targets.get(parent).push(path)
    })

    for (const [to, from] of targets) {
        const id = unqid()
        const queue = new CopyQueue(
            connection,
            from,
            to,
            filter,
            state => App.onQueueUpdate(id, { type: QueueEventType.Update, state }),
            (from, to) => App.onQueueUpdate(id, { type: QueueEventType.Ask, queueType: QueueType.Copy, from, to }),
            error => {
                App.onError({
                    type: FailureType.RemoteError,
                    id: connection,
                    message: error.message ?? String(error)
                })
            },
            () => { 
                queues.delete(id)
                App.onQueueUpdate(id, { type: QueueEventType.Complete })
            },
            App.remoteWatcher,
            false
        )
        queue.resolve({ type: QueueActionType.Rename }, true)
        queues.set(id, queue)
        App.onQueueUpdate(id, { type: QueueEventType.Create, queueType: QueueType.Copy, connection })
        queue.create()
    }

    // const queue = new CopyQueue(
    //     connection,
    //     from,
    //     toPath,
    //     filter,
    //     state => App.onQueueUpdate(id, { type: QueueEventType.Update, state }),
    //     (from, to) => App.onQueueUpdate(id, { type: QueueEventType.Ask, queueType, from, to }),
    //     error => {
    //         App.onError({
    //             type: FailureType.RemoteError,
    //             id: fromId,
    //             message: error.message ?? String(error)
    //         })
    //     },
    //     () => { 
    //         queues.delete(id)
    //         App.onQueueUpdate(id, { type: QueueEventType.Complete })
    //         onComplete()
    //     },
    //     App.remoteWatcher,
    //     move
    // )
}