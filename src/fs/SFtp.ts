import { join, dirname } from 'node:path'
import { Client, SFTPWrapper } from 'ssh2'
import { Path } from '../types'
import { FileSystem, FileItem, FileAttributes, FileAttributeType } from '../FileSystem'

// https://github.com/mscdex/ssh2/blob/master/SFTP.md
// https://datatracker.ietf.org/doc/html/draft-ietf-secsh-filexfer-13#section-4.3

// see also https://github.com/theophilusx/ssh2-sftp-client


export const ATTRIBUTES: FileAttributes = [
    {
        name: "name",     
        type: FileAttributeType.String, 
        title: "Name"
    },
    {
        name: "size",     
        type: FileAttributeType.Number, 
        title: "Size"
    },
    {
        name: "modified", 
        type: FileAttributeType.Date, 
        title: "Last Modified"
    }
]



type OpenSSLExtension = 
    | 'posix-rename@openssh.com'
    | 'statvfs@openssh.com'
    | 'fstatvfs@openssh.com'
    | 'hardlink@openssh.com'
    | 'fsync@openssh.com'
    | 'lsetstat@openssh.com'
    | 'expand-path@openssh.com'
    | 'copy-data'
    | 'home-directory'
    | 'users-groups-by-id@openssh.com'


interface SFTPExt extends SFTPWrapper {
    _extensions: Record<OpenSSLExtension, '1'|'2'>
}


export default class SFtp extends FileSystem {
    constructor(
        private host: string, 
        private user: string, 
        private password: string, 
        private port = 22,
        private onError: (e: Error) => void
    ) { 
        super()
    }

    async open(): Promise<SFTPWrapper> {
        if (this.connected === undefined) {
            this.connected = new Promise<SFTPWrapper>((resolve, reject) => {
                this.connection
                    .on('close', () => { 
                        if (this.connected) {
                            reject(new Error('Remote side unexpectedly closed network connection'))
                        }
                        this.connected = undefined
                    })
                    .on('ready', () => {
                        this.connection.sftp((e, sftp) => {
                            if (e) {
                                reject(this.decodeError(e))
                                return
                            }
                            this.connection.on('error', this.onError)
                            this.extensions = (sftp as SFTPExt)._extensions
                            resolve(sftp)
                        })
                    })
                    .on('error', err => reject(err))
            })
            this.connection.connect({ 
                host: this.host, 
                username: this.user, 
                password: this.password, 
                port: this.port,
                // debug: s => console.log('DEBUG', s)
            })
        }
        return this.connected
    }

    close() {
        this.connection.end()
    }

    async pwd(): Promise<Path> {
        const sftp = await this.open()
        return new Promise((resolve, reject) => sftp.realpath('.', (e, current) => e ? reject(this.decodeError(e)) : resolve(current)))
    }
    
    async ls(dir: Path): Promise<FileItem[]> {
        const sftp = await this.open()
        return new Promise((resolve, reject) => {
            sftp.readdir(dir, (err, list) => {
                err ? 
                    reject(this.decodeError(err)) : 
                    resolve(
                        list
                            .map(f => ({
                                path: join(dir, f.filename),
                                name: f.filename,
                                dir: f.attrs.isDirectory(),
                                size: f.attrs.size,
                                modified: new Date(f.attrs.mtime * 1000),
                                owner: f.attrs.uid,
                                group: f.attrs.gid,
                                mode: f.attrs.mode  // rights ?
                            }))
                    )
            })
        })
    }

    async get(fromRemote: Path, toLocal: Path): Promise<void> {
        const sftp = await this.open()
        return new Promise((resolve, reject) => {
            sftp.fastGet(fromRemote, toLocal, (e) => e ? reject(this.decodeError(e)) : resolve())
        })
    }

    async put(fromLocal: Path, toRemote: Path): Promise<void> {
        const sftp = await this.open() 
        return new Promise((resolve, reject) => {
            sftp.fastPut(fromLocal, toRemote, e => e ? reject(this.decodeError(e)) : resolve())
        })
    }

    async rm(path: Path, recursive: boolean): Promise<void> {
        const sftp = await this.open() 
        const files = []
        return new Promise((resolve, reject) => {
            if (recursive) {
                // sftp.readdir(path)
                sftp.rmdir(path, e => e ? reject(this.decodeError(e)) : resolve())

            } else {
                sftp.unlink(path, e => e ? reject(this.decodeError(e)) : resolve())
            }
        })
    }

    async mkdir(path: Path): Promise<void> {
        const sftp = await this.open() 
        return new Promise((resolve, reject) => sftp.mkdir(path, e => e ? reject(e) : resolve()))
    }

    async write(path: Path, s: string): Promise<void> {
        const sftp = await this.open()
        return new Promise((resolve, reject) => {
            sftp.open(path, 'w', (e, h) => {
                if (e) {
                    reject(e)
                    return
                }
                const data = Buffer.from(s)
                sftp.write(h, data, 0, data.length, 0, (e) => e ? reject(this.decodeError(e)) : resolve())
            })
    
        })
    }

    async rename(path: Path, name: string): Promise<void> {
        const sftp = await this.open()
        return new Promise((resolve, reject) => {
            sftp.rename(path, join(dirname(path), name), e => {
                if (e) {
                    reject(this.decodeError(e))
                    return
                }
                resolve()
            })
        })
    }

    private decodeError(e: Error & { code?: number }) {
        const STATUS_CODE = {
            OK: 0,
            EOF: 1,
            NO_SUCH_FILE: 2,
            PERMISSION_DENIED: 3,
            FAILURE: 4,
            BAD_MESSAGE: 5,
            NO_CONNECTION: 6,
            CONNECTION_LOST: 7,
            OP_UNSUPPORTED: 8
        }

        const STATUS_CODE_STR = {
            [STATUS_CODE.OK]: 'No error',
            [STATUS_CODE.EOF]: 'End of file',
            [STATUS_CODE.NO_SUCH_FILE]: 'No such file or directory',
            [STATUS_CODE.PERMISSION_DENIED]: 'Permission denied',
            [STATUS_CODE.FAILURE]: 'Failure',
            [STATUS_CODE.BAD_MESSAGE]: 'Bad message',
            [STATUS_CODE.NO_CONNECTION]: 'No connection',
            [STATUS_CODE.CONNECTION_LOST]: 'Connection lost',
            [STATUS_CODE.OP_UNSUPPORTED]: 'Operation unsupported',
        }

        return new Error(e.message ?? ('code' in e ? (STATUS_CODE_STR[e['code']] ?? `Code: ${e['code']}` ) : 'Unknown error') )
    }

    private connected: Promise<SFTPWrapper>
    private connection = new Client()
    private extensions: Record<OpenSSLExtension, '1'|'2'>
}