import { homedir } from 'node:os'
import { join } from 'node:path'
import { AppSettings, ExplorerSettings, SortOrder } from '../types'
import { read } from '../Local'
import { ATTRIBUTES as LOCAL_ATTRIBUTES } from '../fs/Local'


export default async function (path: string): Promise<AppSettings> {
    const config: Partial<Pick<AppSettings, 'layout'>> = JSON.parse( await read(path) )

    const defaultSettings: ExplorerSettings = {
        columns: LOCAL_ATTRIBUTES.map(a => ({...a, visible: true, width: 300})),
        sort: ['name', SortOrder.Asc]
    }

    return {
        paths: {
            home: homedir(),
            connections: join(homedir(), '.f5', 'connections')
        },
        layout: config.layout ?? { local: defaultSettings, remote: defaultSettings }
    }
}