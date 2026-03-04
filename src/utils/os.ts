export function winToUnix(path: string): string {
    return '/' + path.replace(/\\/g, '/')
}

export function unixToWin(path: string): string {
    path = path.replace(/^\//, '').replace(/\//g, '\\')
    if (!path) {
        path = '\\'
    } else if (path.match(/^[a-zA-Z]:$/)) {
        path += '\\'
    }
    return path
}