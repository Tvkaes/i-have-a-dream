import * as THREE from 'three';
import { animate, easeOutCubic, computeAttackContext } from './utils.js';

const FIRE_GEOMETRY = new THREE.SphereGeometry(0.08, 12, 12);

function createFireMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0xff8c42,
        emissive: 0xff5c1c,
        emissiveIntensity: 1,
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity: 0.95
    });
}

export async function playEmber({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;
    const { attackerPos, defenderPos } = computeAttackContext(attackerMesh, defenderMesh);
    attackerPos.y += 0.5;
    defenderPos.y += 0.5;

    const embers = [];
    for (let i = 0; i < 15; i += 1) {
        const mesh = new THREE.Mesh(FIRE_GEOMETRY, createFireMaterial());
        mesh.position.copy(attackerPos);
        scene.add(mesh);
        embers.push({ mesh, sway: (Math.random() - 0.5) * 0.4, delay: i * 0.02 });
    }

    await animate(800, ({ t }) => {
        embers.forEach((ember) => {
            const localT = Math.min(1, Math.max(0, (t - ember.delay) / (1 - ember.delay)));
            if (localT <= 0) return;
            const eased = easeOutCubic(localT);
            ember.mesh.position.lerpVectors(attackerPos, defenderPos, eased);
            ember.mesh.position.y += Math.sin(eased * Math.PI * 2) * 0.2;
            ember.mesh.position.x += Math.sin(eased * Math.PI) * ember.sway;
            ember.mesh.scale.setScalar(1 + eased * 0.6);
            ember.mesh.material.opacity = 0.95 * (1 - eased) + 0.1;
        });
    });

    embers.forEach(({ mesh }) => {
        scene.remove(mesh);
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
    });
}
