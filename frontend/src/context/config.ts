import { createContext } from "react"
import { AppConfig } from '../../../src/types'

export const ConfigContext = createContext<AppConfig>(null)