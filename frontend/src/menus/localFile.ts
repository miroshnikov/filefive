import { Path, URI } from '../../../src/types'
import { MenuItem } from '../ui'
import { basename } from '../utils/path'


export default function (path: Path, selected: Path[], onDelete: () => void): MenuItem[] {
    return [
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
            label: "Edit in VSCode",
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
            click: onDelete
        }
    ]
}
