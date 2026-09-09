import React, { useEffect, useState, Fragment } from "react"
import { segments } from '../../utils/path'
import styles from './Path.less'

export default function Path({path, type}: {path: string, type?: 'local'|'remote'}) {

    const [items, setItems] = useState<string[]>([])

    useEffect(() => setItems(segments(path)), [path])

    return <span className={styles.root + ' path-breadcrumbs'}>
        {type != undefined && <>
            <i className="icon">
                {type == 'local' ? 'computer' : 'cloud'}
            </i>
            <i>›</i>
        </>}
        {items.map((item, i) => <Fragment key={i}>
            {item}{i < items.length-1 && <i>›</i>}
        </Fragment>)}
    </span>
}