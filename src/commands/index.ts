import connect from './connect'
import disconnect from './disconnect'
import watch from './watch'
import unwatch from './unwatch'
import copy from './copy'
import remove from './remove'
import clear from './clear'
import mkdir from './mkdir'
import read from './read'
import write from './write'
import getSettings from './settings'
import rename from './rename'
import getConnection from './getConnection'
import saveConnection from './saveConnection'
import saveSettings from './saveSettings'
import duplicate from './duplicate'
import resolve  from './resolve'
import checkVer  from './checkVer'

export const commands = {
    connect,
    disconnect,
    getSettings,
    watch,
    unwatch,
    copy,
    duplicate,
    remove,
    clear,
    mkdir,
    read,
    write,
    rename,
    getConnection,
    saveConnection,
    saveSettings,
    resolve,
    checkVer
}

