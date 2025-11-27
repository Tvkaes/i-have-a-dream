const listeners = new Map();

const flagValues = {
    isBattleActive: false
};

function emit(key, value, previous) {
    const handlers = listeners.get(key);
    if (!handlers) return;
    handlers.forEach((handler) => {
        try {
            handler(value, previous);
        } catch (error) {
            console.warn(`[gameFlags] listener for "${key}" failed`, error);
        }
    });
}

export function getFlag(key) {
    if (!(key in flagValues)) return undefined;
    return flagValues[key];
}

export function setFlag(key, value) {
    if (!(key in flagValues)) {
        console.warn(`[gameFlags] Flag "${key}" no está definido.`);
        return undefined;
    }
    const normalized = Boolean(value);
    const previous = flagValues[key];
    if (normalized === previous) return normalized;
    flagValues[key] = normalized;
    emit(key, normalized, previous);
    return normalized;
}

export function onFlagChange(key, handler) {
    if (typeof handler !== 'function') return () => {};
    if (!listeners.has(key)) {
        listeners.set(key, new Set());
    }
    const handlers = listeners.get(key);
    handlers.add(handler);
    return () => handlers.delete(handler);
}

export function getAllFlags() {
    return { ...flagValues };
}

export function resetFlags() {
    Object.keys(flagValues).forEach((key) => {
        flagValues[key] = false;
    });
    listeners.forEach((handlers, key) => {
        if (flagValues[key] !== undefined) {
            emit(key, flagValues[key], undefined);
        }
    });
}
