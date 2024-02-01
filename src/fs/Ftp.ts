import * as path from 'path'
import * as fs from 'fs'
import Client from 'ftp'
import { Path, Files, URI } from '../types'
import { FileSystem, FileSystemURI } from '../FileSystem'

// https://github.com/mscdex/node-ftp

export default class Ftp extends FileSystem {
    constructor(
        private host: string, 
        private user: string, 
        private password: string, 
        private port = 21,
        private onError: (e: Error) => void
    ) { 
        super()
        this.connection.on('close', () => { this.connected = undefined })
    }

    async open(): Promise<FileSystemURI> {
        if (this.connected === undefined) {
            this.connected = new Promise<FileSystemURI>((resolve, reject) => {
                this.connection
                    .on('ready', () => {
                        this.connection.on('error', this.onError)
                        resolve(this.uri = `ftp://${this.user}@${this.host}:${this.port}`)
                    })
                    .on('error', reject)
            })
            this.connection.connect({ host: this.host, user: this.user, password: this.password, port: this.port })
        }
        return this.connected
    }

    close() {
        this.connection.end()
    }

    async pwd(): Promise<Path> {
        await this.open()
        return new Promise((resolve, reject) => this.connection.pwd((e, pwd) => e ? reject(e) : resolve(pwd)))
    }

    async ls(dir: Path): Promise<Files> {
        await this.open()
        return new Promise((resolve, reject) => {
            this.connection.list(dir, (err: Error, list: Client.ListingElement[]) => {
                err ? 
                    reject(err) : 
                    resolve(
                        list
                            .filter(f => f.name != '.' && f.name != '..')
                            .map(f => ({
                                URI: this.uri+path.join(dir, f.name) as URI,
                                path: path.join(dir, f.name),
                                name: f.name,
                                dir: f.type == 'd',
                                size: f.size,
                                modified: f.date,
                                owner: f.owner,
                                group: f.group,
                                rights: f.rights,
                                target: f.target
                            }))
                    )
            })
        })
    }

    async get(fromRemote: Path, toLocal: Path): Promise<void> {
        await this.open()      
        return new Promise((resolve, reject) => {
            this.connection.get(fromRemote, (err, source) => {
                if (err) {
                    reject(err)
                } else {
                    const dest = fs.createWriteStream(toLocal)
                    dest.on('finish', () => resolve())
                    source.pipe(dest)
                }
            })
        })
    }

    async put(fromLocal: Path, toRemote: Path): Promise<void> {
        await this.open()    
        return new Promise((resolve, reject) => {
            this.connection.put(fromLocal, toRemote, e => e ? reject(e) : resolve())
        })
    }

    async rm(path: Path, recursive: boolean): Promise<void> {
        await this.open()
        return new Promise((resolve, reject) =>
            recursive ? 
                this.connection.rmdir(path, true, e => e ? reject(e) : resolve()) : 
                this.connection.delete(path, e => e ? reject(e) : resolve())
        )
    }

    async mkdir(path: Path): Promise<void> {
        await this.open()
        return new Promise((resolve, reject) => this.connection.mkdir(path, true, e => e ? reject(e) : resolve()))
    }

    private connected: Promise<FileSystemURI>
    private connection = new Client()
    private uri: FileSystemURI
}
