import { Path, LocalFileSystemID, URI, FailureType } from '../../../src/types'
import { createURI, parseURI } from '../../../src/utils/URI'
import { basename } from '../utils/path'
import { MenuItem } from '../ui/components'
import { CommandID } from '../commands'
import { command$ } from '../observables/command'
import { error$ } from '../observables/error'


export default function (path: Path, selected: Path[], copyTo: URI): MenuItem[] {
    const { id, path: to } = parseURI(copyTo)
    return [
        {
            id: CommandID.Upload,
            label: id == LocalFileSystemID ? `Copy to ${basename(to)}` : 'Upload',
            click: () => command$.next({ id: CommandID.Upload, uri: createURI(LocalFileSystemID, path) })
        },
        {
            id: CommandID.MirrorLocal,
            label: id == LocalFileSystemID ? `Mirror to ${basename(to)}` : 'Mirror Upload',
            click: () => command$.next({ id: CommandID.MirrorLocal, uri: createURI(LocalFileSystemID, path) }),
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
            click: () => window.f5.open(createURI(LocalFileSystemID, path), 'code')
        },
        {
            id: 'open',
            label: 'Open in Default App',
            click: () => { window.f5.open(createURI(LocalFileSystemID, path)) },
            separator: true
        },

        {
            id: CommandID.Rename,
            label: 'Rename...',
            click: () => command$.next({ id: CommandID.Rename, uri: createURI(LocalFileSystemID, path) })
        },
        {
            id: CommandID.Duplicate,
            label: 'Duplicate',
            click: () => command$.next({ id: CommandID.Duplicate, uri: createURI(LocalFileSystemID, path) }),
            separator: true
        },
        {
            id: 'clear',
            label: 'Clear Contents',
            click: () => command$.next({ id: CommandID.ClearContents, uri: createURI(LocalFileSystemID, path) })
        },
        {
            id: CommandID.Delete,
            label: 'Delete',
            click: () => {
                error$.next({
                    type: FailureType.ConfirmDeletion, 
                    files: ((selected.length && selected.includes(path)) ? selected : [path]).map(path => createURI(LocalFileSystemID, path))
                })
            }
        }
    ]
}
