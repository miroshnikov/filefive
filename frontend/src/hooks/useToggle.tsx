import { useReducer } from 'react'


export const useToggle = (initial: boolean) => useReducer(on => !on, initial)
