import { Path, ConnectionID, LocalFileSystemID, FailureType } from '../../../src/types'
import { createURI } from '../../../src/utils/URI'
import { MenuItem } from '../ui/components'
import { command$ } from '../observables/command'
import { CommandID } from '../commands'
import { error$ } from '../observables/error'
import { createQueue } from '../observables/queue'


export default function (id: ConnectionID, path: Path, selected: Path[], copyTo: Path): MenuItem[] {
    return [
        {
            id: CommandID.Download,
            label: 'Download',
            click: () => command$.next({ id: CommandID.Download, uri: createURI(id, path) })
        },
        {
            id: CommandID.MirrorRemote,
            label: 'Mirror Download',
            click: () => command$.next({ id: CommandID.MirrorRemote, uri: createURI(id, path) }),
            separator: true
        },

        {
            id: CommandID.TriggerCopy,
            label: 'Copy',
            click: () => command$.next({ id: CommandID.TriggerCopy }),
        },
        {
            id: CommandID.CopyURI,
            label: 'Copy URL',
            click: () => command$.next({ id: CommandID.CopyURI, uri: createURI(id, path) })
        },
        {
            id: CommandID.CopyPath,
            label: 'Copy Path',
            click: () => command$.next({ id: CommandID.CopyPath, uri: createURI(id, path) })
        },
        {
            id: CommandID.CopyRelativePath,
            label: 'Copy Relative Path',
            click: () => command$.next({ id: CommandID.CopyRelativePath, uri: createURI(id, path) })
        },
        {
            id: CommandID.CopyName,
            label: 'Copy Name',
            click: () => command$.next({ id: CommandID.CopyName, uri: createURI(id, path) })
        },
        {
            id: CommandID.CopyNameNoExt,
            label: 'Copy Name w/o Extension',
            click: () => command$.next({ id: CommandID.CopyNameNoExt, uri: createURI(id, path) }),
            separator: true
        },

        {
            id: 'vscode',
            label: "Open in VS Code",
            click: () => window.f5.open(createURI(id, path), 'code').then(createQueue)
        },
        {
            id: 'open',
            label: 'Open in Default App',
            click: () => { window.f5.open(createURI(id, path)).then(createQueue) },
            separator: true
        },

        {
            id: 'rename',
            label: 'Rename...',
            click: () => command$.next({ id: CommandID.Rename, uri: createURI(id, path) })
        },
        {
            id: CommandID.Duplicate,
            label: 'Duplicate',
            click: () => command$.next({ id: CommandID.Duplicate, uri: createURI(id, path) }),
            separator: true
        },
        {
            id: 'clear',
            label: 'Clear Contents',
            click: () => command$.next({ id: CommandID.ClearContents, uri: createURI(id, path) })
        },
        {
            id: 'delete',
            label: 'Delete',
            click: () => {
                error$.next({ 
                    type: FailureType.ConfirmDeletion, 
                    files: ((selected.length && selected.includes(path)) ? selected : [path]).map(path => createURI(id, path))
                })
            },
            separator: true
        },
        {
            id: 'refresh',
            label: 'Refresh',
            click: () => command$.next({id: CommandID.Refresh})
        }
    ]
}

