import * as THREE from 'three';
import { animate, easeOutCubic, computeAttackContext } from './utils.js';

const HEART_GEOMETRY = new THREE.ShapeGeometry(new THREE.Shape()
    .moveTo(0, 0.3)
    .bezierCurveTo(0.5, 0.5, 0.6, 0, 0, -0.3)
    .moveTo(0, 0.3)
    .bezierCurveTo(-0.5, 0.5, -0.6, 0, 0, -0.3));

function createHeartMaterial() {
    return new THREE.MeshBasicMaterial({ color: 0xff7eb5, transparent: true, opacity: 0.9 });
}

export async function playCovet({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const { attackerPos, defenderPos } = computeAttackContext(attackerMesh, defenderMesh);
    attackerPos.y += 0.7;
    defenderPos.y += 0.7;

    const hearts = [];
    for (let i = 0; i < 6; i += 1) {
        const mesh = new THREE.Mesh(HEART_GEOMETRY, createHeartMaterial());
        mesh.scale.setScalar(0.4);
        mesh.position.copy(attackerPos);
        mesh.lookAt(defenderPos);
        scene.add(mesh);
        hearts.push({ mesh, delay: i * 0.05, sway: (Math.random() - 0.5) * 0.4 });
    }

    await animate(800, ({ t }) => {
        hearts.forEach((heart) => {
            const localT = Math.min(1, Math.max(0, (t - heart.delay) / (1 - heart.delay)));
            if (localT <= 0) return;
            const eased = easeOutCubic(localT);
            heart.mesh.position.lerpVectors(attackerPos, defenderPos, eased);
            heart.mesh.position.x += Math.sin(eased * Math.PI * 2) * heart.sway;
            heart.mesh.material.opacity = 0.9 * (1 - eased) + 0.2;
            heart.mesh.scale.setScalar(0.4 + eased * 0.2);
        });
    });

    hearts.forEach(({ mesh }) => {
        scene.remove(mesh);
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
    });
}
