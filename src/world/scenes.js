import * as THREE from 'three';
import { PLAYER_CONFIG, TILE_SIZE } from '../config/index.js';
import { registerInteractable } from './index.js';
import { HOUSE_CONFIGS } from './houseConfigs.js';
import {
    createFloor,
    createWalls,
    createCeiling,
    createFurniture,
    createExitDoor
} from './interiorComponents.js';
import { enableOnlyWorldColliders, registerWorldBodies } from '../physics/index.js';

const worlds = new Map();
let currentWorldId = 'exterior';
let transitionCallback = null;
let returnPosition = null; // Guarda la posición desde donde se entró a un interior

export function registerWorld(id, worldGroup, spawnPosition = null) {
    worlds.set(id, {
        group: worldGroup,
        spawnPosition: spawnPosition || new THREE.Vector3(0, PLAYER_CONFIG.baseHeight, 0)
    });
}

export function getCurrentWorldId() {
    return currentWorldId;
}

export function setTransitionCallback(callback) {
    transitionCallback = callback;
}

export function loadWorld(worldId, scene, player, onComplete = null, returnPos = null, physics = null) {
    const targetWorld = worlds.get(worldId);
    if (!targetWorld) {
        console.warn(`Mundo "${worldId}" no encontrado`);
        return;
    }

    const loadingScreen = window.__loadingScreen__;
    loadingScreen?.show('Cambiando de escenario...');

    // Guardar posición de retorno si se proporciona (entrando a un interior)
    if (returnPos) {
        returnPosition = returnPos.clone();
    }

    // Si estamos saliendo al exterior, usar la posición de retorno guardada
    const spawnPos = (worldId === 'exterior' && returnPosition) 
        ? returnPosition 
        : targetWorld.spawnPosition;

    // Limpiar escena (solo grupos de mundo, no luces/cámara)
    const toRemove = [];
    scene.children.forEach((child) => {
        if (child.userData?.isWorldGroup) {
            toRemove.push(child);
        }
    });
    toRemove.forEach((child) => scene.remove(child));

    // Agregar nuevo mundo
    targetWorld.group.userData.isWorldGroup = true;
    scene.add(targetWorld.group);

    // Reposicionar jugador (tanto visual como física)
    player.position.copy(spawnPos);
    player.rotation.y = 0;

    // IMPORTANTE: Actualizar también el cuerpo de física para evitar que sobrescriba la posición
    if (physics?.playerBody) {
        physics.playerBody.setTranslation(
            { x: spawnPos.x, y: 0, z: spawnPos.z },
            true
        );
        physics.playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    // Activar solo los colliders del mundo actual
    enableOnlyWorldColliders(physics, worldId);

    // Limpiar returnPosition al volver al exterior
    if (worldId === 'exterior') {
        returnPosition = null;
    }

    currentWorldId = worldId;

    if (transitionCallback) {
        transitionCallback(worldId);
    }

    if (onComplete) {
        onComplete();
    }

    loadingScreen?.hide();
}


export function createHouseInterior(houseType, physics = null) {
    const config = HOUSE_CONFIGS[houseType] || HOUSE_CONFIGS.green;
    const group = new THREE.Group();
    group.name = `interior-${houseType}`;

    const { roomSize, wallHeight, floorColor, wallColor, ceilingColor, furniture } = config;

    // Crear colliders para las paredes del interior
    if (physics?.world && physics.rapier) {
        const bodies = [];
        const halfRoom = roomSize / 2;
        const wallThickness = 0.5;

        // Pared trasera (norte)
        const backWall = physics.world.createRigidBody(
            physics.rapier.RigidBodyDesc.fixed().setTranslation(0, 0, -halfRoom)
        );
        physics.world.createCollider(
            physics.rapier.ColliderDesc.cuboid(halfRoom, wallHeight, wallThickness),
            backWall
        );
        bodies.push(backWall);

        // Pared izquierda (oeste)
        const leftWall = physics.world.createRigidBody(
            physics.rapier.RigidBodyDesc.fixed().setTranslation(-halfRoom, 0, 0)
        );
        physics.world.createCollider(
            physics.rapier.ColliderDesc.cuboid(wallThickness, wallHeight, halfRoom),
            leftWall
        );
        bodies.push(leftWall);

        // Pared derecha (este)
        const rightWall = physics.world.createRigidBody(
            physics.rapier.RigidBodyDesc.fixed().setTranslation(halfRoom, 0, 0)
        );
        physics.world.createCollider(
            physics.rapier.ColliderDesc.cuboid(wallThickness, wallHeight, halfRoom),
            rightWall
        );
        bodies.push(rightWall);

        // Pared frontal con puerta (sur) - dos segmentos a los lados de la puerta
        const doorWidth = 2;
        const sideWidth = (roomSize - doorWidth) / 2 - wallThickness;
        
        const leftDoorWall = physics.world.createRigidBody(
            physics.rapier.RigidBodyDesc.fixed().setTranslation(-halfRoom + sideWidth / 2, 0, halfRoom)
        );
        physics.world.createCollider(
            physics.rapier.ColliderDesc.cuboid(sideWidth / 2, wallHeight, wallThickness),
            leftDoorWall
        );
        bodies.push(leftDoorWall);

        const rightDoorWall = physics.world.createRigidBody(
            physics.rapier.RigidBodyDesc.fixed().setTranslation(halfRoom - sideWidth / 2, 0, halfRoom)
        );
        physics.world.createCollider(
            physics.rapier.ColliderDesc.cuboid(sideWidth / 2, wallHeight, wallThickness),
            rightDoorWall
        );
        bodies.push(rightDoorWall);

        registerWorldBodies(physics, `interior-${houseType}`, bodies, { enabled: false });
    }

    // Agregar suelo
    group.add(createFloor(roomSize, floorColor));

    // Agregar paredes
    createWalls(roomSize, wallHeight, wallColor).forEach(wall => group.add(wall));

    // Agregar techo
    group.add(createCeiling(roomSize, wallHeight, ceilingColor));

    // Agregar muebles
    createFurniture(furniture).forEach(item => group.add(item));

    // Puerta de salida
    const { door: exitDoor, doorZ } = createExitDoor(roomSize);
    group.add(exitDoor);

    // Registrar interactable para salir (asociado a este interior específico)
    registerInteractable({
        id: `exit-door-${houseType}`,
        position: new THREE.Vector3(0, PLAYER_CONFIG.baseHeight, doorZ),
        radius: TILE_SIZE,
        prompt: 'Presiona Enter para salir',
        message: [],
        worldId: `interior-${houseType}`, // Asociar al mundo interior
        onInteract: () => {
            const overlay = window.__interactionOverlay__;
            if (overlay && overlay.loadWorld) {
                overlay.loadWorld('exterior');
            }
        }
    });

    return group;
}

export function setupHouseInteriors(scene, physics = null) {
    const interiors = ['green', 'blue', 'yellow1', 'yellow2'];
    
    interiors.forEach((houseType) => {
        const interior = createHouseInterior(houseType, physics);
        const config = HOUSE_CONFIGS[houseType] || HOUSE_CONFIGS.green;
        // Calcular posición de spawn: un tile adelante de la puerta interior
        const doorZ = config.roomSize / 2 - 0.1;
        const spawnPos = new THREE.Vector3(0, PLAYER_CONFIG.baseHeight, doorZ - TILE_SIZE * 1.5);
        registerWorld(`interior-${houseType}`, interior, spawnPos);
    });
}
