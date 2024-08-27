import connect from './connect'
import watch from './watch'
import unwatch from './unwatch'
import copy from './copy'
import remove from './remove'
import mkdir from './mkdir'
import write from './write'
import config from './config'

export const commands = {
    'connect': connect,
    'config': config,
    'watch': watch,
    'unwatch': unwatch,
    'copy': copy,
    'remove': remove,
    'mkdir': mkdir,
    'write': write
}

