import { createContext } from "react"
import { AppSettings } from '../../../src/types'

export const AppSettingsContext = createContext<AppSettings>(null)