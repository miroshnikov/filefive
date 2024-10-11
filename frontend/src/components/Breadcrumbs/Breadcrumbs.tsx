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

    return <div className={styles.root}>
        <div>
            {connection ? 
                <em onClick={() => go(root)}>
                    <i className='icon'>{icon}</i> 
                    <span>{connection.name}</span>
                </em> :
                <i className='icon' onClick={() => go(root)}>{icon}</i>
            }
            {items.map(item => 
                <div key={item} title={item}>
                    <span onClick={() => go(item)}>{basename(item)}</span>
                </div>
            )}
        </div>
    </div>
}