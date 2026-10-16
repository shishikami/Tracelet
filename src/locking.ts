export interface DeliveryLock {
  runExclusive(task: () => Promise<void>): Promise<boolean>;
}

/**
 * Coordinates delivery between tabs with the browser Web Locks API.
 * Environments without Web Locks keep the existing single-context behavior.
 */
export class BrowserDeliveryLock implements DeliveryLock {
  constructor(private readonly name: string) {}

  async runExclusive(task: () => Promise<void>): Promise<boolean> {
    const locks = globalThis.navigator?.locks;
    if (!locks) {
      await task();
      return true;
    }

    return locks.request(
      this.name,
      { mode: "exclusive", ifAvailable: true },
      async (lock) => {
        if (!lock) return false;
        await task();
        return true;
      },
    );
  }
}
