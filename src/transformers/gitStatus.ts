import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { join, dirname } from 'node:path'
import { Files, FileAttrsAttr, Path } from '../types'
import { partition } from 'ramda'

export default async function(path: Path, files: Files): Promise<Files> {
    const run = promisify(execFile)

    try {
        let { stdout: repoRoot } = await run('git', ['rev-parse', '--show-toplevel'], { cwd: path })
        repoRoot = repoRoot.trim()

        const { stdout } = await run('git', ['status', '-z', '.'], { cwd: path })

        const [inRoot, inSubfolders] = partition( 
            ([p]) => dirname(p) == path,
            stdout
                .split('\0')
                .filter(s => s)
                .map(s => [join(repoRoot, s.substring(3)), s.substring(0, 2)])
        )

        const topDir = new RegExp('^([^/]+)')

        const statuses = 
            [...inRoot
                .map(([path, s]) => [path, getStatusCode(s)])
                .filter(([, status]) => status),
             ...[ ...new Set(
                    inSubfolders.map(([p]) => topDir.exec(p.substring(path.length+1))?.[1]).filter(s => s)
                )].map(dir => [join(path, dir), 'git_c'])
            ]

        statuses.forEach(([path, status]) => {
            const f = files.find(f => f.path == path)
            f && (f[FileAttrsAttr][status] = statusNames[status] ?? '')
        })

    } catch(e) {}

    return files
}

function getStatusCode(s: string) {
    if (s.includes('?')) {
        return 'git_u'
    } else if (s.includes('M')) {
        return 'git_m'
    } else if (s.includes('A')) {
        return 'git_a'
    }
    return ''
}

const statusNames: Record<string, string> = {
    git_u: 'Untracked',
    git_m: 'Modified',
    git_a: 'Index Added',
    git_c: 'Has uncommited items'
}