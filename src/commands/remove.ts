import { URI, QueueEventType, QueueType, FailureType } from '../types'
import { rm } from 'node:fs/promises'
import { isLocal, parseURI } from '../utils/URI'
import unqid from '../utils/uniqid'
import Queue, { queues } from '../Queue'
const trash = import("trash")
import App from '../App'


/*
const confirmLocalDelete = (names: string[], window: BrowserWindow) => 
    dialog.showMessageBox(window, {
        type: 'question',
        message: names.length > 1 ? 
            `Are you sure you want to delete the following ${names.length} files/directories and their contents?` : 
            `Are you sure you want to delete '${names[0]}'?`,
        buttons: ['Delete', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
        checkboxLabel: 'Delete immediately. You can’t undo this action.',
        detail: `You can restore ${names.length > 1 ? 'these files' : 'this file'} from the Trash.`
    })


const confirmRemoteDelete = (names: string[], window: BrowserWindow) =>
    dialog.showMessageBox(window, {
        type: 'question',
        message: names.length > 1 ? 
            `Are you sure you want to delete the following ${names.length} files/directories and their contents?` : 
            `Are you sure you want to delete '${names[0]}'?`,
        buttons: ['Delete', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
        detail: `You can’t undo this action.`
    })


type RemoveArgs = { paths: URI[], window: BrowserWindow }
*/

export default async function (files: URI[], force = false, immediately = false) {
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