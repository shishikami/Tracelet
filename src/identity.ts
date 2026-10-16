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
  private readonly sessionActivityKey = "session_activity";

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly sessionTimeoutMs = 30 * 60 * 1_000,
    private readonly now: () => number = Date.now,
  ) {}

  current(): EventIdentity {
    let anonymousId = this.storage.get(this.anonymousIdKey);
    let sessionId = this.storage.get(this.sessionIdKey);
    const now = this.now();
    const lastActivity = Number(this.storage.get(this.sessionActivityKey));
    const sessionExpired = !Number.isFinite(lastActivity) || now - lastActivity >= this.sessionTimeoutMs;

    if (!anonymousId) {
      anonymousId = createId();
      this.storage.set(this.anonymousIdKey, anonymousId);
    }
    if (!sessionId || sessionExpired) {
      sessionId = createId();
      this.storage.set(this.sessionIdKey, sessionId);
    }
    this.storage.set(this.sessionActivityKey, String(now));

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
    this.storage.set(this.sessionActivityKey, String(this.now()));
  }

  clear(): void {
    this.storage.remove(this.userIdKey);
    this.storage.remove(this.anonymousIdKey);
    this.storage.remove(this.sessionIdKey);
    this.storage.remove(this.sessionActivityKey);
  }

  renewSession(): void {
    this.storage.set(this.sessionIdKey, createId());
    this.storage.set(this.sessionActivityKey, String(this.now()));
  }
}

export { createId };
