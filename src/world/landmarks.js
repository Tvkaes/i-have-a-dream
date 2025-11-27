import * as THREE from 'three';

const landmarks = new Map();

export function setLandmark(id, { position = null, meta = {} } = {}) {
    if (!id) return;
    const safePosition = position?.clone?.() ?? new THREE.Vector3(
        position?.x ?? 0,
        position?.y ?? 0,
        position?.z ?? 0
    );
    landmarks.set(id, {
        position: safePosition,
        meta: { ...meta }
    });
}

export function getLandmark(id) {
    const record = landmarks.get(id);
    if (!record) return null;
    return {
        position: record.position.clone(),
        meta: { ...record.meta }
    };
}

export function clearLandmarks() {
    landmarks.clear();
}
