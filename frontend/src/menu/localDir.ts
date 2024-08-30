import { Path, LocalFileSystemID, URI } from '../../../src/types'
import { createURI, parseURI } from '../utils/URI'
import { basename } from '../utils/path'
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
            click: () => command$.next(CommandID.NewDir)
        },
        {
            id: 'new-file',
            label: 'New File...',
            click: () => command$.next(CommandID.NewFile),
            separator: true
        },

        {
            id: 'copy-path',
            label: 'Copy Path',
            click: () => navigator.clipboard.writeText(path) 
        },
        {
            id: 'copy-name',
            label: 'Copy Name',
            click: () => navigator.clipboard.writeText(basename(path)),
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
                click: () => {}
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
