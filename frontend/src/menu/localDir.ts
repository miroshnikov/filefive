import { Path, URI, LocalFileSystemID } from '../../../src/types'
import { MenuItem } from '../ui'
import { basename } from '../utils/path'
import { CommandID } from '../commands'
import { command$ } from '../observables/command'


export default function (path: Path, selected: Path[], onDelete: () => void): MenuItem[] {
    return [
        {
            id: 'new-dir',
            label: 'New Folder...',
            click: () => command$.next(CommandID.NewDir),
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
