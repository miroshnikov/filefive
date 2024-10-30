import { homedir } from 'node:os'
import { join } from 'node:path'
import { createWriteStream } from 'node:fs';
import { Console } from "console"
import { ConnectionID, Path } from './types'
import { FileSystem } from './FileSystem'
const chalk = import('chalk')


// const logger = new Console({
//     stdout: createWriteStream(join(homedir(), '.f5', 'app.log')),
//     stderr: createWriteStream(join(homedir(), '.f5', 'error.log')),
// })
const logger = console
export default logger

const cmd = async (cmd: string) => (await chalk).default.bold.bgGreen(cmd)
export const id = async (id: string) => (await chalk).default.yellow(id)
export const err = async (error: string) => (await chalk).default.red('⚠ ' + error)


export class LogFS extends FileSystem {
    constructor(
        private id: ConnectionID, 
        private fs: FileSystem
    ) {
        super()
    }

    async open(): Promise<void> {
        logger.log(await cmd('CONNECT'), await id(this.id), '...')
        try {
            const res = await this.fs.open()
            logger.log(await cmd('CONNECTED'), await id(this.id))
            return res
        } catch (e) {
            let msg = `Could not connect to ${this.id}`
            if ('message' in e) {
                msg += ': ' + e.message
            }
            logger.error(await err(msg))
            throw Error(msg)
        }
    }

    async close() {
        logger.log(await cmd('CLOSE'), await id(this.id))
        this.fs.close()
    }

    opened() { 
        return this.fs.opened()   
    }

    async pwd() {
        logger.log(await cmd('PWD'), await id(this.id))
        try {
            return await this.fs.pwd()
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }

    async ls(dir: Path) {
        logger.log(await cmd('LS'), await id(this.id) + dir)
        try {
            return await this.fs.ls(dir)
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }

    async get(remote: Path, local: Path) {
        logger.log(await cmd('GET'), `${local} ← ` + await id(this.id) + remote)
        try {
            return await this.fs.get(remote, local)
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }

    async put(local: Path, remote: Path) {
        logger.log(await cmd('PUT'), `${local} → ` + await id(this.id) + remote)
        try {
            return await this.fs.put(local, remote)
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }

    async rm(path: Path, recursive: boolean) {
        logger.log(await cmd(recursive ? 'RMDIR' : 'RM'), await id(this.id) + path)
        try {
            return await this.fs.rm(path, recursive)
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }

    async mkdir(path: Path) {
        logger.log(await cmd('MKDIR'), await id(this.id) + path)
        try {
            return await this.fs.mkdir(path)
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }

    async mv(from: Path, to: Path) {
        logger.log(await cmd('MV'), await id(this.id) + from, ' → ', await id(this.id) + to)
        try {
            return await this.fs.mv(from, to)
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }

    async cp(from: Path, to: Path, recursive: boolean): Promise<void> {
        logger.log(await cmd(recursive ? 'CP -R' : 'CP'), await id(this.id) + from, ' → ', to)
        try {
            return await this.fs.cp(from, to, recursive)
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }

    async write(path: Path, data: string) {
        logger.log(await cmd('WRITE'), await id(this.id) + path)
        try {
            return await this.fs.write(path, data)
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }
}