import { URI } from '../types'
import { parseURI, isLocal } from '../utils/URI'
import { open } from '../RemoteFiles'
import { osify } from '../Local'

export default async function (file: URI, app: string, opener: (file: string) => void): Promise<string> {
    if (isLocal(file)) {
        const {id, path} = parseURI(file)
        if (app == 'code') {
            // open files through protocol links
            // vscode://file/<path>
            // vscode-insiders://file/<path>
            opener(`vscode://file/${osify(path)}`)
        } else {
            opener(osify(path))
        }
        return ''
    } else {
        return open(file, path => opener(app == 'code' ? `vscode://file/${path}` : path))
    }
}