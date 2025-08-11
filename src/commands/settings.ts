import { homedir } from 'node:os'
import { join } from 'node:path'
import { AppConfig, AppSettings } from '../types'
import { read } from '../Local'
import { ATTRIBUTES as LOCAL_ATTRIBUTES } from '../fs/Local'
import { explorerSettings } from './connect'
import keybindings from '../keybindings.json'
import languages from '../icon-themes/languages.json'


function loadFileIcons(theme: string) {
    return import(`../icon-themes/${theme}.json`,{ with: { type: "json" }})
}

export default async function (path: string): Promise<AppSettings> {
    let config: AppConfig = null
    try {
        config = JSON.parse( await read(path) )
    } catch (e) {}

    const settings: AppSettings = {
        home: homedir(),
        settings: join(homedir(), '.f5', 'settings.json'),
        connections: join(homedir(), '.f5', 'connections'),
        keybindings,
        mode: config?.mode ?? 'system',
        theme: config?.theme ?? 'black',
        fileTheme: config?.fileTheme ?? '',
        timeFmt: config?.timeFmt ?? 'yyyy-MM-dd HH:mm',
        sizeFmt: config?.sizeFmt ?? '0.0 b',
        local: explorerSettings(LOCAL_ATTRIBUTES, config?.local), 
        remote: explorerSettings(LOCAL_ATTRIBUTES, config?.remote),
        path: config?.path ?? { local: homedir(), remote: homedir() },
        sync: config?.sync ?? null
    }
    if (settings.fileTheme) {
        settings.fileIcons = { languages, ...(await loadFileIcons(settings.fileTheme)).default }
    }
    return settings
}