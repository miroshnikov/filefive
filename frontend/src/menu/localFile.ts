import { Path, LocalFileSystemID, URI } from '../../../src/types'
import { createURI, parseURI } from '../../../src/utils/URI'
import { basename } from '../utils/path'
import { MenuItem } from '../ui/components'
import { CommandID } from '../commands'
import { command$ } from '../observables/command'


export default function (path: Path, selected: Path[], copyTo: URI): MenuItem[] {
    const { id, path: to } = parseURI(copyTo)
    return [
        {
            id: CommandID.Transfer,
            label: id == LocalFileSystemID ? `Copy to ${basename(to)}` : 'Upload',
            click: () => {
                window.f5.copy(
                    (selected.includes(path) ? selected : [path]).map(path => createURI(LocalFileSystemID, path)),
                    copyTo
                )
            },
            separator: true
        },

        {
            id: CommandID.TriggerCopy,
            label: 'Copy',
            click: () => command$.next({ id: CommandID.TriggerCopy }),
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
            click: () => command$.next({ id: CommandID.CopyName, uri: createURI(LocalFileSystemID, path) })
        },
        {
            id: CommandID.CopyNameNoExt,
            label: 'Copy Name w/o Extension',
            click: () => command$.next({ id: CommandID.CopyNameNoExt, uri: createURI(LocalFileSystemID, path) }),
            separator: true
        },
        
        {
            id: 'vscode',
            label: "Open in VS Code",
            click: () => window.f5.open(`vscode://file/${path}`)
            // open files through protocol links
            // vscode://file/<path>
            // vscode-insiders://file/<path>
        },
        {
            id: 'open',
            label: 'Open in Default App',
            click: () => window.f5.open(path),
            separator: true
        },

        {
            id: CommandID.Rename,
            label: 'Rename...',
            click: () => command$.next({ id: CommandID.Rename, uri: createURI(LocalFileSystemID, path) })
        },
        {
            id: CommandID.Delete,
            label: 'Delete',
            click: () => {
                window.f5.remove(
                    ((selected.length && selected.includes(path)) ? selected : [path]).map(path => createURI(LocalFileSystemID, path)),
                    false
                )
            },
            separator: true
        },
        {
            id: 'clear',
            label: 'Clear Content',
            click: () => {
                window.f5.write(
                    createURI(LocalFileSystemID, path),
                    ''
                )
            }
        }
    ]
}
