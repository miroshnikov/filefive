import { QueueAction } from './types'

export interface SessionSettings {
    action?: QueueAction
}

export default class Session {
    public static create(): string {
        const sid = crypto.randomUUID()
        this.sessions.set(sid, {})
        return sid
    }

    public static remove(sid: string) {
        this.sessions.delete(sid)
    }

    public static get(sid: string): SessionSettings|undefined {
        return this.sessions.get(sid)
    }

    public static set(sid: string, settings: Partial<SessionSettings>) {
        const s = this.sessions.get(sid)
        s && this.sessions.set(sid, Object.assign(s, settings))
    }

    private static sessions = new Map<string, Session>()
}
