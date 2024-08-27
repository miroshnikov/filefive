import { writeFile } from 'node:fs/promises'
import { read } from '../Local'
import { AppSettings } from '../types'
import { getLayout } from './saveConnection'


export default async function (path: string, content: string) {
    const settings = JSON.parse(content) as AppSettings
    const config = {
        layout: {
            local: getLayout(settings.layout.local),
            remote: getLayout(settings.layout.remote)
        },
        paths: settings.paths
    }
    await writeFile(path, JSON.stringify({ ...JSON.parse(await read(path)), ...config }))
}
