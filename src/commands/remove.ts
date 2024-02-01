import { Command, URI, QueueEventType, QueueType } from '../types'
import { basename } from 'node:path'
import { rm } from 'node:fs/promises'
import { isLocal, parseURI } from '../utils/URI'
import unqid from '../utils/uniqid'
import Queue, { queues } from '../Queue'
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

export const remove: Command<RemoveArgs, boolean> = async ({ paths, window }: RemoveArgs) => {
    if (!paths.length) {
        return true
    }

    const local = isLocal(paths[0])
    const names = paths.map(p => basename(parseURI(p)['path']))
    const {response, checkboxChecked} = await (local ? confirmLocalDelete(names, window) : confirmRemoteDelete(names, window))
    if (response) {
        return false
    }

    if (local) {
        paths
            .map(p => parseURI(p)['path'])
            .forEach(path => checkboxChecked ? rm(path, { recursive: true, force: true }) : shell.trashItem(path))
    } else {
        const connId = parseURI(paths[0])['id']
        const id = unqid()
        const queue = new Queue(
            QueueType.Remove,
            connId,
            paths, 
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

    return true
}
*/