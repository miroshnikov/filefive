import { URI } from '../types'
import { isLocal, parseURI } from '../utils/URI'
import { ConnectionID, QueueEventType, QueueType, FilterSettings, FailureType } from '../types'
import { FileItem } from '../FileSystem'
import { Queue, queues } from '../queues/Queue'
import Session from '../Session'
import CopyQueue from '../queues/Copy'
import DownloadQueue from '../queues/Download'
import UploadQueue from '../queues/Upload'
import unqid from '../utils/uniqid'
import App from '../App'
import { pipe, prop } from 'ramda'


export default function (src: URI[], dest: URI, move: boolean, filter?: FilterSettings, sid?: string, onComplete = () => {}) {
    if (!src.length) {
        return
    }

    const { id: fromId } = parseURI(src[0])
    const { id: toId, path: toPath } = parseURI(dest)
    const from = src.map(pipe(parseURI, prop('path')))

    const id = unqid()
    let queueType: QueueType
    let connection: ConnectionID
    let queue: Queue

    const onConflict = (from: FileItem, to: FileItem) => {
        if (sid) {
            const action = Session.get(sid)?.action
            if (action) {
                queues.get(id)?.resolve(action, true)
                return
            }
        }
        App.onQueueUpdate(id, { type: QueueEventType.Ask, queueType, from, to, sid })
    }

    const onFinish = () => {
        queues.delete(id)
        App.onQueueUpdate(id, { type: QueueEventType.Complete })
        onComplete()
    }

    if (fromId == toId) {
        queueType = move ? QueueType.Move : QueueType.Copy
        connection = fromId
        queue = new CopyQueue(
            connection,
            from,
            toPath,
            filter,
            state => App.onQueueUpdate(id, { type: QueueEventType.Update, state }),
            onConflict.bind(queue),
            error => {
                App.onError({
                    type: FailureType.RemoteError,
                    id: fromId,
                    message: error.message ?? String(error)
                })
            },
            onFinish,
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
                filter,
                state => App.onQueueUpdate(id, { type: QueueEventType.Update, state }),
                onConflict.bind(queue),
                error => App.onError(error),
                onFinish
            ) : 
            new UploadQueue(
                connection,
                from,
                toPath,
                filter,
                state => App.onQueueUpdate(id, { type: QueueEventType.Update, state }),
                onConflict.bind(queue),
                error => App.onError(error),
                onFinish,
                App.remoteWatcher
            )
    }
   
    queues.set(id, queue)
    queue.create()
    setTimeout(
        () => App.onQueueUpdate(id, { type: QueueEventType.Create, queueType, connection }),
        100
    )
    return id
}
