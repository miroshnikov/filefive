import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import ReferenceCountMap from './utils/ReferenceCountMap'
import { FileSystem, FileAttributes } from './FileSystem'
import { URI, ConnectionID, LocalFileSystemID, Files, Path } from './types'
import { createURI, parseURI, connectionID } from './utils/URI'
import unqid from './utils/uniqid'
import logger, { LogFS } from './log'
import Local from './fs/Local'
import SFtp, { ATTRIBUTES as SFTP_ATTRIBUTES } from './fs/SFtp'
import Ftp, { ATTRIBUTES as FTP_ATTRIBUTES } from './fs/Ftp'
import S3, { ATTRIBUTES as S3_ATTRIBUTES } from './fs/S3'
import options from './options'


export default class {

    static initialize() {
        this.shared.set(LocalFileSystemID, new Local)
    }

    static async open(
        protocol: string, 
        user: string, 
        host: string, 
        port: number, 
        password: string,
        privatekey: string
    ): Promise<FileAttributes> {
        const id = connectionID(protocol, user, host, port)

        const attrs = {
            sftp: SFTP_ATTRIBUTES,
            ftp: FTP_ATTRIBUTES,
            s3: S3_ATTRIBUTES
        }[protocol]

        if (this.shared.inc(id)) {
            return attrs
        }

        this.protocols.set(id, protocol)

        if (privatekey) {
            if (privatekey.startsWith('~')) {
                privatekey = join(homedir(), privatekey.substring(1))
            }
            this.credentials.set(id, ['key', readFileSync(privatekey)])
        } else {
            this.credentials.set(id, ['password', password])
        }
        
        const conn = await this.create(id)
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
                        const fs = await this.create(id, onClose)
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

    private static async create(id: ConnectionID, onClose = () => {}): Promise<FileSystem> {
        if (options.log) {
            return new LogFS(
                id, 
                await this.createFS(id, onClose)
            )
        }
        return this.createFS(id, onClose)
    }

    private static async createFS(id: ConnectionID, onClose: () => void) {
        const { scheme, user, host, port } = parseURI(id as URI)

        if (!this.credentials.has(id)) {
            onClose?.()
            return
        }

        const [authType, credential] = this.credentials.get(id)

        const protocol = this.protocols.get(id)
        if (!protocol) {
            throw new Error(`Protocol ${protocol} not found`)
        }

        switch (protocol) {
            case 'sftp': {
                return new SFtp(
                    host, 
                    user, 
                    authType == 'password' ? credential : '',
                    authType == 'key' ? credential : null,
                    port, 
                    error => logger.error('SFTP error:', error),
                    onClose
                )
            }
            case 'ftp': {
                return new Ftp(
                    host, 
                    user, 
                    credential as string,
                    port, 
                    error => logger.error('FTP error:', error),
                    onClose
                )
            }
            case 's3': {
                return new S3(
                    `${scheme}:\\${host}`,
                    user,
                    credential as string,
                    'us-east-1', // TODO
                    port,
                    error => logger.error('S3 error:', error),
                    onClose
                )
            }
            default: 
                throw new Error(`Unsupported protocol ${protocol}`)
        }
    }

    
    private static shared = new ReferenceCountMap<ConnectionID, FileSystem>
    private static pools: Map<string, Map<string, {fs: FileSystem, idle: false|ReturnType<typeof setTimeout>}>> = new Map()
    private static queue: Function[] = []
    private static pending: Record<string, ((id: string) => void)[]> = {}
    private static limits = new Map<ConnectionID, number>()
    private static protocols = new Map<ConnectionID, string>()
    private static credentials = new Map<ConnectionID, ['password', string]|['key', Buffer]>()
}
