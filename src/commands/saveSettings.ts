import { writeFile } from 'node:fs/promises'
import { read } from '../Local'
import { AppSettings } from '../types'
import { getLayout } from './saveConnection'


export default async function (path: string, content: string) {
    const settings = JSON.parse(content) as AppSettings
    const config = {
        mode: settings.mode,
        theme: settings.theme,
        timeFmt: settings.timeFmt,
        sizeFmt: settings.sizeFmt,
        layout: {
            local: getLayout(settings.layout.local),
            remote: getLayout(settings.layout.remote)
        },
        path: settings.path,
        history: settings.history
    }
    await writeFile(path, JSON.stringify({ ...JSON.parse(await read(path)), ...config }))
}
