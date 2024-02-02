import React, { useState, useEffect, useCallback, useContext } from "react"
import Explorer from './Explorer/Explorer'
import Spinner from './ui/Spinner/Spinner'
import { ConnectionID } from '../../../src/types'
import { ToolbarItem } from './Toolbar/Toolbar'
import { ConfigContext } from '../context/config'
import { LocalFileSystemID } from '../../../src/types'

interface Props {
    onConnect: (id: ConnectionID, pwd: string) => void
    toolbar: ToolbarItem[]
}

export default function ({ onConnect, toolbar }: Props) {
    const { paths: { connections } } = useContext(ConfigContext)
    useEffect(() => setPath(connections), [])

    const [path, setPath] = useState('')

    const connect = useCallback((path: string) => {
        window.f5.connect(path).then(({id, config: { pwd }}) => {
            localStorage.setItem(id, path)
            onConnect(id, pwd)
        })
    }, [])

    return <>
        {path ? 
            <Explorer 
                icon='power_settings_new'
                connection={LocalFileSystemID}
                path={path} 
                fixedRoot={connections}
                onChange={setPath} 
                onSelect={() => {}}
                onOpen={connect}
                toolbar={toolbar}
                tabindex={2}
            /> : <Spinner />
        }
    </>
}
