import React, { useState } from "react"
import { createPortal } from 'react-dom'
import { filter } from 'rxjs/operators'
import { useSubscribe } from '../../hooks'
import { error$ } from '../../observables/error'
import { FailureType, ConnectionID } from '../../../../src/types'
import { Button } from '../../ui/components'
import styles from './Error.less'


export default function Error() {
    const [errors, setErrors] = useState<{ id?: ConnectionID, origin?: string, message: string }[]>([])
    const [current, setCurrent] = useState(0)

    useSubscribe(() =>
        error$.pipe(filter(() => !document.hidden)).subscribe(error => {
            process.env.NODE_ENV == 'development' && console.error(error)
            if (error.type == FailureType.RemoteError) {
                setErrors(errors => [...errors, { id: error.id, message: error.message }])
            } else if (error.type == FailureType.APIError) {
                setErrors(errors => [...errors, { origin: error.method,  message: error.message }])
            }
        })
    )

    return <>
        {errors.length > 0 && createPortal(
            <div className={styles.root}>
                <button className="close" onClick={() => setErrors([])}>✕</button>
                <i className="icon">warning</i>
                <div>
                    {errors[current].id && 
                        <em><i className="icon">cloud</i>{ errors[current].id }</em>
                    }
                    { errors[current].message }
                    {errors[current].origin && 
                        <p>
                            Origin: { errors[current].origin }
                        </p>
                    }
                </div>
                {errors.length > 1 &&
                    <footer>
                        <Button onClick={() => setCurrent(Math.max(current-1, 0))} disabled={current<=0}>Previous</Button>
                        {current+1}/{errors.length}
                        <Button onClick={() => setCurrent(Math.min(current+1, errors.length-1))} disabled={current>=errors.length-1}>Next</Button>
                    </footer>
                }
            </div>,
            document.body
        )}
    </>
}
