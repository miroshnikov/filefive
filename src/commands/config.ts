import { homedir } from 'node:os'
import { join } from 'node:path'
import { AppConfig, AppSettings } from '../types'
import { read } from '../Local'
import { ATTRIBUTES as LOCAL_ATTRIBUTES } from '../fs/Local'
import { explorerSettings } from './connect'
import keybindings from '../keybindings.json'


export default async function (path: string): Promise<AppSettings> {
    const config: AppConfig = JSON.parse( await read(path) )

    return {
        home: homedir(),
        settings: join(homedir(), '.f5', 'settings.json'),
        connections: join(homedir(), '.f5', 'connections'),
        keybindings,
        timeFmt: config.timeFmt ?? 'yyyy-MM-dd HH:mm',
        sizeFmt: config.sizeFmt ?? '0.0 b',
        layout: {
            local: explorerSettings(LOCAL_ATTRIBUTES, config.layout?.local), 
            remote: explorerSettings(LOCAL_ATTRIBUTES, config.layout?.remote)
        },
        path: config.path ?? { local: homedir(), remote: homedir() }
    }
}