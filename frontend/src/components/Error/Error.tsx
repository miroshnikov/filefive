import React from "react"
import { useSubscribe } from '../../hooks'
import { error$ } from '../../observables/error'
import { FailureType } from '../../../../src/types'


export default function() {
    useSubscribe(() =>
        error$.subscribe(error => {
            if (error.type != FailureType.Unauthorized) {
                console.error(error)
            }
        })
    )
    return <></>
}