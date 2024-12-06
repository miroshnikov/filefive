import React, { useState } from "react"
import { Spinner, Button } from '../../ui/components'


interface Props {
    path: string
    onClose: (create: boolean) => void
}

export default function MissingDir({path, onClose}: Props) {

    const [creating, setCreating] = useState(false)

    const create = () => {
        setCreating(true)
        onClose(true)
    }

    return <div className="fill-center">
        {creating ? 
            <Spinner radius="2em" /> :
            <div className="center">
                <div className='icon'>folder_off</div>
                <p>Folder <b>{path}</b> doesn't exist.</p>
                <p>Do you want to</p>
                <p><Button onClick={() => create()} primary={true}>Create Folder</Button></p>
                <p><span className='link' onClick={() => onClose(false)}>turn off synchronized browsing</span></p>
            </div>
        }
    </div>
}