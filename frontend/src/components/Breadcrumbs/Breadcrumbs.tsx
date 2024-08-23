import React, { useState, useEffect } from "react"
import styles from './Breadcrumbs.less'
import { segments, join, normalize, basename } from '../../utils/path'
import { last } from 'ramda'


export default function Breadcrumbs({icon, path, root, go}: {icon: string, path: string, root: string, go: (path: string) => void }) {

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
            <i className='icon' onClick={() => go(root)}>{icon}</i>
            {items.map(item => 
                <div key={item} title={item}>
                    <span onClick={() => go(item)}>{basename(item)}</span>
                </div>
            )}
        </div>
    </div>
}