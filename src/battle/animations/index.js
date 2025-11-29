import { playRazorLeaf } from './razorLeaf.js';
import { playWaterGun } from './waterGun.js';
import { playTackle } from './tackle.js';
import { playPoisonPowder } from './poisonPowder.js';
import { playSynthesis } from './synthesis.js';
import { playBite } from './bite.js';
import { playWithdraw } from './withdraw.js';
import { playQuickAttack } from './quickAttack.js';
import { playFocusEnergy } from './focusEnergy.js';
import { playThunderShock } from './thunderShock.js';
import { playThunderWave } from './thunderWave.js';
import { playDoubleTeam } from './doubleTeam.js';
import { playSandAttack } from './sandAttack.js';
import { playCovet } from './covet.js';
import { playGrowl } from './growl.js';
import { playGust } from './gust.js';
import { playEmber } from './ember.js';
import { playSmokescreen } from './smokescreen.js';
import { playScratch } from './scratch.js';
import { playLeer } from './leer.js';
import { playHypnosis } from './hypnosis.js';
import { playLick } from './lick.js';
import { playMeanLook } from './meanLook.js';
import { playCurse } from './curse.js';
import { getBattleSpriteMesh } from '../battleWorldSprites.js';

const MOVE_ANIMATIONS = {
    'razor leaf': playRazorLeaf,
    'water gun': playWaterGun,
    tackle: playTackle,
    'poison powder': playPoisonPowder,
    synthesis: playSynthesis,
    bite: playBite,
    withdraw: playWithdraw,
    'quick attack': playQuickAttack,
    'focus energy': playFocusEnergy,
    'thunder shock': playThunderShock,
    'thunder wave': playThunderWave,
    'double team': playDoubleTeam,
    'sand attack': playSandAttack,
    covet: playCovet,
    growl: playGrowl,
    gust: playGust,
    ember: playEmber,
    smokescreen: playSmokescreen,
    scratch: playScratch,
    leer: playLeer,
    hypnosis: playHypnosis,
    lick: playLick,
    'mean look': playMeanLook,
    curse: playCurse
};

function normalizeMoveId(id = '') {
    return String(id).trim().toLowerCase();
}

function resolveSides(attackerSide) {
    if (attackerSide === 'player') {
        return { attacker: 'player', defender: 'opponent' };
    }
    if (attackerSide === 'opponent') {
        return { attacker: 'opponent', defender: 'player' };
    }
    return { attacker: null, defender: null };
}

export async function playMoveAnimation({ moveId, attackerSide, scene }) {
    const key = normalizeMoveId(moveId);
    const handler = MOVE_ANIMATIONS[key];
    if (!handler || !scene) return false;

    const { attacker, defender } = resolveSides(attackerSide);
    if (!attacker || !defender) return false;

    const attackerMesh = getBattleSpriteMesh(attacker);
    const defenderMesh = getBattleSpriteMesh(defender);
    if (!attackerMesh || !defenderMesh) return false;

    try {
        await handler({ scene, attackerMesh, defenderMesh });
        return true;
    } catch (error) {
        console.warn('[battle] Error al ejecutar animación de movimiento', moveId, error);
        return false;
    }
}
