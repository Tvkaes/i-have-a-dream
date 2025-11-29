import * as THREE from 'three';
import { animate, easeOutQuad, computeAttackContext } from './utils.js';

const PARTICLE_GEOMETRY = new THREE.SphereGeometry(0.06, 8, 8);

function createParticleMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x9b59b6,
        transparent: true,
        opacity: 0.8,
        emissive: 0x2d1433,
        emissiveIntensity: 0.4
    });
}

export async function playPoisonPowder({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const { attackerPos, defenderPos } = computeAttackContext(attackerMesh, defenderMesh);
    attackerPos.y += 0.4;
    defenderPos.y += 0.6;

    const particles = [];
    for (let i = 0; i < 45; i += 1) {
        const mesh = new THREE.Mesh(PARTICLE_GEOMETRY, createParticleMaterial());
        mesh.position.copy(attackerPos);
        scene.add(mesh);
        particles.push({
            mesh,
            delay: Math.random() * 0.35,
            sway: (Math.random() - 0.5) * 0.6,
            lift: Math.random() * 0.4
        });
    }

    await animate(1100, ({ t }) => {
        particles.forEach((particle) => {
            const localT = Math.min(1, Math.max(0, (t - particle.delay) / (1 - particle.delay)));
            if (localT <= 0) return;
            const eased = easeOutQuad(localT);
            particle.mesh.position.lerpVectors(attackerPos, defenderPos, eased);
            particle.mesh.position.y += Math.sin(eased * Math.PI) * particle.lift;
            particle.mesh.position.x += Math.sin(eased * Math.PI * 2) * particle.sway * 0.5;
            particle.mesh.material.opacity = Math.max(0, 0.8 - eased);
            particle.mesh.scale.setScalar(1 + eased * 0.6);
        });
    });

    particles.forEach(({ mesh }) => {
        scene.remove(mesh);
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
    });
}
