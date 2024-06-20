import { createContext } from "react"
import { AppSettings } from '../../../src/types'

export const ConfigContext = createContext<AppSettings>(null)