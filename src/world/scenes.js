import * as THREE from 'three';
import { PLAYER_CONFIG, TILE_SIZE } from '../config/index.js';
import { createToonMaterial } from './materials.js';
import { registerInteractable } from './index.js';

const worlds = new Map();
let currentWorldId = 'exterior';
let transitionCallback = null;

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

export function loadWorld(worldId, scene, player, onComplete = null) {
    const targetWorld = worlds.get(worldId);
    if (!targetWorld) {
        console.warn(`Mundo "${worldId}" no encontrado`);
        return;
    }

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

    // Reposicionar jugador
    player.position.copy(targetWorld.spawnPosition);
    player.rotation.y = 0;

    currentWorldId = worldId;

    if (transitionCallback) {
        transitionCallback(worldId);
    }

    if (onComplete) {
        onComplete();
    }
}

export function createHouseInterior(houseType) {
    const group = new THREE.Group();
    group.name = `interior-${houseType}`;

    // Suelo
    const floorGeo = new THREE.PlaneGeometry(6, 6);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x8b6f47, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    // Paredes
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5deb3 });
    const wallThickness = 0.2;
    const wallHeight = 4;
    const roomSize = 6;

    // Pared trasera
    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(roomSize, wallHeight, wallThickness),
        wallMat
    );
    backWall.position.set(0, wallHeight / 2, -roomSize / 2);
    backWall.receiveShadow = true;
    group.add(backWall);

    // Pared izquierda
    const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, roomSize),
        wallMat
    );
    leftWall.position.set(-roomSize / 2, wallHeight / 2, 0);
    leftWall.receiveShadow = true;
    group.add(leftWall);

    // Pared derecha
    const rightWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, roomSize),
        wallMat
    );
    rightWall.position.set(roomSize / 2, wallHeight / 2, 0);
    rightWall.receiveShadow = true;
    group.add(rightWall);

    // Techo
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), wallMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = wallHeight;
    ceiling.receiveShadow = true;
    group.add(ceiling);

    // Puerta de salida
    const doorGeo = new THREE.BoxGeometry(1.5, 2.5, 0.2);
    const doorMat = createToonMaterial(0x5d4a3a);
    const exitDoor = new THREE.Mesh(doorGeo, doorMat);
    const doorZ = roomSize / 2 - 0.1;
    exitDoor.position.set(0, 1.25, doorZ);
    exitDoor.castShadow = true;
    exitDoor.userData.isExitDoor = true;
    group.add(exitDoor);

    // Registrar interactable para salir
    registerInteractable({
        id: `exit-door-${houseType}`,
        position: new THREE.Vector3(0, PLAYER_CONFIG.baseHeight, doorZ),
        radius: TILE_SIZE,
        prompt: 'Presiona Enter para salir',
        message: [],
        onInteract: () => {
            const overlay = window.__interactionOverlay__;
            if (overlay && overlay.loadWorld) {
                overlay.loadWorld('exterior');
            }
        }
    });

    return group;
}

export function setupHouseInteriors(scene) {
    const interiors = ['green', 'blue', 'yellow1', 'yellow2'];
    
    interiors.forEach((houseType) => {
        const interior = createHouseInterior(houseType);
        const spawnPos = new THREE.Vector3(0, PLAYER_CONFIG.baseHeight, 2);
        registerWorld(`interior-${houseType}`, interior, spawnPos);
    });
}
