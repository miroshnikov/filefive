import React, { useState, useEffect, Fragment } from "react"
import styles from './Breadcrumbs.less'
import { segments, join, normalize, basename } from '../../utils/path'
import { last } from 'ramda'
import { ConnectionID } from "../../../../src/types"


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

    useEffect(() => {
        setItems(
            segments(path.substring(root.length)).reduce(
                (all, segment) => [...all, all.length ? join(last(all), segment) : normalize(segment) ], 
                []
            )
        )
    }, [path, root])

    return (
        <div className={'breadcrumbs ' + styles.root}>
            {connection ? 
                <em onClick={() => go(root)} data-tooltip={root}>
                    <i className='connection icon'>{icon}</i> 
                    <span>{connection.name}</span>
                </em> :
                <i className='connection icon' onClick={() => go(root)} data-tooltip={root}>{icon}</i>
            }
            {items.length>0 && <i className='icon'>arrow_forward_ios</i>}
            {items.map((name, i) => 
                <Fragment key={crypto.randomUUID()}>
                    <span onClick={() => go(normalize(root + name))} data-tooltip={normalize(root + name)}>{basename(name)}</span>
                    {i<items.length-1 && <i className='icon'>arrow_forward_ios</i>}
                </Fragment>
            )}
        </div>
    )
}
