import * as THREE from 'three';
import { animate, easeOutQuad, computeAttackContext } from './utils.js';

const BEAM_GEOMETRY = new THREE.ConeGeometry(0.15, 0.6, 16, 1, true);

function createBeamMaterial(color) {
    return new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
}

export async function playLeer({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const { attackerPos, defenderPos } = computeAttackContext(attackerMesh, defenderMesh);
    attackerPos.y += 0.8;
    defenderPos.y += 0.7;

    const leftBeam = new THREE.Mesh(BEAM_GEOMETRY, createBeamMaterial(0xffe066));
    const rightBeam = new THREE.Mesh(BEAM_GEOMETRY, createBeamMaterial(0xffa34d));
    [leftBeam, rightBeam].forEach((beam, idx) => {
        beam.position.copy(attackerPos);
        beam.rotation.z = idx === 0 ? 0.2 : -0.2;
        beam.lookAt(defenderPos);
        scene.add(beam);
    });

    await animate(600, ({ t }) => {
        const phase = easeOutQuad(t);
        leftBeam.material.opacity = 0.8 * (1 - phase);
        rightBeam.material.opacity = 0.8 * (1 - phase);
        const intensity = Math.sin(t * Math.PI * 4) * 0.04;
        defenderMesh.rotation.z = intensity;
    });

    defenderMesh.rotation.z = 0;
    [leftBeam, rightBeam].forEach((beam) => {
        scene.remove(beam);
        beam.geometry?.dispose?.();
        beam.material?.dispose?.();
    });
}
