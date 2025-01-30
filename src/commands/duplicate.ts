import { URI, Path } from '../types'
import { dirname } from 'node:path'
import { parseURI } from '../utils/URI'
import { QueueEventType, QueueType, FilterSettings, FailureType } from '../types'
import { queues } from '../queues/Queue'
import DuplicateQueue from '../queues/Duplicate'
import unqid from '../utils/uniqid'
import App from '../App'


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
        const queue = new DuplicateQueue(
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
            App.remoteWatcher
        )

        queues.set(id, queue)
        App.onQueueUpdate(id, { type: QueueEventType.Create, queueType: QueueType.Copy, connection })
        queue.create()
    }
}