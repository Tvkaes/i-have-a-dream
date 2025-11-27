import * as THREE from 'three';
import { PLAYER_CONFIG, TILE_SIZE } from '../config/index.js';
import { transitionTo, onAfterTransition } from '../world/transitionService.js';
import { setFlag } from '../state/gameFlags.js';
import { createKidNPC } from '../world/npcs.js';

const MILO_BATTLE_REASON = 'milo-battle';
const MILO_BATTLE_SPAWN = new THREE.Vector3(2, PLAYER_CONFIG.baseHeight, -4);
const MILO_CAMERA_OFFSET = new THREE.Vector3(2.1, 2.6, 4.4);
const MILO_LOOK_OFFSET = new THREE.Vector3(-1.8, -0.6, -1.1);
const MILO_OPPONENT_DISTANCE = 5 * TILE_SIZE;
const MILO_OPPONENT_OFFSET = new THREE.Vector3(0, 0, -MILO_OPPONENT_DISTANCE);

let cleanupAfterTransition = null;
let activeBattleOpponent = null;

function applyCameraOffset(offsetVector) {
    const cameraContext = window.__cameraContext__;
    if (!cameraContext?.offset) return;
    if (!cameraContext.defaultOffset) {
        cameraContext.defaultOffset = cameraContext.offset.clone();
    }
    cameraContext.offset.copy(offsetVector);
    cameraContext.activeMode = 'battle';
}

function applyCameraLookOffset(offsetVector) {
    const cameraContext = window.__cameraContext__;
    if (!cameraContext?.lookOffset) return;
    if (!cameraContext.defaultLookOffset) {
        cameraContext.defaultLookOffset = cameraContext.lookOffset.clone();
    }
    cameraContext.lookOffset.copy(offsetVector);
}

function resetCameraOffsets() {
    const cameraContext = window.__cameraContext__;
    if (!cameraContext) return;
    if (cameraContext.defaultOffset) {
        cameraContext.offset.copy(cameraContext.defaultOffset);
    }
    if (cameraContext.defaultLookOffset) {
        cameraContext.lookOffset.copy(cameraContext.defaultLookOffset);
    }
    cameraContext.activeMode = 'explore';
}

function movePlayerToSpawn(player, physics, spawn) {
    if (!player) return;
    const target = spawn.clone();
    player.position.copy(target);
    player.rotation.y = 0;

    if (physics?.playerBody) {
        physics.playerBody.setTranslation({ x: target.x, y: 0, z: target.z }, true);
        physics.playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
}

function showBattleHud() {
    const battleHud = window.__battleHud__;
    if (!battleHud) return;
    battleHud.setMessage?.('¡Milo te reta a una batalla!');
    battleHud.show?.();
}

function hideBattleHud() {
    const battleHud = window.__battleHud__;
    battleHud?.setMessage?.('');
    battleHud?.hide?.();
}

function spawnBattleOpponent(scene, referencePlayer) {
    if (!scene || !referencePlayer) return;
    cleanupBattleOpponent(scene);
    const opponent = createKidNPC();
    opponent.name = 'MiloBattleNPC';
    const spawnPosition = referencePlayer.position.clone().add(MILO_OPPONENT_OFFSET);
    spawnPosition.y = PLAYER_CONFIG.baseHeight;
    opponent.position.copy(spawnPosition);
    opponent.rotation.y = Math.PI; // Enfrentar al jugador
    scene.add(opponent);
    activeBattleOpponent = opponent;
}

function cleanupBattleOpponent(scene) {
    if (!scene || !activeBattleOpponent) return;
    scene.remove(activeBattleOpponent);
    activeBattleOpponent = null;
}

export function startMiloBattleSetup() {
    const scene = window.__scene__;
    const player = window.__player__;
    const physics = window.__physics__;

    if (!scene || !player) {
        console.warn('[battle] No se pudo iniciar la batalla de Milo: faltan referencias a la escena o jugador.');
        return;
    }

    cleanupAfterTransition?.();
    cleanupAfterTransition = onAfterTransition((payload) => {
        if (payload.reason !== MILO_BATTLE_REASON || payload.worldId !== 'exterior') {
            return;
        }

        movePlayerToSpawn(payload.player ?? player, payload.physics ?? physics, MILO_BATTLE_SPAWN);
        applyCameraOffset(MILO_CAMERA_OFFSET);
        applyCameraLookOffset(MILO_LOOK_OFFSET);
        spawnBattleOpponent(payload.scene ?? scene, payload.player ?? player);
        window.__interactionOverlay__?.hideAll?.();
        showBattleHud();
        setFlag('isBattleActive', true);

        cleanupAfterTransition?.();
        cleanupAfterTransition = null;
    });

    transitionTo({
        worldId: 'exterior',
        scene,
        player,
        physics,
        reason: MILO_BATTLE_REASON
    });
}

export function endBattleCleanup() {
    setFlag('isBattleActive', false);
    hideBattleHud();
    resetCameraOffsets();
    cleanupBattleOpponent(window.__scene__);
}
