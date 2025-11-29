import * as THREE from 'three';
import { animate, easeInOutSine, computeAttackContext } from './utils.js';

const RING_GEOMETRY = new THREE.TorusGeometry(1, 0.05, 8, 32);

function createRingMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0xff4d4d,
        emissive: 0xff4d4d,
        emissiveIntensity: 1.2,
        roughness: 0.4,
        metalness: 0.3
    });
}

export async function playFocusEnergy({ scene, attackerMesh }) {
    if (!scene || !attackerMesh) return;

    const { attackerPos } = computeAttackContext(attackerMesh, attackerMesh);
    attackerPos.y += 0.3;

    const rings = [0.9, 1.2, 1.5].map((scale) => {
        const ring = new THREE.Mesh(RING_GEOMETRY, createRingMaterial());
        ring.position.copy(attackerPos);
        ring.rotation.x = Math.PI / 2;
        ring.scale.setScalar(scale);
        scene.add(ring);
        return ring;
    });

    await animate(1000, ({ t }) => {
        rings.forEach((ring, idx) => {
            const phase = easeInOutSine((t + idx * 0.1) % 1);
            ring.scale.setScalar(0.9 + phase * 0.6);
            ring.position.y = attackerPos.y + Math.sin(phase * Math.PI * 2) * 0.25;
            ring.material.emissiveIntensity = 0.8 + phase * 0.7;
        });
    });

    rings.forEach((ring) => {
        scene.remove(ring);
        ring.geometry?.dispose?.();
        ring.material?.dispose?.();
    });
}
