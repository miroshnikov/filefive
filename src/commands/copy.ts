import { URI } from '../types'
import { isLocal, parseURI } from '../utils/URI'
import { QueueEventType, QueueType } from '../types'
import { queues } from '../queues/Queue'
import DownloadQueue from '../queues/Download'
import UploadQueue from '../queues/Upload'
import unqid from '../utils/uniqid'
import App from '../App'
import { pipe, prop } from 'ramda'


export default function (src: URI[], dest: URI) {
    if (!src.length) {
        return
    }

    if (isLocal(src[0]) && isLocal(dest)) {
        console.log('TODO local copy (as upload?)')
        return
    }
    
    const queueType = isLocal(dest) ? QueueType.Download : QueueType.Upload
    const connId = parseURI(queueType == QueueType.Download ? src[0] : dest)['id']
    const from = src.map(pipe(parseURI, prop('path')))
    const to = parseURI(dest).path 
    const id = unqid()

    const queue = queueType == QueueType.Download ?
        new DownloadQueue(
            connId,
            from,
            to,
            state => App.onQueueUpdate(id, { type: QueueEventType.Update, state }),
            (from, to) => App.onQueueUpdate(id, { type: QueueEventType.Ask, queueType: QueueType.Download, from, to }),
            error => App.onError(error),
            () => { 
                queues.delete(id)
                App.onQueueUpdate(id, { type: QueueEventType.Complete })
            }
        ) : 
        new UploadQueue(
            connId,
            from,
            to,
            state => App.onQueueUpdate(id, { type: QueueEventType.Update, state }),
            (from, to) => App.onQueueUpdate(id, { type: QueueEventType.Ask, queueType: QueueType.Upload, from, to }),
            error => App.onError(error),
            () => { 
                queues.delete(id)
                App.onQueueUpdate(id, { type: QueueEventType.Complete })
            },
            App.remoteWatcher
        )

    queues.set(id, queue)
    App.onQueueUpdate(id, { type: QueueEventType.Create, queueType, connection: connId })
    queue.create()
    return id
}
