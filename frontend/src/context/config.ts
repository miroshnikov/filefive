import { createContext } from "react"
import { AppSettings } from '../shared/types'

export const AppSettingsContext = createContext<AppSettings|null>(null)