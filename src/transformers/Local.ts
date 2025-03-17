import { Files, FileAttrsAttr, Path } from '../types'
import gitStatus from './git'


export default class {
    public async transform(path: Path, files: Files): Promise<Files> {
        files = files.map(f => ({...f, [FileAttrsAttr]: {} as Record<string,string>}))
        for (const f of [gitStatus]) {
            files = await f(path, files)
        }
        return files
    }
}