import * as THREE from 'three';
import { animate, easeOutQuad, computeAttackContext } from './utils.js';

const PUFF_GEOMETRY = new THREE.SphereGeometry(0.2, 16, 16);

function createPuffMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 0.7
    });
}

export async function playSmokescreen({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const { defenderPos } = computeAttackContext(attackerMesh, defenderMesh);
    defenderPos.y += 0.2;

    const puffs = [];
    for (let i = 0; i < 12; i += 1) {
        const puff = new THREE.Mesh(PUFF_GEOMETRY, createPuffMaterial());
        puff.position.set(
            defenderPos.x + (Math.random() - 0.5) * 0.5,
            defenderPos.y + Math.random() * 0.6,
            defenderPos.z + (Math.random() - 0.5) * 0.5
        );
        scene.add(puff);
        puffs.push({ mesh: puff, rise: Math.random() * 0.4 + 0.2, spread: Math.random() * 0.4 });
    }

    await animate(900, ({ t }) => {
        puffs.forEach((puff) => {
            puff.mesh.position.y += puff.rise * 0.01;
            puff.mesh.scale.setScalar(1 + t * 0.8 + puff.spread);
            puff.mesh.material.opacity = Math.max(0, 0.7 * (1 - easeOutQuad(t)));
        });
    });

    puffs.forEach(({ mesh }) => {
        scene.remove(mesh);
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
    });
}
