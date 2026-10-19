import { inject, type App, type InjectionKey } from "vue";
import { analytics } from "./analytics.js";

export const traceletKey: InjectionKey<typeof analytics> = Symbol("tracelet");

/** Register once with app.use(traceletPlugin) before mounting the Vue app. */
export const traceletPlugin = {
  install(app: App): void {
    app.provide(traceletKey, analytics);
    void analytics.init();
  },
};

export function useTracelet() {
  const instance = inject(traceletKey);
  if (!instance) throw new Error("Tracelet plugin has not been installed");
  return instance;
}
