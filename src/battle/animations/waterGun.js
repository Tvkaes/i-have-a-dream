import * as THREE from 'three';
import { animate, easeOutQuad, getMeshWorldPosition } from './utils.js';

const dropGeometry = new THREE.SphereGeometry(0.09, 12, 12);
const splashGeometry = new THREE.SphereGeometry(0.04, 8, 8);

function createDropMaterial() {
    return new THREE.MeshPhysicalMaterial({
        color: 0x2e8bff,
        transparent: true,
        opacity: 0.85,
        roughness: 0.15,
        metalness: 0.05,
        transmission: 0.5,
        thickness: 0.4
    });
}

function createSplashMaterial() {
    return new THREE.MeshBasicMaterial({
        color: 0x8dd3ff,
        transparent: true,
        opacity: 0.6
    });
}

export async function playWaterGun({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const attackerPos = getMeshWorldPosition(attackerMesh, new THREE.Vector3()).clone();
    const defenderPos = getMeshWorldPosition(defenderMesh, new THREE.Vector3()).clone();
    attackerPos.y += 0.35;
    defenderPos.y += 0.35;

    const drops = [];
    const dropCount = 18;
    for (let i = 0; i < dropCount; i += 1) {
        const drop = new THREE.Mesh(dropGeometry, createDropMaterial());
        drop.position.copy(attackerPos);
        drop.castShadow = true;
        scene.add(drop);
        drops.push({
            mesh: drop,
            delay: i * 0.02,
            sway: (Math.random() - 0.5) * 0.25,
            wobble: Math.random() * Math.PI * 2
        });
    }

    await animate(900, ({ t }) => {
        drops.forEach((drop) => {
            const localT = Math.min(1, Math.max(0, (t - drop.delay) / (1 - drop.delay)));
            if (localT <= 0 || localT >= 1.05) return;
            const eased = easeOutQuad(localT);
            drop.mesh.position.lerpVectors(attackerPos, defenderPos, eased);
            drop.mesh.position.y += Math.sin(eased * Math.PI * 2 + drop.wobble) * 0.08;
            drop.mesh.position.x += Math.sin(eased * Math.PI) * drop.sway;
            drop.mesh.scale.setScalar(1 + eased * 0.3);
            drop.mesh.material.opacity = 1 - eased * 0.8;

            if (eased > 0.8 && !drop.mesh.userData.splashed) {
                drop.mesh.userData.splashed = true;
                createSplash(scene, drop.mesh.position);
            }
        });
    });

    drops.forEach(({ mesh }) => {
        scene.remove(mesh);
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
    });
}

function createSplash(scene, position) {
    const splash = new THREE.Mesh(splashGeometry, createSplashMaterial());
    splash.position.copy(position);
    scene.add(splash);
    animate(300, ({ t }) => {
        splash.scale.setScalar(1 + t * 1.5);
        splash.material.opacity = 0.6 * (1 - t);
    }).finally(() => {
        scene.remove(splash);
        splash.geometry?.dispose?.();
        splash.material?.dispose?.();
    });
}
