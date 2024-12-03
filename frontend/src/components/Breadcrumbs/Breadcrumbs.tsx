import React, { useState, useEffect } from "react"
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
            segments(path).reduce(
                (all, segment) => [...all, all.length ? join(last(all), segment) : normalize(segment) ], 
                []
            )
        )
    }, [path])

    return (
        <div className={'breadcrumbs ' + styles.root}>
            {connection ? 
                <em onClick={() => go(root)}>
                    <i className='icon'>{icon}</i> 
                    <span>{connection.name}</span>
                </em> :
                <i className='icon' onClick={() => go(root)}>{icon}</i>
            }
            {items.map((item, i) => 
                <div key={item}>
                    {i==0 && <i className='icon'>arrow_forward_ios</i>}
                    <span onClick={() => go(item)} data-tooltip={item}>{basename(item)}</span>
                    {i<items.length-1 && <i className='icon'>arrow_forward_ios</i>}
                </div>
            )}
        </div>
    )
}