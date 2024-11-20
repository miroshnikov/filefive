import { Path, ConnectionID, LocalFileSystemID } from '../../../src/types'
import { createURI } from '../../../src/utils/URI'
import { MenuItem } from '../ui/components'
import { CommandID } from '../commands'
import { command$ } from '../observables/command'


export default function (id: ConnectionID, path: Path, selected: Path[], copyTo: Path, isRoot: boolean): MenuItem[] {
    return [
        {
            id: CommandID.Transfer,
            label: 'Download',
            click: () => command$.next({ id: CommandID.Transfer, uri: createURI(id, path) }),
            separator: true
        },

        {
            id: 'new-dir',
            label: 'New Folder...',
            click: () => command$.next({id: CommandID.NewDir})
        },
        {
            id: 'new-file',
            label: 'New File...',
            click: () => command$.next({id: CommandID.NewFile}),
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
        ...(isRoot ? [] : [ 
            {
                id: CommandID.CopyRelativePath,
                label: 'Copy Relative Path',
                click: () => command$.next({ id: CommandID.CopyRelativePath, uri: createURI(LocalFileSystemID, path) })
            }
        ]),
        {
            id: CommandID.CopyName,
            label: 'Copy Name',
            click: () => command$.next({ id: CommandID.CopyName, uri: createURI(id, path) }),
            separator: true
        },

        ...(isRoot ? [] : [ 
            {
                id: 'rename',
                label: 'Rename...',
                click: () => command$.next({ id: CommandID.Rename, uri: createURI(id, path) })
            },
            {
                id: CommandID.Duplicate,
                label: 'Duplicate',
                click: () => command$.next({ id: CommandID.Duplicate, uri: createURI(id, path) })
            },
            {
                id: 'delete',
                label: 'Delete',
                click: () => {
                    window.f5.remove(
                        ((selected.length && selected.includes(path)) ? selected : [path]).map(path => createURI(id, path)),
                        false
                    )
                },
                separator: true
            }
        ]),
        
        {
            id: 'refresh',
            label: 'Refresh',
            click: () => command$.next({id: CommandID.Refresh})
        }
    ]
}
