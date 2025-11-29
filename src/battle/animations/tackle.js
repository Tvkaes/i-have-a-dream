import * as THREE from 'three';
import { animate, easeOutQuad, computeAttackContext } from './utils.js';

export async function playTackle({ attackerMesh, defenderMesh }) {
    if (!attackerMesh || !defenderMesh) return;

    const { attackerPos, defenderPos, direction, distance } = computeAttackContext(attackerMesh, defenderMesh);
    const travel = Math.min(distance * 0.6, 1.4);
    const forwardTarget = attackerPos.clone().add(direction.clone().multiplyScalar(travel));
    forwardTarget.y = attackerPos.y;
    const attackerStart = attackerMesh.position.clone();
    const defenderStart = defenderMesh.position.clone();

    await animate(420, ({ t }) => {
        if (t < 0.5) {
            const phase = easeOutQuad(t / 0.5);
            attackerMesh.position.lerpVectors(attackerStart, forwardTarget, phase);
        } else {
            const phase = easeOutQuad((t - 0.5) / 0.5);
            attackerMesh.position.lerpVectors(forwardTarget, attackerStart, phase);
        }
        const impact = Math.max(0, Math.min(1, (t - 0.4) / 0.15));
        if (impact > 0) {
            const knockback = direction.clone().multiplyScalar(0.2 * impact);
            defenderMesh.position.copy(defenderStart).add(knockback);
        } else {
            defenderMesh.position.copy(defenderStart);
        }
    });

    attackerMesh.position.copy(attackerStart);
    defenderMesh.position.copy(defenderStart);
}
