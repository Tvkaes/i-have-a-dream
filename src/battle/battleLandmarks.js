import { setLandmark, getLandmark } from '../world/landmarks.js';

export const BATTLE_PLAYER_LANDMARK = 'battle-player-pos';
export const BATTLE_OPPONENT_LANDMARK = 'battle-opponent-pos';
export const BATTLE_CAMERA_LANDMARK = 'battle-camera-pos';

export function setBattleLandmarks({
    playerPosition = null,
    opponentPosition = null,
    cameraPosition = null,
    cameraMeta = {}
} = {}) {
    if (playerPosition) {
        setLandmark(BATTLE_PLAYER_LANDMARK, { position: playerPosition });
    }
    if (opponentPosition) {
        setLandmark(BATTLE_OPPONENT_LANDMARK, { position: opponentPosition });
    }
    if (cameraPosition) {
        setLandmark(BATTLE_CAMERA_LANDMARK, { position: cameraPosition, meta: { ...cameraMeta } });
    }
}

export function getBattleLandmarks() {
    return {
        player: getLandmark(BATTLE_PLAYER_LANDMARK),
        opponent: getLandmark(BATTLE_OPPONENT_LANDMARK),
        camera: getLandmark(BATTLE_CAMERA_LANDMARK)
    };
}
