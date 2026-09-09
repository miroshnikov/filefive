import React, { useState, useEffect, Fragment, useRef } from "react"
import styles from './Breadcrumbs.less'
import { segments, join, normalize, basename } from '../../utils/path'
import { createURI } from '../../shared/utils/URI'
import { ConnectionID, Path, LocalFileSystemID } from "../../shared/types"
import { last } from 'ramda'
import { CommandID } from '../../commands'
import { command$ } from '../../observables/command'
import { Menu, MenuItem, ContextMenu } from '../../ui/components'

function createMenu(path: Path, connId: ConnectionID) {
    return [
        {
            id: CommandID.CopyPath,
            label: 'Copy Path',
            click: () => command$.next({ id: CommandID.CopyPath, uri: createURI(connId, path) })
        },
        {
            id: CommandID.CopyName,
            label: 'Copy Name',
            click: () => command$.next({ id: CommandID.CopyName, uri: createURI(connId, path) })
        },
        ...(connId == LocalFileSystemID
            ? [
                {
                    id: 'vscode',
                    label: "Open in VS Code",
                    click: () => { window.f5.open(createURI(LocalFileSystemID, path), 'code') }
                },
                {
                    id: 'open',
                    label: 'Show in Finder',
                    click: () => { window.f5.open(createURI(LocalFileSystemID, path)) },
                },
            ]
            : []
        )
    ]
}


export default function Breadcrumbs(
    {icon, path, root, go, connection}: 
    {   
        icon: string, 
        path: string, 
        root: string, 
        go: (path: string) => void,
        connection?: { id: ConnectionID, name: string }
    }
) {
    const [items, setItems] = useState<string[]>([])
    const rootRef = useRef<HTMLDivElement>(null)
    const [menu, setMenu] = useState<MenuItem[]>([])

    useEffect(() => {
        setItems(
            segments(path.substring(root.length)).reduce(
                (all, segment) => [...all, all.length ? join(last(all)!, segment) : normalize(segment) ], 
                [] as string[]
            )
        )
    }, [path, root])

    const names = items.map((name, i) => {
        const path = normalize(root + name)
        return <Fragment key={i}>
            <span 
                onClick={() => go(path)} 
                data-tooltip={path}
                onContextMenuCapture = {
                    () => setMenu(createMenu(path, connection?.id ?? LocalFileSystemID)) 
                }
            >{basename(name)}</span>
            {i<items.length-1 && <i className='icon'>arrow_forward_ios</i>}
        </Fragment>
    })

    return (<>
        <div 
            ref={rootRef}
            className={'breadcrumbs ' + styles.root} 
            onContextMenuCapture={() => setMenu([])}
        >
            {connection ? 
                <em onClick={() => go(root)} data-tooltip={root}>
                    <i className='connection icon'>{icon}</i> 
                    <span>{connection.name}</span>
                </em> :
                <i className='connection icon' onClick={() => go(root)} data-tooltip={root}>{icon}</i>
            }
            {items.length>0 && <i className='icon'>arrow_forward_ios</i>}
            {names}
        </div>
        {rootRef.current &&
            <ContextMenu target={rootRef.current}>
                {menu.length > 0 
                    ? <Menu items={menu}></Menu>
                    : <></>
                }
            </ContextMenu>
        }
    </>)
}
