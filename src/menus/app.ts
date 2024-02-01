// import { App, Menu } from 'electron'


// export function appMenu(app: App) {
//     Menu.setApplicationMenu(
//         Menu.buildFromTemplate([
//             {
//                 label: app.name,
//                 submenu: [
//                     { role: 'about' },
//                     {
//                         label: 'Restart',
//                         accelerator: 'Alt+CommandOrControl+R', 
//                         click: () => {
//                             app.relaunch();
//                             app.exit();
//                         }
//                     },
//                     { type: 'separator' },
//                     { role: 'quit' }
//                 ]
//             },
//             {
//                 role: 'editMenu'
//             },
//             {
//                 role: 'viewMenu'
//             },
//             {
//                 role: 'windowMenu'
//             },
//             {
//                 role: 'help'
//             }
//         ])
//     )
// }