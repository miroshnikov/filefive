// import { URI } from '../types'
// import { BrowserWindow, Menu, clipboard, dialog } from 'electron'
// import { basename } from 'node:path'
// import { parseURI } from '../utils/URI'
// import Connection from '../Connection'


// export function remoteFileContextMenu(window: BrowserWindow, target: URI, selected: URI[]) {

//     const path = parseURI(target)['path']

//     // const askToDelete = (paths: URI[], immediately = false) => 
//     //     dialog.showMessageBox(window, {
//     //         type: 'question',
//     //         message: paths.length > 1 ? 
//     //             `Are you sure you want to delete the following ${paths.length} files/directories and their contents?` : 
//     //             `Are you sure you want to delete '${basename(paths[0].substring(7))}'?`,
//     //         buttons: ['Delete', 'Cancel'],
//     //         defaultId: 0,
//     //         cancelId: 1,
//     //         detail: immediately ? 
//     //             `${paths.length > 1 ? 'These files' : 'This file'} will be deleted immediately. You can’t undo this action.` : 
//     //             `You can restore ${paths.length > 1 ? 'these files' : 'this file'} from the Trash.`
//     //     })

//     Menu.buildFromTemplate([
//         {
//             label: 'Copy Path',
//             click: () => { clipboard.writeText(path) }
//         },
//         {
//             label: 'Copy Name',
//             click: () => { clipboard.writeText(basename(path)) }
//         },
//         {
//             label: 'Copy Name without Extension',
//             click: () => {
//                 const name = basename(path)
//                 clipboard.writeText(name.substring(0, name.lastIndexOf('.')))         
//             }
//         },
//         {
//             label: 'Copy URI',
//             click: () => { clipboard.writeText(target) }
//         },
//         { type: 'separator' },

//         // Open... 
//         {
//             label: 'Download & Open',
//             click: () => { 
//                 // shell.openPath(path) 
//             }
//         },
//         {
//             label: 'Download & Reveal in Finder',
//             click: () => { 
//                 // shell.showItemInFolder(path) 
//             }
//         },
//         { type: 'separator' },
//         {
//             label: 'Delete',
//             click: () => { 
//                 // askToDelete(selected.length ? selected : [target]).then(({response}) => {
//                 //     if (response == 0) {
//                 //         selected.length ? 
//                 //             selected.forEach(path => shell.trashItem(path)):
//                 //             shell.trashItem(path)
//                 //     }
//                 // })
//             }
//         },
//         // {
//         //     label: 'Edit in VSCode',
//         //     click: () => { 
//         //         shell.openExternal(`vscode://file${path}`)
//         //         // open files through protocol links
//         //         // vscode://file/<path>
//         //         // vscode-insiders://file/<path>
//         //     }
//         // }
//         { type: 'separator' },
//         {
//             label: 'Refresh',
//             click: () => { 
//                 // const conn = Connection.get(parseURI(target)['id'])
//                 // refresh(parseURI(target)['id'])
//             }
//         },

//     ]).popup({window}) 
// }

