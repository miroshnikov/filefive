import express from 'express'
import path from 'path'
import MainApp, { Emitter } from './App'
import { WebSocketServer } from 'ws'
const open = import("open")

const port = 3113

const app = express()

app.use(express.json())
app.use(express.static(path.resolve(__dirname, 'public')))

const server = app.listen(port, () => {
    console.log(`F5 is running on port ${port}`)
    // (await open).default('http://localhost:3000')
})

const handle = async (name: string, handler: (args: {}) => any) => {
    app.post(`/api/${name}`, async (req, res) => {
        const result = await handler(req.body)
        res.json(result)
    })
}

const wss = new WebSocketServer({server, path: `/events`})
const emitter: Emitter = channel => event => 
    wss.clients.forEach(ws => ws.send(JSON.stringify({channel, ...event})))
    
MainApp.bootstrap(handle, emitter, async file => { (await open).default(file) })
