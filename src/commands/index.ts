import connect from './connect'
import copy from './copy'
import remove from './remove'
import mkdir from './mkdir'
import write from './write'
import config from './config'

export const commands = {
    'connect': connect,
    'config': config,
    'copy': copy,
    'remove': remove,
    'mkdir': mkdir,
    'write': write
}

