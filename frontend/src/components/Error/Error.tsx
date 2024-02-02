import React from "react"
import { useSubscribe } from '../../hooks'
import { error$ } from '../../observables/error'


export default function() {

    useSubscribe(() =>
        error$.subscribe(error => console.error(error, error.message))
    )

    return <></>
}