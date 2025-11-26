import { HALF_WORLD_WIDTH, HALF_WORLD_HEIGHT, PLAYER_COLLIDER } from '../config/index.js';

const PLAYER_RADIUS = PLAYER_COLLIDER.radius ?? 0.4;
const MAX_X = HALF_WORLD_WIDTH - PLAYER_RADIUS;
const MAX_Z = HALF_WORLD_HEIGHT - PLAYER_RADIUS;

export class PhysicsManager {
    constructor(physicsContext) {
        this.context = physicsContext;
    }

    step() {
        if (!this.context?.world) return;
        this.context.world.step();
    }

    syncPlayer(player) {
        if (!player || !this.context?.playerBody) return;
        const body = this.context.playerBody;
        const bodyPos = body.translation();

        const clampedX = clamp(bodyPos.x, -MAX_X, MAX_X);
        const clampedZ = clamp(bodyPos.z, -MAX_Z, MAX_Z);

        if (clampedX !== bodyPos.x || clampedZ !== bodyPos.z) {
            body.setTranslation({ x: clampedX, y: bodyPos.y, z: clampedZ }, true);
        }

        player.position.x = clampedX;
        player.position.z = clampedZ;
    }
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
