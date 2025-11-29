import * as THREE from 'three';
import { animate, easeInOutSine, computeAttackContext } from './utils.js';

const ARC_SEGMENTS = 24;

function createArcGeometry(radius) {
    const points = [];
    for (let i = 0; i <= ARC_SEGMENTS; i += 1) {
        const angle = (i / ARC_SEGMENTS) * Math.PI * 2;
        const jitter = (Math.random() - 0.5) * 0.05;
        points.push(new THREE.Vector3(Math.cos(angle) * (radius + jitter), Math.sin(angle) * (radius + jitter), 0));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
}

function createArcMaterial() {
    return new THREE.LineBasicMaterial({
        color: 0xffff99,
        transparent: true,
        opacity: 0.85
    });
}

export async function playThunderWave({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const { defenderPos } = computeAttackContext(attackerMesh, defenderMesh);
    defenderPos.y += 0.5;

    const rings = [0.4, 0.55, 0.7].map((radius) => {
        const geometry = createArcGeometry(radius);
        const material = createArcMaterial();
        const line = new THREE.LineLoop(geometry, material);
        line.position.copy(defenderPos);
        scene.add(line);
        return line;
    });

    await animate(900, ({ t }) => {
        rings.forEach((ring, idx) => {
            const phase = easeInOutSine((t + idx * 0.15) % 1);
            ring.rotation.z += 0.04 + idx * 0.01;
            ring.material.opacity = 0.85 * (1 - t) + 0.15 * phase;
            ring.scale.setScalar(1 + phase * 0.3);
        });
    });

    rings.forEach((ring) => {
        scene.remove(ring);
        ring.geometry?.dispose?.();
        ring.material?.dispose?.();
    });
}
