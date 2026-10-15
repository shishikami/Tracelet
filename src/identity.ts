import type { KeyValueStorage } from "./contracts.js";
import type { EventIdentity } from "./types.js";

function createId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export class IdentityManager {
  private readonly anonymousIdKey = "anonymous_id";
  private readonly userIdKey = "user_id";
  private readonly sessionIdKey = "session_id";

  constructor(private readonly storage: KeyValueStorage) {}

  current(): EventIdentity {
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

  identify(userId: string): void {
    this.storage.set(this.userIdKey, userId);
  }

  reset(): void {
    this.storage.remove(this.userIdKey);
    this.storage.set(this.anonymousIdKey, createId());
    this.storage.set(this.sessionIdKey, createId());
  }

  clear(): void {
    this.storage.remove(this.userIdKey);
    this.storage.remove(this.anonymousIdKey);
    this.storage.remove(this.sessionIdKey);
  }

  renewSession(): void {
    this.storage.set(this.sessionIdKey, createId());
  }
}

export { createId };
