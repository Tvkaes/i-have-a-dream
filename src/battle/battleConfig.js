import * as THREE from 'three';
import { TILE_SIZE, PLAYER_CONFIG } from '../config/index.js';

export const BATTLE_STAGE_CENTER = new THREE.Vector3(0, PLAYER_CONFIG.baseHeight, 0);
export const BATTLE_STAGE_FORWARD = new THREE.Vector3(0, 0, -1);
export const BATTLE_STAGE_RIGHT = new THREE.Vector3(1, 0, 0);

export const PLAYER_LATERAL_OFFSET_TILES = -3;
export const PLAYER_FORWARD_OFFSET_TILES = 0;
export const MILO_FORWARD_DISTANCE_TILES = 7;
export const MILO_LATERAL_DELTA_TILES = 1;
export const OPPONENT_LATERAL_OFFSET_TILES = PLAYER_LATERAL_OFFSET_TILES + MILO_LATERAL_DELTA_TILES;
export const OPPONENT_FORWARD_OFFSET_TILES = PLAYER_FORWARD_OFFSET_TILES + MILO_FORWARD_DISTANCE_TILES;

export const PLAYER_POKEMON_LATERAL_TILES = -1;
export const OPPONENT_POKEMON_LATERAL_TILES = -1;
export const POKEMON_FORWARD_TILES = 1;

export const CAMERA_STAGE_OFFSET = new THREE.Vector3(0, 4.5, 7);
export const CAMERA_LOOK_OFFSET = new THREE.Vector3(0, 0.5, -6);

export function computeBattleBasis(direction) {
    const forward = (direction?.clone?.() ?? new THREE.Vector3(0, 0, -1)).setY(0);
    if (forward.lengthSq() < 1e-6) {
        forward.set(0, 0, -1);
    } else {
        forward.normalize();
    }

    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    if (right.lengthSq() < 1e-6) {
        right.set(1, 0, 0);
    } else {
        right.normalize();
    }

    return { forward, right };
}

export function buildBattlePosition({ base, forwardTiles = 0, lateralTiles = 0, forward, right } = {}) {
    const origin = base?.clone?.() ?? new THREE.Vector3();
    if (right && lateralTiles) {
        origin.addScaledVector(right, lateralTiles * TILE_SIZE);
    }
    if (forward && forwardTiles) {
        origin.addScaledVector(forward, forwardTiles * TILE_SIZE);
    }
    return origin;
}
