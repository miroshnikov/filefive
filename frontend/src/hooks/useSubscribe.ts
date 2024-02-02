import { useEffect } from 'react'
import { Subscription } from 'rxjs'

export const useSubscribe = (listener: () => Subscription, deps: Parameters<typeof useEffect>[1] = []) => {
    useEffect(() => {
        const subscription = listener()
        return () => subscription.unsubscribe()
    }, deps);   
}


