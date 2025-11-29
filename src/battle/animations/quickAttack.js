import * as THREE from 'three';
import { animate, easeOutCubic, computeAttackContext } from './utils.js';

const AFTERIMAGE_COUNT = 4;

export async function playQuickAttack({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const { attackerPos, defenderPos, direction } = computeAttackContext(attackerMesh, defenderMesh);
    const dashDistance = Math.min(attackerPos.distanceTo(defenderPos) - 0.4, 1.2);
    const dashTarget = attackerPos.clone().add(direction.clone().multiplyScalar(Math.max(0.5, dashDistance)));
    const startPosition = attackerMesh.position.clone();
    const afterImages = createAfterImages(scene, attackerMesh);

    await animate(500, ({ t }) => {
        if (t < 0.4) {
            const dashPhase = easeOutCubic(t / 0.4);
            attackerMesh.position.lerpVectors(startPosition, dashTarget, dashPhase);
            updateAfterImages(afterImages, attackerMesh.position, -direction, dashPhase);
        } else {
            const returnPhase = easeOutCubic((t - 0.4) / 0.6);
            attackerMesh.position.lerpVectors(dashTarget, startPosition, returnPhase);
            updateAfterImages(afterImages, attackerMesh.position, -direction, 1 - returnPhase);
        }
    });

    attackerMesh.position.copy(startPosition);
    disposeAfterImages(scene, afterImages);
}

function createAfterImages(scene, referenceMesh) {
    const images = [];
    for (let i = 0; i < AFTERIMAGE_COUNT; i += 1) {
        const clone = referenceMesh.clone();
        clone.material = referenceMesh.material.clone();
        clone.material.transparent = true;
        clone.material.opacity = 0.4;
        clone.renderOrder = referenceMesh.renderOrder - 1;
        scene.add(clone);
        images.push(clone);
    }
    return images;
}

function updateAfterImages(images, position, direction, intensity) {
    images.forEach((img, idx) => {
        const offset = (idx + 1) * 0.25;
        img.position.copy(position).add(direction.clone().multiplyScalar(offset));
        img.material.opacity = Math.max(0, 0.35 - intensity * 0.2 - idx * 0.05);
    });
}

function disposeAfterImages(scene, images) {
    images.forEach((img) => {
        scene.remove(img);
        img.geometry?.dispose?.();
        img.material?.dispose?.();
    });
}
