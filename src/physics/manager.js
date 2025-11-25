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
        const bodyPos = this.context.playerBody.translation();
        player.position.x = bodyPos.x;
        player.position.z = bodyPos.z;
    }
}
