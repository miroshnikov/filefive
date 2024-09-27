import ReferenceCountMap from './utils/ReferenceCountMap'
import { FileSystem, FileAttributes } from './FileSystem'
import { URI, ConnectionID, LocalFileSystemID, Files, Path } from './types'
import { createURI, parseURI, connectionID } from './utils/URI'
import Password from './Password'
import unqid from './utils/uniqid'
import logger, { LogFS } from './log'
import Local from './fs/Local'
import SFtp, { ATTRIBUTES as SFTP_ATTRIBUTES } from './fs/SFtp'
import Ftp, { ATTRIBUTES as FTP_ATTRIBUTES } from './fs/Ftp'


export default class {

    static initialize() {
        this.shared.set(LocalFileSystemID, new Local)
    }

    static async open(scheme: string, user: string, host: string, port: number): Promise<FileAttributes> {
        const id = connectionID(scheme, user, host, port)
        const attrs = (scheme == 'sftp') ? SFTP_ATTRIBUTES : FTP_ATTRIBUTES
        if (this.shared.inc(id)) {
            return attrs
        }
        const conn = await this.create(id, scheme, user, host, port)
        await conn.open()
        this.shared.set(id, conn)
        return attrs
    }

    static get(id: ConnectionID) {
        return this.shared.get(id)
    }

    static close(id: ConnectionID) {
        this.shared.dec(id)?.close()
    }

    static async list(id: ConnectionID, path: Path): Promise<Files> {
        const files = await this.get(id)?.ls(path) || []
        return files.map(f => ({...f, URI: createURI(id, f.path)}))
    }

    static async transmit(id: ConnectionID): Promise<[FileSystem, () => void]> {
        if (id == LocalFileSystemID) {
            return [new Local, () => {}]
        }

        const conn = await this.hold(id)
        if (conn) {
            return Promise.resolve([conn[0], () => this.release(id, conn[1])])
        }
        return new Promise((resolve) => {
            const onRelease = (poolId: string) => {
                const { fs } = this.pools[id][poolId]
                resolve([fs, () => this.release(id, poolId)])
            }
            id in this.pending ? this.pending[id].push(onRelease) : (this.pending[id] = [onRelease])
        })
    }

    private static async hold(id: ConnectionID): Promise<[FileSystem, string]|undefined> {
        !(id in this.pools) && (this.pools[id] = {})
        const pool = Object.entries(this.pools[id])
        const conn = this.getIdle(id)
        if (conn) {
            return conn
        }
        if (pool.length < this.getLimit(id)) {
            return new Promise((resolve) => {
                const connect = async () => {
                    const conn = this.getIdle(id)
                    if (conn) {
                        resolve(conn)
                        return
                    }
                    const poolId = unqid()
                    try {
                        const fs = await this.createFromId(id)
                        await fs.open()
                        this.pools[id][poolId] = { fs, idle: false }
                        resolve([fs, poolId])
                    } catch (e) {}
                    resolve(undefined)
                }
                this.queue.push( connect )
                if (this.queue.length == 1) {
                    this.connectNext()
                }
            })
        }
        return undefined
    }

    private static getIdle(id: ConnectionID): [FileSystem, string]|null {
        const conn = Object.entries(this.pools[id]).find(([, { idle }]) => idle !== false)
        if (conn) {
            conn[1].idle !== false && clearTimeout(conn[1].idle)
            conn[1].idle = false
            console.log('Reuse connection')
            return [conn[1].fs, conn[0]]
        }
        return null
    }

    private static async connectNext() {
        this.queue
            .splice(0, Math.max(this.maxStartups - this.numOfStartups, 0))
            .map(connect => async () => { await connect(); this.numOfStartups--; this.connectNext() })
            .forEach(f => { this.numOfStartups++; f() })
    }

    private static numOfStartups = 0
    private static maxStartups = 7      // for SFTP see MaxStartups in /etc/ssh/sshd_config

    private static release(id: ConnectionID, poolId: string) {
        const conn = this.pools[id]?.[poolId]
        if (conn) {
            if (this.pending[id]?.length) {
                this.pending[id].shift()(poolId)
            } else {
                conn.idle = setTimeout(() => {
                    conn.fs.close()
                    delete this.pools[id][poolId]
                }, 2000)
            }
        }
    }

    private static getLimit(id: ConnectionID) {
        return this.limits.has(id) ? this.limits.get(id) : 1024
    }

    private static async create(id: ConnectionID, scheme: string, user: string, host: string, port: number): Promise<FileSystem> {
        return new LogFS(
            id, 
            await this.createFS(scheme, user, host, port, await Password.get(id))
        )
    }

    private static async createFS(scheme: string, user: string, host: string, port: number, password: string) {
        switch (scheme) {
            case 'sftp': {
                return new SFtp(
                    host, 
                    user, 
                    password,
                    port, 
                    error => logger.error('SFTP error:', error)
                )
            }
            case 'ftp': {
                return new Ftp(
                    host, 
                    user, 
                    password,
                    port, 
                    error => logger.error('FTP error:', error) 
                )
            }
            default: 
                throw new Error(`Unsupported scheme ${scheme}`)
        }
    }

    private static async createFromId(id: ConnectionID): Promise<FileSystem> {
        const { scheme, user, host, port } = parseURI(id as URI)
        return this.create(id, scheme, user, host, port)
    }

    private static shared = new ReferenceCountMap<ConnectionID, FileSystem>
    private static pools: Record<string, Record<string, {fs: FileSystem, idle: false|ReturnType<typeof setTimeout>}>> = {}
    private static queue: Function[] = []
    private static pending: Record<string, ((id: string) => void)[]> = {}
    private static limits = new Map<ConnectionID, number>()
}
