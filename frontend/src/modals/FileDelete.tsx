import React, { useState, useEffect, useContext, useMemo } from "react"
import { Modal, ModalButtonID } from '../ui'
import { URI } from '../../../src/types'

interface Props {
    file: URI
}

export default function ({file}: Props) {
    const buttons = [
        {
            id: ModalButtonID.Cancel,
            label: 'Cancel'
        },
        {
            id: ModalButtonID.Ok,
            label: 'Move to Trash'
        } 
    ]
    return <>
        <Modal buttons={buttons}>
            <div>
                {/* {names.length > 1 ? 
                    `Are you sure you want to delete ${names.length} files/directories and their contents?` : 
                    `Are you sure you want to delete '${names[0]}'?`
                }
                You can restore ${names.length > 1 ? 'these files' : 'this file'} from the Trash. */}
            </div>
        </Modal>
    </>
}