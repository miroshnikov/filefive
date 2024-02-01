import express from 'express'
import path from 'path'
import open from 'open'
import MainApp, { Notifier } from './App'
import { WebSocket, WebSocketServer } from 'ws'

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

const notify: Notifier = <Event extends {}>(name: string): (event: Event) => void => {
    let s: WebSocket
    (new WebSocketServer({server, path: `/events/${name}`})).on("connection", ws => s = ws)
    return event => s?.send(JSON.stringify(event))
}

MainApp.bootstrap(handle, notify)




// var wss = new WebSocketServer({server, path: "/events/fs"})
// wss.on("connection", ws => {
//     ws.on('message', data => {
//         console.log('receive', data.toString())
//     })
// })


// app.get('/test', async (req, res) => {
//     s.send('hello123!')
//     res.json('ok')
// })