import { Path, URI, LocalFileSystemID } from '../../../src/types'
import { MenuItem } from '../ui'
import { basename } from '../utils/path'


export default function (path: Path, selected: URI[]): MenuItem[] {
    return [
        {
            id: 'new-dir',
            label: 'New Folder...',
            click: () => {},
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
            click: () => {
                window.f5.remove(selected.length ? selected : [LocalFileSystemID + path as URI] )
            }
        }
    ]
}
