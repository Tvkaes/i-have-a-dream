import * as THREE from 'three';
import { animate, easeOutQuad, computeAttackContext } from './utils.js';

const TONGUE_GEOMETRY = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 16, 1, true);

function createTongueMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0xff8fb4,
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide
    });
}

export async function playLick({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const { attackerPos, defenderPos } = computeAttackContext(attackerMesh, defenderMesh);
    attackerPos.y += 0.8;
    defenderPos.y += 0.6;

    const tongue = new THREE.Mesh(TONGUE_GEOMETRY, createTongueMaterial());
    tongue.position.copy(attackerPos);
    tongue.lookAt(defenderPos);
    tongue.scale.set(0.5, 0.5, 0.5);
    scene.add(tongue);

    await animate(600, ({ t }) => {
        const extendPhase = t < 0.5 ? easeOutQuad(t / 0.5) : 1 - easeOutQuad((t - 0.5) / 0.5);
        tongue.scale.y = 0.3 + extendPhase * 1.2;
        tongue.material.opacity = 0.95 - extendPhase * 0.3;
        defenderMesh.rotation.y = Math.sin(t * Math.PI * 4) * 0.05;
    });

    defenderMesh.rotation.y = 0;
    scene.remove(tongue);
    tongue.geometry?.dispose?.();
    tongue.material?.dispose?.();
}
