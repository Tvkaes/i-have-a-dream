import { loadWorld as performWorldLoad } from './scenes.js';

const listeners = {
    beforeTransition: new Set(),
    afterTransition: new Set()
};

let activeTransition = null;

export function onBeforeTransition(handler) {
    if (typeof handler !== 'function') return () => {};
    listeners.beforeTransition.add(handler);
    return () => listeners.beforeTransition.delete(handler);
}

export function onAfterTransition(handler) {
    if (typeof handler !== 'function') return () => {};
    listeners.afterTransition.add(handler);
    return () => listeners.afterTransition.delete(handler);
}

function emit(type, payload) {
    listeners[type]?.forEach((handler) => {
        try {
            handler(payload);
        } catch (err) {
            console.warn(`[transitionService] Error in ${type} handler`, err);
        }
    });
}

export function transitionTo({ worldId, scene, player, physics, returnPos = null, onComplete = null, reason = 'unknown' }) {
    if (!worldId || !scene || !player) {
        console.warn('[transitionService] Missing required parameters');
        return;
    }

    const transitionPayload = {
        worldId,
        reason,
        scene,
        player,
        physics,
        returnPos,
        startedAt: performance.now()
    };

    activeTransition = transitionPayload;
    emit('beforeTransition', transitionPayload);

    const finalize = () => {
        const duration = performance.now() - transitionPayload.startedAt;
        activeTransition = null;
        emit('afterTransition', { ...transitionPayload, duration });
        onComplete?.();
    };

    performWorldLoad(worldId, scene, player, finalize, returnPos, physics);
}

export function getActiveTransition() {
    return activeTransition;
}
