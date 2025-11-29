import * as THREE from 'three';
import { animate, easeOutCubic, computeAttackContext } from './utils.js';

const PARTICLE_GEOMETRY = new THREE.PlaneGeometry(0.25, 0.1);

function createParticleMaterial() {
    return new THREE.MeshBasicMaterial({
        color: 0xd7f0ff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
}

export async function playGust({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const { attackerPos, defenderPos, direction } = computeAttackContext(attackerMesh, defenderMesh);
    attackerPos.y += 0.6;
    defenderPos.y += 0.6;
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);

    const particles = [];
    for (let i = 0; i < 30; i += 1) {
        const mesh = new THREE.Mesh(PARTICLE_GEOMETRY, createParticleMaterial());
        mesh.position.copy(attackerPos);
        mesh.rotation.y = Math.random() * Math.PI;
        scene.add(mesh);
        particles.push({
            mesh,
            delay: Math.random() * 0.3,
            swirl: (Math.random() - 0.5) * 0.8,
            lift: Math.random() * 0.3
        });
    }

    await animate(900, ({ t }) => {
        particles.forEach((particle) => {
            const localT = Math.min(1, Math.max(0, (t - particle.delay) / (1 - particle.delay)));
            if (localT <= 0) return;
            const eased = easeOutCubic(localT);
            particle.mesh.position.lerpVectors(attackerPos, defenderPos, eased);
            particle.mesh.position.y += Math.sin(eased * Math.PI * 2) * particle.lift;
            particle.mesh.position.add(perpendicular.clone().multiplyScalar(Math.sin(eased * Math.PI * 4) * particle.swirl));
            particle.mesh.material.opacity = 0.7 * (1 - eased);
        });
    });

    particles.forEach(({ mesh }) => {
        scene.remove(mesh);
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
    });
}
