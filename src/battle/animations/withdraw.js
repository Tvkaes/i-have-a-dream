import * as THREE from 'three';
import { animate, computeAttackContext } from './utils.js';

const SHELL_GEOMETRY = new THREE.SphereGeometry(1.2, 24, 24);

function createShellMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x8b5a2b,
        transparent: true,
        opacity: 0.35,
        roughness: 0.6
    });
}

export async function playWithdraw({ scene, attackerMesh }) {
    if (!scene || !attackerMesh) return;

    const { attackerPos } = computeAttackContext(attackerMesh, attackerMesh);
    const shell = new THREE.Mesh(SHELL_GEOMETRY, createShellMaterial());
    shell.position.copy(attackerPos);
    scene.add(shell);

    const originalScale = attackerMesh.scale.clone();

    await animate(900, ({ t }) => {
        if (t < 0.4) {
            const shrink = 1 - t * 0.5;
            attackerMesh.scale.setScalar(Math.max(0.5, shrink));
            shell.material.opacity = 0.35 + t * 0.4;
        } else if (t < 0.7) {
            shell.rotation.y += 0.1;
        } else {
            const restore = (t - 0.7) / 0.3;
            attackerMesh.scale.lerpVectors(attackerMesh.scale, originalScale, restore);
            shell.material.opacity = Math.max(0, 0.55 - restore * 0.55);
        }
    });

    attackerMesh.scale.copy(originalScale);
    scene.remove(shell);
    shell.geometry?.dispose?.();
    shell.material?.dispose?.();
}
