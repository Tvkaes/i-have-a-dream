import * as THREE from 'three';
import { animate, easeOutQuad, computeAttackContext } from './utils.js';

const SCRATCH_GEOMETRY = new THREE.PlaneGeometry(0.05, 0.8);

function createScratchMaterial() {
    return new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
}

export async function playScratch({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;
    const { defenderPos } = computeAttackContext(attackerMesh, defenderMesh);
    defenderPos.y += 0.5;

    const scratches = [];
    for (let i = 0; i < 3; i += 1) {
        const scratch = new THREE.Mesh(SCRATCH_GEOMETRY, createScratchMaterial());
        scratch.position.copy(defenderPos).add(new THREE.Vector3((i - 1) * 0.1, (i - 1) * 0.05, 0));
        scratch.rotation.y = Math.random() * Math.PI;
        scratch.rotation.x = -Math.PI / 2;
        scene.add(scratch);
        scratches.push(scratch);
    }

    await animate(350, ({ t }) => {
        scratches.forEach((scratch, index) => {
            const phase = easeOutQuad(Math.min(1, (t * 1.5) - index * 0.1));
            scratch.material.opacity = Math.max(0, 0.9 - phase);
            scratch.scale.set(1, 1 + phase * 0.8, 1);
        });
    });

    scratches.forEach((scratch) => {
        scene.remove(scratch);
        scratch.geometry?.dispose?.();
        scratch.material?.dispose?.();
    });
}
