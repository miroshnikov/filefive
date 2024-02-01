import { Command, URI } from '../types'
import { isLocal, parseURI } from '../utils/URI'
import { QueueEventType, QueueType } from '../types'
import Queue, { queues } from '../Queue'
import unqid from '../utils/uniqid'
import App from '../App'


type CopyArgs = { src: URI[], dest?: URI }

export const copy: Command<CopyArgs, string|null> = async ({ src, dest }: CopyArgs) => {
    if (isLocal(src[0]) && dest && isLocal(dest)) {
        console.log('TODO local copy')
        return
    }
    
    const queueType = isLocal(dest) ? QueueType.Download : QueueType.Upload
    const connId = parseURI(queueType == QueueType.Download ? src[0] : dest)['id']
    const id = unqid()
    const queue = new Queue(
        queueType,
        connId,
        src, 
        dest, 
        App.remoteWatcher,
        state => App.onQueueUpdate(id, { type: QueueEventType.Update, state }),
        (from, to) => App.onQueueUpdate(id, { type: QueueEventType.Ask, from, to }),
        error => App.onError(error),
        () => { 
            queues.delete(id)
            App.onQueueUpdate(id, { type: QueueEventType.Complete })
        }
    )
    queues.set(id, queue)
    App.onQueueUpdate(id, { type: QueueEventType.Create, queueType, connection: connId })
    return id
}
