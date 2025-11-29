import * as THREE from 'three';
import { animate, easeOutQuad, computeAttackContext } from './utils.js';

const PARTICLE_GEOMETRY = new THREE.SphereGeometry(0.04, 6, 6);

function createSandMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0xc2a070,
        roughness: 0.9,
        metalness: 0.05,
        transparent: true,
        opacity: 0.9
    });
}

export async function playSandAttack({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;
    const { attackerPos, defenderPos } = computeAttackContext(attackerMesh, defenderMesh);
    attackerPos.y += 0.2;
    defenderPos.y += 0.5;

    const particles = [];
    for (let i = 0; i < 35; i += 1) {
        const particle = new THREE.Mesh(PARTICLE_GEOMETRY, createSandMaterial());
        particle.position.copy(attackerPos);
        scene.add(particle);
        particles.push({
            mesh: particle,
            delay: i * 0.01,
            jitter: new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.2, (Math.random() - 0.5) * 0.6)
        });
    }

    await animate(750, ({ t }) => {
        particles.forEach((particle) => {
            const localT = Math.min(1, Math.max(0, (t - particle.delay) / (1 - particle.delay)));
            if (localT <= 0) return;
            const eased = easeOutQuad(localT);
            particle.mesh.position.lerpVectors(attackerPos, defenderPos, eased);
            particle.mesh.position.add(particle.jitter.clone().multiplyScalar(1 - eased));
            particle.mesh.material.opacity = 0.9 * (1 - eased);
        });
    });

    particles.forEach(({ mesh }) => {
        scene.remove(mesh);
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
    });
}
