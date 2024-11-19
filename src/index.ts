import express from 'express'
import multer from 'multer'
import { resolve, join, dirname } from 'path'
import { tmpdir } from 'node:os'
import { rename, rm } from 'node:fs/promises'
import MainApp, { Emitter } from './App'
import { WebSocketServer } from 'ws'
const open = import("open")
import { createURI } from './utils/URI'
import { LocalFileSystemID } from './types'
import { commands } from './commands'

const port = 3113

const app = express()

app.use(express.json())
app.use(express.static(resolve(__dirname, 'public')))

const server = app.listen(port, () => {
    console.log(`F5 is running on port ${port}`)
    // (await open).default('http://localhost:3000')
})

const handle = async (name: string, handler: (args: {}) => any) => {
    app.post(`/api/${name}`, async (req, res) => {
        try {
            const result = await handler(req.body)
            res.json(result ?? null)
        } catch (e) {
            res.status(400)
            process.env.NODE_ENV == 'development' && console.error(e)
            res.json({ message: (typeof e == 'object' && 'message' in e) ? e.message : String(e) })
        }
    })
}

const upload = multer({ dest: tmpdir() })
app.post('/api/upload', upload.array('files'), async function (req, res) {
    if (Array.isArray(req.files)) {
        const src: string[] = []
        for (const {path, originalname} of req.files) {
            const fnm = join(dirname(path), originalname)
            await rename(path, fnm)
            src.push(fnm)
        }
        commands.copy(
            src.map(path => createURI(LocalFileSystemID, path)), 
            req.body['to'], 
            true,
            null,
            () => src.forEach(path => rm(path, { force: true }))
        )
    }
    res.json(true)
})

const wss = new WebSocketServer({server, path: `/events`})
const emitter: Emitter = channel => event => 
    wss.clients.forEach(ws => ws.send(JSON.stringify({channel, ...event})))
    
MainApp.bootstrap(handle, emitter, async file => { (await open).default(file) })
