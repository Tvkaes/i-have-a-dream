import * as THREE from 'three';
import { animate, easeInOutSine, computeAttackContext } from './utils.js';

const SPARKLE_GEOMETRY = new THREE.SphereGeometry(0.08, 8, 8);

function createSparkleMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0xfff59d,
        emissive: 0xfff59d,
        emissiveIntensity: 1.3,
        roughness: 0.3,
        metalness: 0.1
    });
}

export async function playSynthesis({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh) return;

    const { attackerPos } = computeAttackContext(attackerMesh, defenderMesh ?? attackerMesh);
    attackerPos.y += 0.4;

    const sparkles = [];
    const count = 26;
    for (let i = 0; i < count; i += 1) {
        const mesh = new THREE.Mesh(SPARKLE_GEOMETRY, createSparkleMaterial());
        const angle = (i / count) * Math.PI * 2;
        const radius = 1.8 + Math.random() * 0.6;
        mesh.position.set(
            attackerPos.x + Math.cos(angle) * radius,
            attackerPos.y + Math.random() * 1.2,
            attackerPos.z + Math.sin(angle) * radius
        );
        scene.add(mesh);
        sparkles.push({ mesh, angle, radius });
    }

    await animate(1000, ({ t }) => {
        sparkles.forEach((sparkle, idx) => {
            sparkle.radius = 1.8 * (1 - t) + 0.2;
            sparkle.angle += 0.12 + idx * 0.0005;
            const spiral = easeInOutSine(t);
            sparkle.mesh.position.set(
                attackerPos.x + Math.cos(sparkle.angle) * sparkle.radius,
                attackerPos.y + Math.sin(spiral * Math.PI) * 0.8 + 0.3,
                attackerPos.z + Math.sin(sparkle.angle) * sparkle.radius
            );
            sparkle.mesh.material.opacity = 1 - t;
            sparkle.mesh.scale.setScalar(1 - t * 0.7);
        });
    });

    sparkles.forEach(({ mesh }) => {
        scene.remove(mesh);
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
    });
}
