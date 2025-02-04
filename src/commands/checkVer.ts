import current from '../../package.json'

export default async function(): Promise<[string, string]|null> {
    // https://github.com/npm/registry
    const server = await fetch('https://registry.npmjs.com/filefive/latest').then(resp => resp.json())

    if (typeof server === 'object' && 'version' in server) {
        return server.version == current.version ? null : [current.version, server.version]
    }
    
    return null
}