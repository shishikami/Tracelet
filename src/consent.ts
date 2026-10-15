export type ConsentState = "pending" | "granted" | "denied";

export class ConsentManager {
  constructor(private state: ConsentState = "granted") {}

  get(): ConsentState {
    return this.state;
  }

  set(state: ConsentState): void {
    this.state = state;
  }

  canCollect(): boolean {
    return this.state === "granted";
  }
}
