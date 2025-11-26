export function createPhysicsContext(RAPIER) {
    if (!RAPIER) return null;
    return {
        world: new RAPIER.World({ x: 0, y: 0, z: 0 }),
        playerBody: null,
        rapier: RAPIER,
        worldBodies: new Map() // Guarda bodies por worldId
    };
}

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

export function disposePhysicsContext(physics) {
    if (!physics) return;
    try {
        physics.world?.free?.();
    } catch (error) {
        console.warn('No se pudo liberar el mundo de física:', error);
    }
    physics.playerBody = null;
    physics.worldBodies?.clear();
}

/**
 * Activa/desactiva los colliders de un mundo específico
 */
export function setWorldCollidersEnabled(physics, worldId, enabled) {
    if (!physics?.world || !physics.worldBodies) return;
    const bodies = physics.worldBodies.get(worldId);
    if (!bodies) return;

    bodies.forEach(body => {
        if (body && body.isValid && body.isValid()) {
            body.setEnabled(enabled);
        }
    });
}

/**
 * Desactiva todos los colliders excepto los del mundo especificado
 */
export function enableOnlyWorldColliders(physics, activeWorldId) {
    if (!physics?.worldBodies) return;
    
    physics.worldBodies.forEach((bodies, worldId) => {
        const shouldEnable = (worldId === activeWorldId);
        bodies.forEach(body => {
            if (body && body.isValid && body.isValid()) {
                body.setEnabled(shouldEnable);
            }
        });
    });
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

export function createBlockingColliders({ physics, tileMap, tileSize, mapWidth, mapHeight, blockingTiles, worldId = 'exterior' }) {
    if (!physics?.world) return [];
    const halfWorldWidth = (mapWidth * tileSize) / 2;
    const halfWorldHeight = (mapHeight * tileSize) / 2;
    const halfTile = (tileSize * 0.5) - 0.05;
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
