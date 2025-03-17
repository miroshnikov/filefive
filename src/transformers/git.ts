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

        const { stdout: statuses } = await run('git', ['status', '-z', '.'], { cwd: path })

        const [inRoot, inSubfolders] = partition( 
            ([p]) => dirname(p) == path,
            statuses
                .replace(/\0$/, '')
                .split('\0')
                .map(s => [join(repoRoot, s.substring(3)), s.substring(0, 2)])
        )

        const topDir = new RegExp('^([^/]+)');

        [...inRoot
            .map(([path, s]) => [path, getStatusCode(s)])
            .filter(([, status]) => status),
            ...[ ...new Set(
                inSubfolders.map(([p]) => topDir.exec(p.substring(path.length+1))?.[1]).filter(s => s)
            )].map(dir => [join(path, dir), 'git_c'])
        ].forEach(([path, status]) => {
            const f = files.find(f => f.path == path)
            f && (f[FileAttrsAttr][status] = statusNames[status] ?? '')
        })


        const { stdout: ignored } = await run('git', ['ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '-z'], { cwd: path })
        if (ignored == './\0') {
            files.forEach(f => f[FileAttrsAttr]['git_i'] = 'Ignored')
        } else {
            ignored
                .replace(/\0$/, '')
                .split('\0')
                .map(s => join(repoRoot, s.replace(/\/$/, '')))
                .forEach(path => {
                    const f = files.find(f => f.path == path)
                    f && (f[FileAttrsAttr]['git_i'] = 'Ignored')
                })
        }

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