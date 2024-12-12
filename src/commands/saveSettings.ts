import { writeFile } from 'node:fs/promises'
import { AppConfig, AppSettings, DeepPartial } from '../types'
import { getSettings } from './saveConnection'
import { mergeDeepRight } from 'ramda'
import { commands } from '.'


export default async function (path: string, changes: DeepPartial<AppSettings>) {

    const settings = mergeDeepRight(
        await commands.getSettings(path), 
        changes
    ) as AppSettings

    const config: AppConfig = {
        mode: settings.mode,
        theme: settings.theme,
        timeFmt: settings.timeFmt,
        sizeFmt: settings.sizeFmt,
        local: getSettings(settings.local),
        remote: getSettings(settings.remote),
        path: settings.path,
        sync: settings.sync
    }
    await writeFile(path, JSON.stringify(config))
}
