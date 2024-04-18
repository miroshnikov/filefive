import { homedir } from 'node:os'
import { join } from 'node:path'
import { createWriteStream } from 'node:fs';
import { Console } from "console"
import { ConnectionID, Path, Files } from './types'
import { FileSystem } from './FileSystem'


// const logger = new Console({
//     stdout: createWriteStream(join(homedir(), '.f5', 'app.log')),
//     stderr: createWriteStream(join(homedir(), '.f5', 'error.log')),
// })
const logger = console
export default logger


export class LogFS extends FileSystem {
    constructor(
        private id: ConnectionID, 
        private fs: FileSystem
    ) {
        super()
    }

    async open(): Promise<void> {
        logger.log(`Connecting to ${this.id}...`)
        try {
            const res = await this.fs.open()
            logger.log('...ok')
            return res
        } catch (e) {
            let msg = `Could not connect to ${this.id}`
            if ('message' in e) {
                msg += ': ' + e.message
            }
            logger.error(e) 
            throw msg
        }
    }

    close() {
        this.fs.close()
    }

    async pwd() {
        logger.log(`PWD ${this.id}`)
        try {
            return await this.fs.pwd()
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }

    async ls(dir: Path) {
        logger.log(`LIST ${this.id}${dir}`)
        try {
            return await this.fs.ls(dir)
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }

    async get(remote: Path, local: Path) {
        logger.log(`GET ${remote} -> ${local}`)
        try {
            return await this.fs.get(remote, local)
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }

    async put(local: Path, remote: Path) {
        logger.log(`PUT ${local} -> ${remote}`)
        try {
            return await this.fs.put(local, remote)
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }

    async rm(path: Path, recursive: boolean) {
        logger.log(`RM ${path}`)
        try {
            return await this.fs.rm(path, recursive)
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }

    async mkdir(path: Path) {
        logger.log(`MKDIR ${path}`)
        try {
            return await this.fs.mkdir(path)
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }

    async write(path: Path, data: string) {
        logger.log(`WRITE ${path}`)
        try {
            return await this.fs.write(path, data)
        } catch (e) {
            logger.error(e) 
            throw e
        }
    }
}