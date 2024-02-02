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
            console.log('use: ', {value, key, options, translator})
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
                    "num_of_files_one": "{{count}} file",
                    "num_of_files_other": "{{count}} files",
                    "downloading": "Downloading $t(num_of_files, {'count': {{count}} }) from <strong>{{- conn}}</strong>",
                    "uploading": "Uploading $t(num_of_files, {'count': {{count}} }) to <strong>{{- conn}}</strong>",
                    "modified": "Modified: {{val, datetime(dateStyle: 'full', timeStyle: 'long')}}"
                }
            }
        }
    })

window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('app');
    const root = createRoot(container);
    root.render(<StrictMode><App/></StrictMode>);
})
