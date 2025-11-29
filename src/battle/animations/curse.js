import * as THREE from 'three';
import { animate, easeOutCubic, computeAttackContext } from './utils.js';

const SYMBOL_GEOMETRY = new THREE.RingGeometry(0.2, 0.8, 4, 1);

function createSymbolMaterial() {
    return new THREE.MeshBasicMaterial({
        color: 0x7e3f98,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
}

export async function playCurse({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const { defenderPos } = computeAttackContext(attackerMesh, defenderMesh);
    defenderPos.y += 0.5;

    const symbol = new THREE.Mesh(SYMBOL_GEOMETRY, createSymbolMaterial());
    symbol.position.copy(defenderPos);
    symbol.rotation.x = Math.PI / 2;
    scene.add(symbol);

    const spikes = [];
    for (let i = 0; i < 6; i += 1) {
        const spikeGeometry = new THREE.ConeGeometry(0.05, 0.4, 6);
        const spikeMaterial = new THREE.MeshBasicMaterial({ color: 0x3c1e57 });
        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        spike.position.copy(defenderPos);
        spike.rotation.x = Math.PI / 2;
        spike.rotation.z = (i / 6) * Math.PI * 2;
        scene.add(spike);
        spikes.push(spike);
    }

    await animate(1000, ({ t }) => {
        const phase = easeOutCubic(t);
        symbol.rotation.z += 0.05;
        symbol.scale.setScalar(1 + phase * 0.5);
        symbol.material.opacity = 0.8 * (1 - phase) + 0.2;
        spikes.forEach((spike, idx) => {
            const pulsate = Math.sin((t + idx * 0.1) * Math.PI * 4) * 0.2;
            spike.scale.setScalar(1 + phase * 0.5 + pulsate * 0.1);
        });
        defenderMesh.rotation.y = Math.sin(t * Math.PI * 6) * 0.08;
    });

    defenderMesh.rotation.y = 0;
    scene.remove(symbol);
    symbol.geometry?.dispose?.();
    symbol.material?.dispose?.();
    spikes.forEach((spike) => {
        scene.remove(spike);
        spike.geometry?.dispose?.();
        spike.material?.dispose?.();
    });
}
