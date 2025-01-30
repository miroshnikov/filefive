import { Path, LocalFileSystemID, URI, FailureType } from '../../../src/types'
import { createURI, parseURI } from '../../../src/utils/URI'
import { basename } from '../utils/path'
import { MenuItem } from '../ui/components'
import { CommandID } from '../commands'
import { command$ } from '../observables/command'
import { error$ } from '../observables/error'


export default function (path: Path, selected: Path[], copyTo: URI, isRoot: boolean): MenuItem[] {
    const { id, path: to } = parseURI(copyTo)
    return [
        ...(isRoot ? [] : [
            {
                id: CommandID.Transfer,
                label: id == LocalFileSystemID ? `Copy to ${basename(to)}` : 'Upload',
                click: () => command$.next({ id: CommandID.Transfer, uri: createURI(LocalFileSystemID, path) }),
                separator: true
            },
        ]),

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
            click: () => command$.next({ id: CommandID.TriggerCopy })
        },
        {
            id: CommandID.CopyPath,
            label: 'Copy Path',
            click: () => command$.next({ id: CommandID.CopyPath, uri: createURI(LocalFileSystemID, path) })
        },
        {
            id: CommandID.CopyRelativePath,
            label: 'Copy Relative Path',
            click: () => command$.next({ id: CommandID.CopyRelativePath, uri: createURI(LocalFileSystemID, path) })
        },
        {
            id: CommandID.CopyName,
            label: 'Copy Name',
            click: () => command$.next({ id: CommandID.CopyName, uri: createURI(LocalFileSystemID, path) }),
            separator: true
        },

        {
            id: 'vscode',
            label: "Open in VS Code",
            click: () => window.f5.open(`vscode://file/${path}`)
        },
        {
            id: 'open',
            label: 'Show in Finder',
            click: () => window.f5.open(path),
            separator: !isRoot
        },
        
        ...(isRoot ? [] : [ 
            {
                id: 'rename',
                label: 'Rename...',
                click: () => command$.next({ id: CommandID.Rename, uri: createURI(LocalFileSystemID, path) })
            },
            {
                id: CommandID.Duplicate,
                label: 'Duplicate',
                click: () => command$.next({ id: CommandID.Duplicate, uri: createURI(LocalFileSystemID, path) })
            },
            {
                id: 'delete',
                label: 'Delete',
                click: () => {
                    error$.next({ 
                        type: FailureType.ConfirmDeletion, 
                        files: ((selected.length && selected.includes(path)) ? selected : [path]).map(path => createURI(LocalFileSystemID, path))
                    })
                }
            }
        ])
    ]
}
