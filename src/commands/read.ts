import { URI } from '../types'
import { read } from '../Local'
import { parseURI, isLocal } from '../utils/URI'


export default async function (file: URI): Promise<string> {
    const {id, path} = parseURI(file)
    
    if (isLocal(file)) {
        return read(path)
    }
    // TODO
    return ''
}