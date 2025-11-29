import * as THREE from 'three';
import { animate, easeInOutSine, computeAttackContext } from './utils.js';

const SPIRAL_GEOMETRY = new THREE.RingGeometry(0.15, 0.9, 64, 1);

function createSpiralMaterial() {
    return new THREE.MeshBasicMaterial({
        color: 0x99ccff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
    });
}

export async function playHypnosis({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const { defenderPos } = computeAttackContext(attackerMesh, defenderMesh);
    defenderPos.y += 0.6;

    const spiral = new THREE.Mesh(SPIRAL_GEOMETRY, createSpiralMaterial());
    spiral.position.copy(defenderPos);
    spiral.rotation.x = Math.PI / 2;
    scene.add(spiral);

    await animate(1200, ({ t }) => {
        const phase = easeInOutSine(t);
        spiral.rotation.z += 0.08;
        spiral.scale.setScalar(0.8 + phase * 0.8);
        spiral.material.opacity = 0.85 * (1 - phase);
        defenderMesh.rotation.z = Math.sin(t * Math.PI * 2) * 0.08;
    });

    defenderMesh.rotation.z = 0;
    scene.remove(spiral);
    spiral.geometry?.dispose?.();
    spiral.material?.dispose?.();
}
