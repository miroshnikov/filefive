import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { Files, FileAttrsAttr, Path } from '../types'

export default async function(path: Path, files: Files): Promise<Files> {
    const run = promisify(execFile)

    try {
        let { stdout: repoRoot } = await run('git', ['rev-parse', '--show-toplevel'], { cwd: path })
        repoRoot = repoRoot.trim()

        const { stdout } = await run('git', ['status', '-z', '.'], { cwd: path })
        const statuses = 
            stdout
                .split('\0')
                .filter(s => s)
                .map(s => [join(repoRoot, s.substring(3)), s.substring(0, 2)])
                .map(([path, s]) => [path, getStatusCode(s)])
                .filter(([, status]) => status)

        statuses.forEach(([path, status]) => {
            const f = files.find(f => f.path == path)
            f && (f[FileAttrsAttr][status] = statusNames[status] ?? '')
        })

    } catch(e) {}

    return files
}

function getStatusCode(s: string) {
    if (s.includes('?')) {
        return 'U'
    } else if (s.includes('M')) {
        return 'M'
    } else if (s.includes('A')) {
        return 'A'
    }
    return ''     
}

const statusNames: Record<string, string> = {
    U: 'Untracked',
    M: 'Modified',
    A: 'Index Added'
}