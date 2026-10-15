export function redactPlugin(blockedKeys) {
    const blocked = new Set(blockedKeys);
    return {
        name: "redact",
        beforeTrack(event) {
            const properties = Object.fromEntries(Object.entries(event.properties).filter(([key]) => !blocked.has(key)));
            return { ...event, properties };
        },
    };
}
export function samplingPlugin(rates) {
    return {
        name: "sampling",
        beforeTrack(event) {
            const rate = rates[event.name] ?? 1;
            return Math.random() <= Math.max(0, Math.min(1, rate)) ? event : null;
        },
    };
}
//# sourceMappingURL=plugins.js.map