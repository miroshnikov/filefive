import { accessSync, constants } from 'node:fs'

let drives: string[] = null

export function getDrives(): string[] {
    if (drives !== null) {
        return drives
    }

    drives = []
    for (let i = 65; i <= 90; i++) { // A: to Z:
        const drive = String.fromCharCode(i) + ':\\';
        try {
            accessSync(drive, constants.F_OK)
            drives.push(drive)
        } catch (err) { }
    }

    return drives;
}