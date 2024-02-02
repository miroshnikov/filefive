import { homedir } from 'node:os'
import { join } from 'node:path'
import { createWriteStream } from 'node:fs';
import { Console } from "console"


const logger = new Console({
    stdout: createWriteStream(join(homedir(), '.f5', 'app.log')),
    stderr: createWriteStream(join(homedir(), '.f5', 'error.log')),
})
export default logger