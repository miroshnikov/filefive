import { URI } from '../types'
import { isLocal, parseURI } from '../utils/URI'
import { ConnectionID, QueueEventType, QueueType } from '../types'
import { Queue, queues } from '../queues/Queue'
import CopyQueue from '../queues/Copy'
import DownloadQueue from '../queues/Download'
import UploadQueue from '../queues/Upload'
import unqid from '../utils/uniqid'
import App from '../App'
import { pipe, prop } from 'ramda'


export default function (src: URI[], dest: URI, move: boolean) {
    if (!src.length) {
        return
    }

    const {id: fromId } = parseURI(src[0])
    const {id: toId, path: toPath } = parseURI(dest)
    const from = src.map(pipe(parseURI, prop('path')))

    const id = unqid()
    let queueType: QueueType
    let connection: ConnectionID
    let queue: Queue

    if (fromId == toId) {
        queueType = move ? QueueType.Move : QueueType.Copy
        connection = fromId
        queue = new CopyQueue(
            connection,
            from,
            toPath,
            state => App.onQueueUpdate(id, { type: QueueEventType.Update, state }),
            (from, to) => App.onQueueUpdate(id, { type: QueueEventType.Ask, queueType, from, to }),
            error => App.onError(error),
            () => { 
                queues.delete(id)
                App.onQueueUpdate(id, { type: QueueEventType.Complete })
            },
            App.remoteWatcher,
            move
        )
    } else {
        queueType = isLocal(dest) ? QueueType.Download : QueueType.Upload
        connection = queueType == QueueType.Download ? fromId : toId
        queue = queueType == QueueType.Download ?
            new DownloadQueue(
                connection,
                from,
                toPath,
                state => App.onQueueUpdate(id, { type: QueueEventType.Update, state }),
                (from, to) => App.onQueueUpdate(id, { type: QueueEventType.Ask, queueType, from, to }),
                error => App.onError(error),
                () => { 
                    queues.delete(id)
                    App.onQueueUpdate(id, { type: QueueEventType.Complete })
                }
            ) : 
            new UploadQueue(
                connection,
                from,
                toPath,
                state => App.onQueueUpdate(id, { type: QueueEventType.Update, state }),
                (from, to) => App.onQueueUpdate(id, { type: QueueEventType.Ask, queueType, from, to }),
                error => App.onError(error),
                () => { 
                    queues.delete(id)
                    App.onQueueUpdate(id, { type: QueueEventType.Complete })
                },
                App.remoteWatcher
            )
    }
   
    queues.set(id, queue)
    App.onQueueUpdate(id, { type: QueueEventType.Create, queueType, connection })
    queue.create()
    return id
}
