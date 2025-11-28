import * as THREE from 'three';
import { PLAYER_CONFIG, TILE_SIZE } from '../config/index.js';
import { transitionTo, onAfterTransition } from '../world/transitionService.js';
import { setFlag } from '../state/gameFlags.js';
import { beginMiloBattle, resetBattleState } from './battleSystem.js';
import { createKidNPC } from '../world/npcs.js';
import { getBattleLandmarks, BATTLE_CAMERA_LANDMARK } from './battleLandmarks.js';

const MILO_BATTLE_REASON = 'milo-battle';
const FALLBACK_PLAYER_SPAWN = new THREE.Vector3(2, PLAYER_CONFIG.baseHeight, -4);
const FALLBACK_CAMERA_OFFSET = new THREE.Vector3(3.5, 4, 8);
const FALLBACK_LOOK_OFFSET = new THREE.Vector3(-2, -0.2, -3);
const MILO_OPPONENT_DISTANCE = 5 * TILE_SIZE;
const FALLBACK_OPPONENT_OFFSET = new THREE.Vector3(0, 0, -MILO_OPPONENT_DISTANCE);

let cleanupAfterTransition = null;
let activeBattleOpponent = null;

function applyBattleCameraConfig(landmark) {
    const cameraContext = window.__cameraContext__;
    if (!cameraContext) return;
    const offset = landmark?.position ?? FALLBACK_CAMERA_OFFSET;
    const lookOffset = landmark?.meta?.lookOffset ?? FALLBACK_LOOK_OFFSET;

    if (!cameraContext.defaultOffset) {
        cameraContext.defaultOffset = cameraContext.offset.clone();
    }
    if (!cameraContext.defaultLookOffset) {
        cameraContext.defaultLookOffset = cameraContext.lookOffset.clone();
    }

    cameraContext.offset.copy(offset);
    cameraContext.lookOffset.copy(lookOffset);
    cameraContext.activeMode = 'battle';
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
    const target = spawn?.clone?.() ?? FALLBACK_PLAYER_SPAWN.clone();
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

function spawnBattleOpponent(scene, referencePlayer, opponentSpawnPosition = null) {
    if (!scene || !referencePlayer) return;
    cleanupBattleOpponent(scene);
    const opponent = createKidNPC();
    opponent.name = 'MiloBattleNPC';
    const spawnPosition = opponentSpawnPosition?.clone?.()
        ?? referencePlayer.position.clone().add(FALLBACK_OPPONENT_OFFSET);
    spawnPosition.y = PLAYER_CONFIG.baseHeight;
    opponent.position.copy(spawnPosition);
    if (referencePlayer.position) {
        opponent.lookAt(referencePlayer.position.clone().setY(spawnPosition.y));
    } else {
        opponent.rotation.y = Math.PI; // fallback para enfrentar al jugador
    }
    scene.add(opponent);
    activeBattleOpponent = opponent;
    window.__activeBattleOpponent__ = opponent;
}

function cleanupBattleOpponent(scene) {
    if (!scene || !activeBattleOpponent) return;
    scene.remove(activeBattleOpponent);
    activeBattleOpponent = null;
    window.__activeBattleOpponent__ = null;
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

        const { player: playerLandmark, opponent: opponentLandmark, camera: cameraLandmark } = getBattleLandmarks();

        movePlayerToSpawn(
            payload.player ?? player,
            payload.physics ?? physics,
            playerLandmark?.position ?? FALLBACK_PLAYER_SPAWN
        );
        applyBattleCameraConfig(cameraLandmark);
        spawnBattleOpponent(
            payload.scene ?? scene,
            payload.player ?? player,
            opponentLandmark?.position ?? null
        );
        window.__interactionOverlay__?.hideAll?.();
        showBattleHud();
        window.__triggerBattleCleanup__ = (result) => {
            console.info('[battle] Finalizando batalla con resultado:', result);
            endBattleCleanup();
        };
        beginMiloBattle();
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
    resetBattleState();
    window.__triggerBattleCleanup__ = null;
}
