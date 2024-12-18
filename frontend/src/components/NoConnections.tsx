import React from "react"
import { Button } from '../ui/components'
import { command$ } from '../observables/command'
import { CommandID } from '../commands'

export default function NoConnections() {
    return <div className="fill-center">
        <div className="center">
            <div className='icon'>cloud_upload</div>
            <p>No site connections found.</p>
            <p><Button onClick={() => command$.next({id: CommandID.NewFile})} primary={true}>Create New Connection...</Button></p>
        </div>
    </div>
}