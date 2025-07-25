import { join, dirname, isAbsolute, normalize } from 'node:path'
import { Client, SFTPWrapper, Stats } from 'ssh2'
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
    },
    {
        name: "rights", 
        type: FileAttributeType.String, 
        title: "Rights"
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
        private privateKey: Buffer = null,
        private port = 22,
        private onError: (e: Error) => void,
        private onClose = () => {}
    ) { 
        super()
    }

    async open(): Promise<SFTPWrapper> {
        if (this.connected === undefined) {
            let connecting = true
            this.connected = new Promise<SFTPWrapper>((resolve, reject) => {
                this.connection
                    .on('close', () => {
                        if (this.connected) {
                            if (connecting) {
                                reject(new Error('Remote side unexpectedly closed network connection'))
                            } else {
                                this.onClose()
                            }
                        }
                        this.connected = undefined
                        connecting = false
                    })
                    .on('ready', () => {
                        connecting = false
                        this.connection.sftp((e, sftp) => {
                            if (e) {
                                reject(new Error(this.decodeError(e)))
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
                port: this.port,
                ...(
                    this.privateKey ? 
                        { privateKey: this.privateKey } : 
                        { password: this.password }
                )
                // debug: s => console.log('DEBUG', s)
            })
        }
        return this.connected
    }

    close() {
        this.connection.end()
    }

    opened() { 
        return this.connected != undefined
    }

    async pwd(): Promise<Path> {
        const sftp = await this.open()
        return new Promise((resolve, reject) => 
            sftp.realpath('.', (e, current) => e ? 
                reject(new Error(this.decodeError(e))) : 
                resolve(current))
        )
    }
    
    async ls(dir: Path): Promise<FileItem[]> {
        const sftp = await this.open()
        return new Promise((resolve, reject) => {
            sftp.readdir(dir, async (e, list) => {
                if (e) {
                    reject(new Error(`LS: Can't get contents of ${dir} ` + this.decodeError(e)))
                    return
                }

                const files: FileItem[]  = []
                for (let f of list) {
                    if (f.attrs.isSymbolicLink()) {
                        let target = await this.readlink(join(dir, f.filename))
                        if (!isAbsolute(target)) {
                            target = normalize(join(dir, target))
                        }
                        const targetStat = await this.stat(target)
                        files.push({
                            path: join(dir, f.filename),
                            name: f.filename,
                            dir: f.attrs.isDirectory(),
                            size: targetStat.size,
                            modified: new Date(targetStat.mtime * 1000),
                            owner: targetStat.uid,
                            group: targetStat.gid,
                            rights: targetStat.mode,
                            target
                        })
                    } else {
                        files.push({
                            path: join(dir, f.filename),
                            name: f.filename,
                            dir: f.attrs.isDirectory(),
                            size: f.attrs.size,
                            modified: new Date(f.attrs.mtime * 1000),
                            owner: f.attrs.uid,
                            group: f.attrs.gid,
                            rights: f.attrs.mode
                        })
                    }
                }
                resolve(files)
            })
        })
    }

    private async readlink(path: Path): Promise<string> {
        const sftp = await this.open()
        return new Promise((resolve, reject) => {
            sftp.readlink(path, (e, target) => e ? reject(new Error(this.decodeError(e))) : resolve(target))
        })
    }

    private async stat(path: Path): Promise<Stats> {
        const sftp = await this.open()
        return new Promise((resolve, reject) => {
            sftp.stat(path, (e, stats) => e ? reject(new Error(this.decodeError(e))) : resolve(stats))
        })
    }
    

    async get(fromRemote: Path, toLocal: Path): Promise<void> {
        const sftp = await this.open()
        return new Promise((resolve, reject) => {
            sftp.fastGet(fromRemote, toLocal, (e) => e ? reject(new Error(this.decodeError(e))) : resolve())
        })
    }

    async put(fromLocal: Path, toRemote: Path): Promise<void> {
        const sftp = await this.open() 
        return new Promise((resolve, reject) => {
            sftp.fastPut(fromLocal, toRemote, e => e ? reject(new Error(this.decodeError(e) + ` ${toRemote}`)) : resolve())
        })
    }

    async rm(path: Path, recursive: boolean): Promise<void> {
        const sftp = await this.open() 
        return new Promise((resolve, reject) => {
            if (recursive) {
                sftp.rmdir(path, e => e ? reject(new Error(this.decodeError(e))) : resolve())
            } else {
                sftp.unlink(path, e => e ? reject(new Error(this.decodeError(e))) : resolve())
            }
        })
    }

    async mkdir(path: Path): Promise<void> {
        const sftp = await this.open() 
        return new Promise((resolve, reject) => sftp.mkdir(
            path, 
            e => e ? 
                reject(new Error(`MKDIR: Can't create directory ${path} ` + this.decodeError(e))) :
                resolve()
        ))
    }

    async rename(from: Path, to: Path): Promise<void> {
        const sftp = await this.open() 
        return new Promise((resolve, reject) => {
            sftp.rename(from, to, e => {
                if (e) {
                    reject(new Error(this.decodeError(e)))
                    return
                }
                resolve()
            })
        })
    }

    async mv(from: Path, to: Path): Promise<void> {
        await this.exec(`rm -Rf '${to}'`)
        await this.exec(`mkdir -p '${dirname(to)}'`)       
        return this.exec(`mv -f '${from}' '${to}'`)
    }

    async cp(from: Path, to: Path, recursive: boolean): Promise<void> {
        await this.exec(`rm -Rf '${to}'`)
        if (recursive) {
            return this.exec(`cp -fR '${from}' '${to}'`)
        }
        await this.exec(`mkdir -p '${dirname(to)}'`)  
        return this.exec(`cp -f '${from}' '${to}'`)
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
                sftp.write(h, data, 0, data.length, 0, (e) => e ? reject(new Error(this.decodeError(e))) : resolve())
            })
    
        })
    }


    private async exec(cmd: string): Promise<void> {
        await this.open()
        return new Promise((resolve, reject) => 
            this.connection.exec(cmd, (e, stream) => {
                if (e) {
                    reject(new Error(cmd + ': ' + this.decodeError(e)))
                    return
                }
                stream.on('exit', (code) => {
                    if (code) {
                        reject(new Error(`${cmd}: the process's return code is ${code}`))
                    }
                    resolve()
                }).on('data', (data: any) => {
                    console.log(`${cmd}: ${data}`)
                }).stderr.on('data', data => {
                    reject(new Error(`${cmd}: ${data}`))
                })
            })
        )
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
        let msg = e.message || (
            ('code' in e) ?
                (e['code'] in STATUS_CODE_STR ? STATUS_CODE_STR[e['code']] : `Code: ${e['code']}`) : 
                'Unknown error'
        )
        return msg
    }

    private connected: Promise<SFTPWrapper>
    private connection = new Client()
    private extensions: Record<OpenSSLExtension, '1'|'2'>
}