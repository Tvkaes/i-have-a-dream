import * as THREE from 'three';
import { animate, easeOutQuad, computeAttackContext } from './utils.js';

const CLONE_COUNT = 5;

export async function playDoubleTeam({ scene, attackerMesh }) {
    if (!scene || !attackerMesh) return;

    const { attackerPos, direction } = computeAttackContext(attackerMesh, attackerMesh);
    const clones = [];

    for (let i = 0; i < CLONE_COUNT; i += 1) {
        const clone = attackerMesh.clone();
        clone.material = attackerMesh.material.clone();
        clone.material.transparent = true;
        clone.material.opacity = 0;
        clone.renderOrder = attackerMesh.renderOrder - 1;
        scene.add(clone);
        clones.push({ clone, offset: (i - (CLONE_COUNT - 1) / 2) * 0.5 });
    }

    await animate(800, ({ t }) => {
        const phase = easeOutQuad(Math.min(1, t * 1.2));
        clones.forEach(({ clone, offset }, idx) => {
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
            clone.position.copy(attackerPos)
                .add(perpendicular.clone().multiplyScalar(offset * phase))
                .add(direction.clone().multiplyScalar(Math.sin((t + idx * 0.1) * Math.PI) * 0.2));
            clone.material.opacity = phase * 0.5 * (1 - idx * 0.05);
            clone.scale.setScalar(1 - phase * 0.2);
        });
    });

    clones.forEach(({ clone }) => {
        scene.remove(clone);
        clone.geometry?.dispose?.();
        clone.material?.dispose?.();
    });
}
