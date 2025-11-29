import * as THREE from 'three';
import { animate, easeInOutSine, getMeshWorldPosition } from './utils.js';

const leafGeometry = new THREE.PlaneGeometry(0.45, 0.22);

function createLeafMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x6faa3c,
        emissive: 0x1d3a11,
        emissiveIntensity: 0.35,
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
    });
}

export async function playRazorLeaf({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const attackerPos = getMeshWorldPosition(attackerMesh, new THREE.Vector3()).clone();
    const defenderPos = getMeshWorldPosition(defenderMesh, new THREE.Vector3()).clone();
    attackerPos.y += 0.3;
    defenderPos.y += 0.4;

    const leafCount = 14;
    const leaves = [];
    for (let i = 0; i < leafCount; i += 1) {
        const mesh = new THREE.Mesh(leafGeometry, createLeafMaterial());
        mesh.position.copy(attackerPos);
        mesh.rotation.x = Math.random() * Math.PI;
        mesh.rotation.y = Math.random() * Math.PI;
        mesh.rotation.z = Math.random() * Math.PI;
        mesh.castShadow = true;
        scene.add(mesh);
        leaves.push({
            mesh,
            sway: (Math.random() - 0.5) * 0.5,
            lift: Math.random() * 0.4,
            delay: i * 0.02,
            spin: (Math.random() - 0.5) * 0.3
        });
    }

    await animate(950, ({ t }) => {
        leaves.forEach((leaf) => {
            const localT = Math.min(1, Math.max(0, (t - leaf.delay) / (1 - leaf.delay)));
            const eased = easeInOutSine(localT);
            leaf.mesh.position.lerpVectors(attackerPos, defenderPos, eased);
            leaf.mesh.position.y += Math.sin(eased * Math.PI) * leaf.lift;
            leaf.mesh.position.x += Math.sin(eased * Math.PI * 2) * leaf.sway;
            leaf.mesh.rotation.x += 0.15 + leaf.spin;
            leaf.mesh.rotation.y += 0.22 + leaf.spin * 0.5;
            leaf.mesh.material.opacity = 1 - eased;
        });
    });

    leaves.forEach(({ mesh }) => {
        scene.remove(mesh);
        mesh.material?.dispose?.();
    });
}
