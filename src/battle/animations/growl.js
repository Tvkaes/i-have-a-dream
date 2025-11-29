import * as THREE from 'three';
import { animate, easeOutQuad, computeAttackContext } from './utils.js';

const WAVE_GEOMETRY = new THREE.RingGeometry(0.4, 0.6, 32);

function createWaveMaterial() {
    return new THREE.MeshBasicMaterial({
        color: 0xffd966,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
}

export async function playGrowl({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const { attackerPos } = computeAttackContext(attackerMesh, defenderMesh);
    attackerPos.y += 0.4;

    const waves = [];
    for (let i = 0; i < 3; i += 1) {
        const wave = new THREE.Mesh(WAVE_GEOMETRY, createWaveMaterial());
        wave.position.copy(attackerPos);
        wave.rotation.x = Math.PI / 2;
        wave.material.opacity = 0;
        scene.add(wave);
        waves.push({ wave, delay: i * 0.15 });
    }

    await animate(800, ({ t }) => {
        waves.forEach(({ wave, delay }) => {
            const localT = Math.min(1, Math.max(0, (t - delay) / (1 - delay)));
            if (localT <= 0) return;
            const eased = easeOutQuad(localT);
            wave.scale.setScalar(1 + eased * 2);
            wave.material.opacity = 0.8 * (1 - eased);
        });
    });

    waves.forEach(({ wave }) => {
        scene.remove(wave);
        wave.geometry?.dispose?.();
        wave.material?.dispose?.();
    });
}
