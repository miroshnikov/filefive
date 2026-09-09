import React, { useState, useEffect, useRef, JSX, Dispatch, SetStateAction } from "react"
import { basename, dirname } from '../../utils/path'
import { createURI } from '../../shared/utils/URI'
import { 
    LocalFileSystemID, 
    MirrorSettings, 
    MirrorEventType,
    FilterSettings
} from '../../shared/types'
import { ConnectionInfo } from './Workspace'
import { command$ } from '../../observables/command'
import { CommandID } from '../../commands'
import { useEffectOnUpdate, useSubscribe } from '../../hooks'
import { remove } from 'ramda'
import MissingDir from './MissingDir'
import { Spinner, Split } from '../../ui/components'
import CreateMirrorSync, { MirrorConf } from '../../plugins/mirror/Create/Create'
import MirrorsList from '../../plugins/mirror/List/List'
import { events$ } from '../../plugins/mirror/events'


interface Props {
    localPath: string
    remotePath: string
    connection: ConnectionInfo | undefined
    onSettingsChange: (mirrors: MirrorSettings[]) => void
    sid: string | undefined
    missingTarget: "local" | "remote" | undefined
    setMissingTarget: Dispatch<SetStateAction<"local" | "remote" | undefined>>
    tryDir: string
    setSync: (sync: boolean) => void
    filter?: FilterSettings
    children: JSX.Element
}

export default function LocalPane({
    localPath,
    remotePath,
    connection,
    onSettingsChange,
    sid,
    missingTarget,
    setMissingTarget,
    tryDir,
    setSync,
    filter,
    children
}: Props) {

    const [showCreateMirrorSync, setShowCreateMirrorSync] = useState(false)

    const [mirrors, setMirrors] = useState<(MirrorSettings & { id: string })[]>([])

    const mirrorsChanged = useRef(false)

    useSubscribe(() => 
        command$.subscribe(cmd => {
            switch (cmd.id) {
                case CommandID.MirrorSync:
                    setShowCreateMirrorSync(true)
                    break
            }
        }),
        [localPath, remotePath]
    )

    useEffect(() => {
        setMirrors([])
    }, [connection?.id])

    useSubscribe(() => 
        events$
            .subscribe(event => {
                if (event.type == MirrorEventType.Create
                        && event.sid == sid) {
                    setMirrors(mirrors => [
                        ...mirrors, 
                        { 
                            id: event.id,
                            local: event.setting.local, 
                            remote: event.setting.remote,
                            recursive: event.setting.recursive, 
                            del: event.setting.del, 
                            filter: event.setting.filter
                        }
                    ])
                }
            }),
        [sid]
    )

    useEffectOnUpdate(() => {
        if (mirrorsChanged.current == true) {
            mirrorsChanged.current = false
            if (sid && connection?.file) {
                onSettingsChange(mirrors)
            }
        }
    }, [mirrors]) 

    const createMirror = (conf: MirrorConf) => {
        if (!connection?.id || !sid) {
            return
        }
        const remote = createURI(connection.id, remotePath)
        window.f5.mirror(
            localPath, 
            remote,
            sid,
            conf.recursive,
            conf.del,
            (filter 
                && (
                    filter.text.trim().length > 0 
                    || filter.uncommited === true
                    || filter.ignored === true
                )
            ) ? filter : undefined
        )
        mirrorsChanged.current = true
    }

    const onMirrorDelete = (id: string) => {
        const i = mirrors.findIndex(m => m.id == id)
        if (i >= 0) {
            setMirrors(remove(i, 1, mirrors))
            window.f5.unmirror(id)
            mirrorsChanged.current = true
        }
    }

    const inner = connection?.id && mirrors.length
        ?   <Split 
                vertical={true} 
                initial={80} 
                left={children} 
                right=<MirrorsList mirrors={mirrors} onDelete={onMirrorDelete} />
            />
        :   children

    return localPath 
        ? (
            missingTarget == 'local' 
                ?   <MissingDir 
                        path={localPath}
                        onClose={async (create) => {
                            if (create) {
                                await window.f5.mkdir(basename(tryDir), createURI(LocalFileSystemID, dirname(tryDir)))
                                setMissingTarget(undefined)
                            } else {
                                setMissingTarget(undefined)
                                setSync(false)
                            }
                        }}
                    /> 
                :   <>
                        {inner}
                        {showCreateMirrorSync && 
                            <CreateMirrorSync
                                localPath={localPath}
                                remotePath={remotePath}
                                filter={filter}
                                onClose={conf => {
                                    setShowCreateMirrorSync(false)
                                    conf && createMirror(conf)
                                }}
                            />
                        }
                    </>
        ) 
        :   <div className="fill-center">
                <Spinner radius="2em" />
            </div>
}