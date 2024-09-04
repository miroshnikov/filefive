import { Path, LocalFileSystemID, URI } from '../../../src/types'
import { createURI, parseURI } from '../utils/URI'
import { MenuItem } from '../ui/components'
import { CommandID } from '../commands'
import { command$ } from '../observables/command'


export default function (path: Path, selected: Path[], copyTo: URI, isRoot: boolean): MenuItem[] {
    const { id } = parseURI(copyTo)
    return [
        ...(isRoot ? [] : [           
            {
                id: 'copy-files',
                label: id == LocalFileSystemID ? 'Copy' : 'Upload',
                click: () => {
                    window.f5.copy(
                        (selected.includes(path) ? selected : [path]).map(path => createURI(LocalFileSystemID, path)),
                        copyTo
                    )
                },
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
            id: 'copy-path',
            label: 'Copy Path',
            click: () => command$.next({ id: CommandID.CopyPath, uri: createURI(LocalFileSystemID, path) })
        },
        {
            id: 'copy-relative-path',
            label: 'Copy Relative Path',
            click: () => command$.next({ id: CommandID.CopyRelativePath, uri: createURI(LocalFileSystemID, path) })
        },
        {
            id: 'copy-name',
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
                id: 'delete',
                label: 'Delete',
                click: () => {
                    window.f5.remove(
                        ((selected.length && selected.includes(path)) ? selected : [path]).map(path => createURI(LocalFileSystemID, path)),
                        false
                    )
                }
            }
        ])
    ]
}
