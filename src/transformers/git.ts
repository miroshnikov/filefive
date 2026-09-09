import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { join, dirname } from 'node:path/posix'
import { Files, FileAttrsAttr, Path } from '../types'
import { osify, unosify } from '../Local'
import { partition } from 'ramda'

const run = promisify(execFile)


export default async function(path: Path, files: Files): Promise<Files> {
    try {
        const repoRoot = await getRoot(path)
       
        const [inRoot, inSubfolders] = partition( 
            ([p]) => dirname(p) == path,
            await getStatuses(path, repoRoot)
        )

        if (inSubfolders.length == 1 && inSubfolders[0][0] == path && inSubfolders[0][1].includes('?')) {
            files.forEach(f => {
                const status = f.dir ? GitStatus.Contains : GitStatus.Untracked
                f[FileAttrsAttr][status] = statusNames[status]
            })
        } else {
            const topDir = new RegExp('^([^/]+)');
            [...inRoot
                .map(([path, s]) => [path, getStatusCode(s)])
                .filter(([, status]) => status),
                ...[ ...new Set(
                    inSubfolders.map(([p]) => topDir.exec(p.substring(path.length+1))?.[1]).filter(s => s)
                )].map(dir => [join(path, dir!), GitStatus.Contains])
            ].forEach(([path, status]) => {
                const f = files.find(f => f.path == path)
                if (f) {
                    if (f.dir) {
                        status = GitStatus.Contains
                    }
                    f[FileAttrsAttr][status!] = status ? (statusNames[status] ?? '') : ''
                }
            })
        }

        const ignored = await getIgnoredList(path)
        if (ignored === null) {
            files.forEach(f => f[FileAttrsAttr][GitStatus.Ignored] = statusNames[GitStatus.Ignored])
        } else {
            ignored.forEach(path => {
                const f = files.find(f => f.path == path)
                f && (f[FileAttrsAttr][GitStatus.Ignored] = statusNames[GitStatus.Ignored])
            })
        }

    } catch { 
        // either path is not in git repo or no git installed
    }

    return files
}

export async function getRoot(path: Path): Promise<string>
{
    const { stdout: repoRoot } = await run(
        'git', 
        ['rev-parse', '--show-toplevel'], 
        { cwd: osify(path) }
    )
    return unosify(repoRoot.trim())
}

export async function getStatuses(path: Path, repoRoot: Path): Promise<string[][]>
{
    const { stdout: statuses } = await run(
        'git', 
        ['status', '-z', '.'], 
        { cwd: osify(path) }
    )

    return statuses.length 
        ? unosify(statuses)
            .replace(/\0$/, '')
            .split('\0')
            .map(s => [join(repoRoot, s.substring(3)), s.substring(0, 2)])
            .map(([path, status]) => [path.replace(/\/$/, ''), status])
        : []
}


export async function getIgnoredList(path: Path): Promise<string[]|null>
{
    try {
        const { stdout: ignored } = await run(
            'git', 
            ['ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '-z'], 
            { cwd: osify(path) }
        )

        if (ignored == './\0') {
            return null
        }

        return unosify(ignored)
            .replace(/\0$/, '')
            .split('\0')
            .map(s => join(path, s.replace(/\/$/, '')))

    } catch (e) {
        return null // deep in ignored subfolders
    }
}




enum GitStatus {
    Untracked = 'git_u',
    Modified = 'git_m',
    Added = 'git_a',
    Contains = 'git_c',
    Ignored = 'git_i'
}

const statusNames: Record<string, string> = {
    [GitStatus.Untracked]: 'Untracked',
    [GitStatus.Modified]: 'Modified',
    [GitStatus.Added]: 'Index Added',
    [GitStatus.Contains]: 'Has uncommited items',
    [GitStatus.Ignored]: 'Ignored'
}

function getStatusCode(s: string): GitStatus|null {
    if (s.includes('?')) {
        return GitStatus.Untracked
    } else if (s.includes('M')) {
        return GitStatus.Modified
    } else if (s.includes('A')) {
        return GitStatus.Added
    }
    return null
}
