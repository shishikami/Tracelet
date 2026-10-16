import type { AnalyticsPlugin, PluginContext } from "./contracts.js";
import type { EventProperties } from "./types.js";

export interface AutoCapturePageViewOptions {
  /** Capture the page that is open when the SDK initializes. Defaults to true. */
  initial?: boolean;
  /** Include URL fragments and capture hashchange navigation. Defaults to false. */
  includeHash?: boolean;
}

export interface AutoCaptureErrorOptions {
  /** Include JavaScript stack traces. Disabled by default because stacks may contain sensitive data. */
  includeStack?: boolean;
}

export interface AutoCaptureOptions {
  /** Capture initial loads, History API, popstate, and optionally hashchange navigation. */
  pageViews?: boolean | AutoCapturePageViewOptions;
  /** Capture window error and unhandledrejection events. */
  errors?: boolean | AutoCaptureErrorOptions;
}

type NavigationTrigger = "initial" | "pushState" | "replaceState" | "popstate" | "hashchange";

const NAVIGATION_EVENT = "tracelet:navigation";

function currentPath(includeHash: boolean): string {
  if (!globalThis.location) return "";
  return `${globalThis.location.pathname}${includeHash ? globalThis.location.hash : ""}`;
}

function pageName(): string {
  return globalThis.document?.title || globalThis.location?.pathname || "page";
}

function errorProperties(error: unknown, includeStack: boolean): EventProperties {
  if (error instanceof Error) {
    return {
      errorType: error.name || "Error",
      message: error.message || "Unknown error",
      ...(includeStack && error.stack ? { stack: error.stack } : {}),
    };
  }

  // Arbitrary rejection values are deliberately converted to a generic value;
  // serializing objects could leak request payloads, tokens, or user input.
  return {
    errorType: typeof error,
    message: typeof error === "string" ? error : "Unhandled rejection",
  };
}

/**
 * Capture stable browser lifecycle signals without inspecting the DOM.
 *
 * The plugin never reads form values, element text, or data attributes. All
 * generated events still pass through consent, user plugins, and local storage.
 */
export function createAutoCapturePlugin(options: AutoCaptureOptions = {}): AnalyticsPlugin {
  const capturePageViews = options.pageViews !== false && options.pageViews !== undefined;
  const captureErrors = options.errors !== false && options.errors !== undefined;
  const pageViewOptions = typeof options.pageViews === "object" ? options.pageViews : {};
  const errorOptions = typeof options.errors === "object" ? options.errors : {};
  const cleanups: Array<() => void> = [];
  let context: PluginContext | undefined;
  let lastPath = "";

  const capturePage = async (trigger: NavigationTrigger) => {
    if (!context) return;
    const path = currentPath(pageViewOptions.includeHash === true);
    if (trigger !== "initial" && path === lastPath) return;
    const previousPath = lastPath;
    lastPath = path;
    await context.page(pageName(), {
      trigger,
      path,
      ...(previousPath ? { previousPath } : {}),
    });
  };

  const listen = <K extends keyof WindowEventMap>(
    type: K,
    listener: (event: WindowEventMap[K]) => void,
  ) => {
    globalThis.addEventListener?.(type, listener as EventListener);
    cleanups.push(() => globalThis.removeEventListener?.(type, listener as EventListener));
  };

  return {
    name: "autocapture",
    setup(pluginContext) {
      context = pluginContext;

      if (capturePageViews && globalThis.location) {
        lastPath = currentPath(pageViewOptions.includeHash === true);
        const history = globalThis.history;
        if (history) {
          const originalPushState = history.pushState;
          const originalReplaceState = history.replaceState;

          const wrapHistory = (method: "pushState" | "replaceState", original: History[typeof method]) =>
            function (this: History, ...args: Parameters<History[typeof method]>) {
              const result = original.apply(this, args);
              globalThis.dispatchEvent?.(new CustomEvent(NAVIGATION_EVENT, { detail: method }));
              return result;
            };

          const wrappedPushState = wrapHistory("pushState", originalPushState);
          const wrappedReplaceState = wrapHistory("replaceState", originalReplaceState);
          history.pushState = wrappedPushState;
          history.replaceState = wrappedReplaceState;
          cleanups.push(() => {
            // Do not overwrite another library that wrapped History after us.
            if (history.pushState === wrappedPushState) history.pushState = originalPushState;
            if (history.replaceState === wrappedReplaceState) history.replaceState = originalReplaceState;
          });
        }

        listen("popstate", () => void capturePage("popstate"));
        if (pageViewOptions.includeHash === true) {
          listen("hashchange", () => void capturePage("hashchange"));
        }
        listen(NAVIGATION_EVENT as keyof WindowEventMap, (event) => {
          const trigger = (event as CustomEvent<NavigationTrigger>).detail;
          void capturePage(trigger);
        });

        if (pageViewOptions.initial !== false) void capturePage("initial");
      }

      if (captureErrors) {
        listen("error", (event) => {
          const properties = event instanceof ErrorEvent
            ? {
                ...errorProperties(event.error ?? event.message, errorOptions.includeStack === true),
                ...(event.filename ? { filename: event.filename.split(/[?#]/, 1)[0] } : {}),
                ...(event.lineno ? { line: event.lineno } : {}),
                ...(event.colno ? { column: event.colno } : {}),
              }
            : errorProperties(event, errorOptions.includeStack === true);
          void context?.track("$error", properties);
        });
        listen("unhandledrejection", (event) => {
          void context?.track("$unhandled_rejection", {
            ...errorProperties(event.reason, errorOptions.includeStack === true),
          });
        });
      }
    },
    teardown() {
      for (const cleanup of cleanups.splice(0).reverse()) cleanup();
      context = undefined;
    },
  };
}
