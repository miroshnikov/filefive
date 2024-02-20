import { URI } from '../types'
import Connection from '../Connection'
import { parseURI, isLocal } from '../utils/URI'
import { join } from 'node:path'


export default function (name: string, parent: URI) {
    const {id, path} = parseURI(parent)
    Connection.get(id).mkdir(join(path, name))
    return !isLocal(parent)
}
