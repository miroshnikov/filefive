import { URI } from '../types'
import { parseURI, isLocal, createURI } from '../utils/URI'
import { open } from '../RemoteFiles'

export default async function (file: URI, app: string, opener: (file: string) => void): Promise<string> {
    if (isLocal(file)) {
        const {id, path} = parseURI(file)
        if (app == 'code') {
            // open files through protocol links
            // vscode://file/<path>
            // vscode-insiders://file/<path>
            opener(`vscode://file/${path}`)
        } else {
            opener(path)
        }
        return ''
    } else {
        return open(file, path => opener(app == 'code' ? `vscode://file/${path}` : path))
    }
}