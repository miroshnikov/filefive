import { writeFile } from 'node:fs/promises'
import { read } from '../Local'
import { AppConfig, AppSettings } from '../types'
import { getSettings } from './saveConnection'


export default async function (path: string, content: string) {
    const settings = JSON.parse(content) as AppSettings
    const config: AppConfig = {
        mode: settings.mode,
        theme: settings.theme,
        timeFmt: settings.timeFmt,
        sizeFmt: settings.sizeFmt,
        local: getSettings(settings.local),
        remote: getSettings(settings.remote),
        path: settings.path
    }
    await writeFile(path, JSON.stringify({ ...JSON.parse(await read(path)), ...config }))
}
