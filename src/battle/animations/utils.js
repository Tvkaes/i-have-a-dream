import * as THREE from 'three';

const TMP_FROM = new THREE.Vector3();
const TMP_TO = new THREE.Vector3();
const TMP_DIR = new THREE.Vector3(1, 0, 0);

export function animate(durationMs, update) {
    if (typeof update !== 'function') return Promise.resolve();
    return new Promise((resolve) => {
        const clampedDuration = Math.max(16, durationMs);
        let startTime = null;
        let lastTime = null;

        function step(now) {
            if (startTime === null) {
                startTime = now;
                lastTime = now;
            }
            const elapsed = now - startTime;
            const delta = now - lastTime;
            lastTime = now;
            const t = Math.min(1, elapsed / clampedDuration);
            try {
                update({ t, elapsed, delta });
            } catch (error) {
                console.warn('[battle] Error en animación', error);
            }
            if (elapsed < clampedDuration) {
                requestAnimationFrame(step);
            } else {
                resolve();
            }
        }

        requestAnimationFrame(step);
    });
}

export function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
}

export function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

export function getMeshWorldPosition(mesh, target = new THREE.Vector3()) {
    if (!mesh) {
        target.set(0, 0, 0);
        return target;
    }
    if (mesh.isSprite) {
        target.copy(mesh.position);
        return target;
    }
    return target.copy(mesh.position);
}

export function computeAttackContext(attackerMesh, defenderMesh) {
    const attackerPos = getMeshWorldPosition(attackerMesh, TMP_FROM).clone();
    const defenderPos = getMeshWorldPosition(defenderMesh, TMP_TO).clone();
    attackerPos.y = attackerPos.y || 0;
    defenderPos.y = defenderPos.y || 0;
    const direction = TMP_DIR.copy(defenderPos).sub(attackerPos);
    const distance = direction.length();
    if (distance > 1e-4) {
        direction.divideScalar(distance);
    } else {
        direction.set(1, 0, 0);
    }
    direction.y = 0;
    return {
        attackerPos,
        defenderPos,
        direction: direction.clone(),
        distance
    };
}
