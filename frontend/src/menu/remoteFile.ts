import { Path, ConnectionID, LocalFileSystemID } from '../../../src/types'
import { createURI } from '../utils/URI'
import { basename } from '../utils/path'
import { MenuItem } from '../ui/components'
import { command$ } from '../observables/command'
import { CommandID } from '../commands'


export default function (id: ConnectionID, path: Path, selected: Path[], copyTo: Path): MenuItem[] {
    return [
        {
            id: 'download',
            label: 'Download',
            click: () => {
                window.f5.copy(
                    (selected.includes(path) ? selected : [path]).map(path => createURI(id, path)),
                    createURI(LocalFileSystemID, copyTo)
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
            id: 'rename',
            label: 'Rename...',
            click: () => {}
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
        },
        {
            id: 'refresh',
            label: 'Refresh',
            click: () => command$.next(CommandID.Refresh)
        }
    ]
}

