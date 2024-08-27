import React, { useState, useEffect, useRef, ReactElement } from "react"
import styles from './Split.less'
import { fromEvent } from 'rxjs'
import { switchMap, map, takeUntil } from 'rxjs/operators'
import { useSubscribe } from '../../hooks'


export default function Split ({left, right} : {left: ReactElement, right: ReactElement}) {
    const root = useRef(null)
    const resizer = useRef(null)
    const leftPane = useRef(null)
    const rightPane = useRef(null)

    const [width, setWidth] = useState(0)

    useSubscribe(() => {
        return fromEvent(resizer.current, 'mousedown')
            .pipe( 
                switchMap(() => 
                    fromEvent<MouseEvent>(document, 'mousemove')
                    .pipe( 
                        map(e => e.pageX),
                        takeUntil( fromEvent(document, 'mouseup') )
                    )
                )
            ).subscribe(x => {
                const topRc = root.current.getBoundingClientRect()
                const leftRc = leftPane.current.getBoundingClientRect()
                setWidth((x - leftRc.left) / topRc.width * 100)
            })
    })

    return (
        <div className={styles.root} ref={root}>
            <div ref={leftPane} style={{flexBasis: (width > 0 ? width : 50) + '%'}}>{left}</div>
            <span ref={resizer}></span>
            <div ref={rightPane}>{right}</div>
        </div>
    )
}
