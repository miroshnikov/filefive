import React from "react"
import { useSubscribe } from '../../hooks'
import { error$ } from '../../observables/error'
import { FailureType } from '../../../../src/types'


export default function Error() {
    useSubscribe(() =>
        error$.subscribe(error => {
            if (error.type != FailureType.Unauthorized) {
                console.error(error)
            }
        })
    )
    // TODO report issue on Github
    return <></>
}