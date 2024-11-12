import React, { StrictMode } from "react"
import { createRoot } from 'react-dom/client'
import './api'
import './assets/styles.css'
import App from './components/App/App'
import i18next from 'i18next'


i18next
    .use({
        type: 'postProcessor',
        name: 'test',
        process: function(value: any, key: any, options: any, translator: any) {
            return value;
        }
    })
    .init({
        lng: 'en',
        fallbackLng: 'en',
        resources: {
            en: {
                translation: {
                    "file_one": "file",
                    "file_other": "files",
                    "num_of_files_zero": "",
                    "num_of_files_one": "{{count}} file",
                    "num_of_files_other": "{{count}} files",
                    "num_of_dirs_zero": "",
                    "num_of_dirs_one": "{{count}} folder",
                    "num_of_dirs_other": "{{count}} folders",
                    "copying": "Copying $t(num_of_files, {'count': {{count}} })",
                    "moving": "Moving $t(num_of_files, {'count': {{count}} })",
                    "downloading": "Downloading $t(num_of_files, {'count': {{count}} }) from <strong>{{- conn}}</strong>",
                    "uploading": "Uploading $t(num_of_files, {'count': {{count}} }) to <strong>{{- conn}}</strong>",
                    "deleting": "Deleting $t(num_of_files, {'count': {{count}} }) in <strong>{{- conn}}</strong>",
                    "selected_zero": "",
                    "selected_one": "Selected ",
                    "selected_other": "Selected ",
                    "stat": [
                        "$t(num_of_files, {'count': {{files}} })", 
                        "$t(num_of_dirs, {'count': {{dirs}} })"
                    ],
                    "size": "Files size: {{size}}"
                }
            }
        }
    })

window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('app')
    const root = createRoot(container)
    root.render(<App/>)
})
