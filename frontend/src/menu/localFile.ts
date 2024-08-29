import { Path, LocalFileSystemID, URI } from '../../../src/types'
import { createURI, parseURI } from '../utils/URI'
import { basename } from '../utils/path'
import { MenuItem } from '../ui/components'


export default function (path: Path, selected: Path[], copyTo: URI): MenuItem[] {
    const { id } = parseURI(copyTo)
    return [
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
        {
            id: 'copy-path',
            label: 'Copy Path',
            click: () => navigator.clipboard.writeText(path) 
        },
        {
            id: 'copy-name',
            label: 'Copy Name',
            click: () => navigator.clipboard.writeText(basename(path))
        },
        {
            id: 'copy-name-no-ext',
            label: 'Copy Name w/o Extension',
            click: () => { 
                const name = basename(path)
                const dot = name.lastIndexOf('.')
                navigator.clipboard.writeText(name.substring(0, dot > 0 ? dot : name.length)) 
            },
            separator: true
        },
        
        {
            id: 'vscode',
            label: "Open in VS Code",
            click: () => window.f5.open(`vscode://file${path}`)
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
    ]
}
