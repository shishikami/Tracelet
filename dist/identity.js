function createId() {
    if (globalThis.crypto?.randomUUID)
        return globalThis.crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
export class IdentityManager {
    storage;
    anonymousIdKey = "anonymous_id";
    userIdKey = "user_id";
    sessionIdKey = "session_id";
    constructor(storage) {
        this.storage = storage;
    }
    current() {
        let anonymousId = this.storage.get(this.anonymousIdKey);
        let sessionId = this.storage.get(this.sessionIdKey);
        if (!anonymousId) {
            anonymousId = createId();
            this.storage.set(this.anonymousIdKey, anonymousId);
        }
        if (!sessionId) {
            sessionId = createId();
            this.storage.set(this.sessionIdKey, sessionId);
        }
        const userId = this.storage.get(this.userIdKey);
        return userId ? { anonymousId, sessionId, userId } : { anonymousId, sessionId };
    }
    identify(userId) {
        this.storage.set(this.userIdKey, userId);
    }
    reset() {
        this.storage.remove(this.userIdKey);
        this.storage.set(this.anonymousIdKey, createId());
        this.storage.set(this.sessionIdKey, createId());
    }
    clear() {
        this.storage.remove(this.userIdKey);
        this.storage.remove(this.anonymousIdKey);
        this.storage.remove(this.sessionIdKey);
    }
    renewSession() {
        this.storage.set(this.sessionIdKey, createId());
    }
}
export { createId };
//# sourceMappingURL=identity.js.map