import express from 'express'
import path from 'path'
import open from 'open'
import MainApp, { Emitter } from './App'
import { WebSocketServer } from 'ws'

const port = 3113

const app = express()

app.use(express.json())
app.use(express.static(path.resolve(__dirname, 'public')))

const server = app.listen(port, () => {
    console.log(`F5 is running on port ${port}`)
    // open('http://localhost:3000')
})

const handle = (name: string, handler: (args: {}) => any) =>
    app.post(`/api/${name}`, (req, res) => res.json(handler(req.body)))

const wss = new WebSocketServer({server, path: `/events`})
const emitter: Emitter = channel => event => wss.clients.forEach(ws => ws.send(JSON.stringify({channel, ...event})))

MainApp.bootstrap(handle, emitter)
