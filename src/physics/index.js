export function createPhysicsContext(RAPIER) {
    if (!RAPIER) return null;
    return {
        world: new RAPIER.World({ x: 0, y: 0, z: 0 }),
        playerBody: null,
        rapier: RAPIER
    };
}

export function disposePhysicsContext(physics) {
    if (!physics) return;
    try {
        physics.world?.free?.();
    } catch (error) {
        console.warn('No se pudo liberar el mundo de física:', error);
    }
    physics.playerBody = null;
}

export function attachPlayerPhysics(physics, startX, startZ, RAPIER) {
    if (!physics?.world || !RAPIER) return;
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(startX, 0, startZ)
        .lockRotations()
        .setLinearDamping(10.0);
    physics.playerBody = physics.world.createRigidBody(bodyDesc);
    const capsuleRadius = 0.4;
    const capsuleHalfHeight = 0.5;
    const collider = RAPIER.ColliderDesc.capsule(capsuleHalfHeight, capsuleRadius)
        .setFriction(0.5)
        .setRestitution(0)
        .setDensity(1.0);
    physics.world.createCollider(collider, physics.playerBody);
    physics.playerBody.setGravityScale(0.0, true);
}

export function createBlockingColliders({ physics, tileMap, tileSize, mapWidth, mapHeight, blockingTiles }) {
    if (!physics?.world) return;
    const halfWorldWidth = (mapWidth * tileSize) / 2;
    const halfWorldHeight = (mapHeight * tileSize) / 2;
    const halfTile = (tileSize * 0.5) - 0.05;

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            if (!blockingTiles.has(tileMap[y][x])) continue;
            const worldX = x * tileSize - halfWorldWidth;
            const worldZ = y * tileSize - halfWorldHeight;
            const body = physics.world.createRigidBody(
                physics.rapier.RigidBodyDesc.fixed().setTranslation(worldX, 0, worldZ)
            );
            const collider = physics.rapier.ColliderDesc.cuboid(halfTile, 1, halfTile);
            physics.world.createCollider(collider, body);
        }
    }
}
