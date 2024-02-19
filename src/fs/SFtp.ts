import * as path from 'path'
import { Client, SFTPWrapper } from 'ssh2'
import { Path, Files, URI } from '../types'
import { FileSystem, FileSystemURI } from '../FileSystem'

// https://github.com/mscdex/ssh2/blob/master/SFTP.md

interface SFTPExt extends SFTPWrapper {
    ext_home_dir(username: string, cb: (err: Error, homeDirectory: string) => void): void
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
        this.connection.on('close', () => { this.connected = undefined })
    }

    async open(): Promise<SFTPWrapper> {
        if (this.connected === undefined) {
            this.connected = new Promise<SFTPWrapper>((resolve, reject) => {
                this.connection
                    .on('ready', () => {
                        this.connection.sftp((err, sftp) => {
                            if (err) {
                                reject(err)
                                return
                            }
                            this.connection.on('error', this.onError)
                            this.uri = `ftp://${this.user}@${this.host}:${this.port}`
                            resolve(sftp)
                        })
                    })
                    .on('error', err => reject(err))
            })
            this.connection.connect({ host: this.host, username: this.user, password: this.password, port: this.port })
        }
        return this.connected
    }

    close() {
        this.connection.end()
    }

    async pwd(): Promise<Path> {
        const sftp = await this.open()
        return new Promise((resolve, reject) => (sftp as SFTPExt).ext_home_dir('', (e, home) => e ? reject(e) : resolve(home)))
    }
    
    async ls(dir: Path): Promise<Files> {
        const sftp = await this.open()
        return new Promise((resolve, reject) => {
            sftp.readdir(dir, (err, list) => {
                err ? 
                    reject(err) : 
                    resolve(
                        list
                            .filter(f => f.filename != '.' && f.filename != '..')
                            .map(f => ({
                                URI: this.uri+path.join(dir, f.filename) as URI,
                                path: path.join(dir, f.filename),
                                name: f.filename,
                                dir: f.attrs.isDirectory(),
                                size: f.attrs.size,
                                modified: new Date(f.attrs.mtime),
                                owner: f.attrs.uid,
                                group: f.attrs.gid,
                                mode: f.attrs.mode
                            }))
                    )
            })
        })
    }

    async get(fromRemote: Path, toLocal: Path): Promise<void> {
        const sftp = await this.open()
        return new Promise((resolve, reject) => {
            sftp.fastGet(fromRemote, toLocal, (e) => e ? reject(e) : resolve())
        })
    }

    async put(fromLocal: Path, toRemote: Path): Promise<void> {
        const sftp = await this.open() 
        return new Promise((resolve, reject) => {
            sftp.fastPut(fromLocal, toRemote, e => e ? reject(e) : resolve())
        })
    }

    async rm(path: Path, recursive: boolean): Promise<void> {
        const sftp = await this.open() 
        return new Promise((resolve, reject) =>
            recursive ? 
                sftp.rmdir(path, e => e ? reject(e) : resolve()) : 
                sftp.unlink(path, e => e ? reject(e) : resolve())
        )
    }

    async mkdir(path: Path): Promise<void> {
        const sftp = await this.open() 
        return new Promise((resolve, reject) => sftp.mkdir(path, e => e ? reject(e) : resolve()))
    }


    private connected: Promise<SFTPWrapper>
    private connection = new Client()
    private uri: FileSystemURI
}