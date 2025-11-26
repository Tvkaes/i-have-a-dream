export function registerWorldBodies(physics, worldId, bodies = [], { enabled = true } = {}) {
    if (!physics?.worldBodies || !Array.isArray(bodies) || bodies.length === 0) return;
    const existing = physics.worldBodies.get(worldId) || [];
    existing.push(...bodies);
    physics.worldBodies.set(worldId, existing);

    if (!enabled) {
        bodies.forEach((body) => {
            if (body && body.isValid && body.isValid()) {
                body.setEnabled(false);
            }
        });
    }
}

export function setWorldCollidersEnabled(physics, worldId, enabled) {
    if (!physics?.world || !physics.worldBodies) return;
    const bodies = physics.worldBodies.get(worldId);
    if (!bodies) return;

    bodies.forEach((body) => {
        if (body && body.isValid && body.isValid()) {
            body.setEnabled(enabled);
        }
    });
}

export function enableOnlyWorldColliders(physics, activeWorldId) {
    if (!physics?.worldBodies) return;

    physics.worldBodies.forEach((bodies, worldId) => {
        const shouldEnable = worldId === activeWorldId;
        bodies.forEach((body) => {
            if (body && body.isValid && body.isValid()) {
                body.setEnabled(shouldEnable);
            }
        });
    });
}

export function createBlockingColliders({
    physics,
    tileMap,
    tileSize,
    mapWidth,
    mapHeight,
    blockingTiles,
    worldId = 'exterior'
}) {
    if (!physics?.world) return [];
    const halfWorldWidth = (mapWidth * tileSize) / 2;
    const halfWorldHeight = (mapHeight * tileSize) / 2;
    const halfTile = tileSize * 0.5 - 0.05;
    const bodies = [];

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
            bodies.push(body);
        }
    }

    registerWorldBodies(physics, worldId, bodies);

    return bodies;
}
