import { URI, QueueEventType, QueueType, FailureType } from '../types'
import { rm } from 'node:fs/promises'
import { stat } from '../Local'
import { isLocal, parseURI } from '../utils/URI'
import unqid from '../utils/uniqid'
import Queue, { queues } from '../Queue'
const trash = import("trash")
import App from '../App'


export default async function (files: URI[], force: boolean, connPath: string, immediately = false) {
    if (!files.length) {
        return
    }

    if (!force) {
        App.onError({ type: FailureType.ConfirmDeletion, files } )
        return
    }

    if (isLocal(files[0])) {
        const paths = files.map(p => parseURI(p)['path'])
        if (immediately) {
            paths.forEach(path => rm(path, { recursive: true, force: true }))
        } else {
            (await trash).default(paths)
        }
        paths.forEach(path => {
            if (path.startsWith(connPath) && !stat(path).dir) {
                // TODO delete from passwords
            }
        })
    } else {
        const connId = parseURI(files[0])['id']
        const id = unqid()
        const queue = new Queue(
            QueueType.Remove,
            connId,
            files, 
            '' as URI,
            App.remoteWatcher,
            state => App.onQueueUpdate(id, { type: QueueEventType.Update, state }),
            () => {},
            error => App.onError(error),
            () => { 
                queues.delete(id)
                App.onQueueUpdate(id, { type: QueueEventType.Complete })
            }
        )
        queues.set(id, queue)
        App.onQueueUpdate(id, { type: QueueEventType.Create, queueType: QueueType.Remove, connection: connId })
    }
}