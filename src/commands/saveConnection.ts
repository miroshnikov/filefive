import { read } from '../Local'
import { ConnectionSettings, ExplorerSettings, ExplorerConfig } from '../types'
import { whereEq } from 'ramda'
import { writeFile } from 'node:fs/promises'


export function getLayout(settings: ExplorerSettings): ExplorerConfig {
    return {
        columns: settings.columns.filter(whereEq({visible: true})).map(({name, width}) => ({name, width})),
        sort: settings.sort
    }
}


export default async function (path: string, content: string) {
    const settings = JSON.parse(content) as ConnectionSettings
    const config = {
        layout: {
            local: getLayout(settings.layout.local),
            remote: getLayout(settings.layout.remote)
        },
        path: settings.path
    }
    await writeFile(path, JSON.stringify({ ...JSON.parse(await read(path)), ...config }))
}