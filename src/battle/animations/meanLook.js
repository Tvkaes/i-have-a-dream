import * as THREE from 'three';
import { animate, easeInOutSine, computeAttackContext } from './utils.js';

const EYE_GEOMETRY = new THREE.RingGeometry(0.15, 0.5, 32);

function createEyeMaterial(color) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
}

export async function playMeanLook({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const { defenderPos } = computeAttackContext(attackerMesh, defenderMesh);
    defenderPos.y += 0.6;

    const outerEye = new THREE.Mesh(EYE_GEOMETRY, createEyeMaterial(0xff4444));
    const innerEye = new THREE.Mesh(EYE_GEOMETRY.clone(), createEyeMaterial(0xffffff));
    [outerEye, innerEye].forEach((eye, idx) => {
        eye.position.copy(defenderPos);
        eye.rotation.x = Math.PI / 2;
        eye.scale.setScalar(idx === 0 ? 1 : 0.6);
        scene.add(eye);
    });

    await animate(900, ({ t }) => {
        const phase = easeInOutSine(t);
        outerEye.scale.setScalar(1 + phase * 0.2);
        innerEye.scale.setScalar(0.6 + phase * 0.1);
        const opacity = 0.85 * (1 - phase) + 0.2;
        outerEye.material.opacity = opacity;
        innerEye.material.opacity = opacity;
        defenderMesh.rotation.x = Math.sin(t * Math.PI * 6) * 0.06;
    });

    defenderMesh.rotation.x = 0;
    [outerEye, innerEye].forEach((eye) => {
        scene.remove(eye);
        eye.geometry?.dispose?.();
        eye.material?.dispose?.();
    });
}
