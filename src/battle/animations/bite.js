import * as THREE from 'three';
import { animate, easeOutQuad, computeAttackContext } from './utils.js';

const JAW_GEOMETRY = new THREE.TorusGeometry(0.55, 0.12, 8, 24, Math.PI);

function createJawMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x2c3e50,
        metalness: 0.2,
        roughness: 0.6
    });
}

export async function playBite({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const { defenderPos } = computeAttackContext(attackerMesh, defenderMesh);
    defenderPos.y += 0.6;

    const upperJaw = new THREE.Mesh(JAW_GEOMETRY, createJawMaterial());
    const lowerJaw = new THREE.Mesh(JAW_GEOMETRY, createJawMaterial());
    upperJaw.position.copy(defenderPos);
    lowerJaw.position.copy(defenderPos);
    upperJaw.rotation.z = Math.PI;
    lowerJaw.rotation.x = Math.PI;
    scene.add(upperJaw);
    scene.add(lowerJaw);

    await animate(420, ({ t }) => {
        const closePhase = easeOutQuad(Math.min(1, t * 2));
        upperJaw.rotation.x = -closePhase * 0.9;
        lowerJaw.rotation.x = Math.PI + closePhase * 0.9;
        const jitter = (Math.random() - 0.5) * 0.02;
        upperJaw.position.y = defenderPos.y + jitter;
        lowerJaw.position.y = defenderPos.y - jitter;
    });

    scene.remove(upperJaw);
    scene.remove(lowerJaw);
    upperJaw.geometry?.dispose?.();
    lowerJaw.geometry?.dispose?.();
    upperJaw.material?.dispose?.();
    lowerJaw.material?.dispose?.();
}
