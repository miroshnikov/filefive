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
import options from './options'


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
            return [conn[0], () => this.release(id, conn[1])]
        }

        return new Promise((resolve) => {
            const onRelease = (poolId: string) => {
                const { fs } = this.pools.get(id).get(poolId)
                resolve([fs, () => this.release(id, poolId)])
            }
            id in this.pending ? this.pending[id].push(onRelease) : (this.pending[id] = [onRelease])
        })
    }

    private static async hold(id: ConnectionID): Promise<[FileSystem, string]|null> {
        !this.pools.has(id) && this.pools.set(id, new Map())
        const pool = this.pools.get(id)
        const conn = this.getIdle(id)
        if (conn) {
            return conn
        }
        if (pool.size < this.getLimit(id)) {
            return new Promise((resolve) => {

                const connect = async () => {
                    const conn = this.getIdle(id)
                    if (conn) {
                        resolve(conn)
                        return
                    }
                    const poolId = unqid()
                    try {
                        const onClose = () => this.pools.get(id)?.delete(poolId)
                        const fs = await this.createFromId(id, onClose)
                        await fs.open()
                        this.pools.get(id).set(poolId, { fs, idle: false })
                        resolve([fs, poolId])
                    } catch (e) {
                        const conn = this.getIdle(id)
                        if (conn) {
                            resolve(conn)
                            return
                        }
                    }
                    resolve(null)
                }

                this.queue.push( connect )
                if (this.queue.length == 1) {
                    this.connectNext()
                }
            })
        }
        return null
    }

    private static getIdle(id: ConnectionID): [FileSystem, string]|null {
        const conn = Array.from(this.pools.get(id)?.entries() || []).find(([,{ idle }]) => idle !== false)
        if (conn) {
            conn[1].idle !== false && clearTimeout(conn[1].idle)
            conn[1].idle = false
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
        const conn = this.pools.get(id)?.get(poolId)
        if (conn) {
            if (this.pending[id]?.length) {
                this.pending[id].shift()(poolId)
            } else {
                conn.idle = setTimeout(() => {
                    conn.fs.close()
                    this.pools.get(id)?.delete(poolId)
                }, 2000)
            }
        }
    }

    private static getLimit(id: ConnectionID) {
        return this.limits.has(id) ? this.limits.get(id) : 1024     // for vsftpd max_per_ip in /etc/vsftpd.conf
    }

    private static async create(id: ConnectionID, scheme: string, user: string, host: string, port: number, onClose = () => {}): Promise<FileSystem> {
        if (options.log) {
            return new LogFS(
                id, 
                await this.createFS(scheme, user, host, port, await Password.get(id), onClose)
            )
        }
        return this.createFS(scheme, user, host, port, await Password.get(id), onClose)
    }

    private static async createFS(scheme: string, user: string, host: string, port: number, password: string, onClose: () => void) {
        switch (scheme) {
            case 'sftp': {
                return new SFtp(
                    host, 
                    user, 
                    password,
                    port, 
                    error => logger.error('SFTP error:', error),
                    onClose
                )
            }
            case 'ftp': {
                return new Ftp(
                    host, 
                    user, 
                    password,
                    port, 
                    error => logger.error('FTP error:', error),
                    onClose
                )
            }
            default: 
                throw new Error(`Unsupported scheme ${scheme}`)
        }
    }

    private static async createFromId(id: ConnectionID, onClose = () => {}): Promise<FileSystem> {
        const { scheme, user, host, port } = parseURI(id as URI)
        return this.create(id, scheme, user, host, port, onClose)
    }

    private static shared = new ReferenceCountMap<ConnectionID, FileSystem>
    // private static pools: Record<string, Record<string, {fs: FileSystem, idle: false|ReturnType<typeof setTimeout>}>> = {}
    private static pools: Map<string, Map<string, {fs: FileSystem, idle: false|ReturnType<typeof setTimeout>}>> = new Map()
    private static queue: Function[] = []
    private static pending: Record<string, ((id: string) => void)[]> = {}
    private static limits = new Map<ConnectionID, number>()
}
