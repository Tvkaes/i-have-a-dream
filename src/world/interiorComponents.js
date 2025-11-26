import * as THREE from 'three';
import { createToonMaterial } from './materials.js';

/**
 * Crea el suelo de un interior
 */
export function createFloor(roomSize, floorColor) {
    const floorGeo = new THREE.PlaneGeometry(roomSize, roomSize);
    const floorMat = new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    return floor;
}

/**
 * Crea las paredes de un interior (trasera, izquierda, derecha)
 */
export function createWalls(roomSize, wallHeight, wallColor) {
    const walls = [];
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor });
    const wallThickness = 0.2;

    // Pared trasera
    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(roomSize, wallHeight, wallThickness),
        wallMat
    );
    backWall.position.set(0, wallHeight / 2, -roomSize / 2);
    backWall.receiveShadow = true;
    walls.push(backWall);

    // Pared izquierda
    const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, roomSize),
        wallMat
    );
    leftWall.position.set(-roomSize / 2, wallHeight / 2, 0);
    leftWall.receiveShadow = true;
    walls.push(leftWall);

    // Pared derecha
    const rightWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, roomSize),
        wallMat
    );
    rightWall.position.set(roomSize / 2, wallHeight / 2, 0);
    rightWall.receiveShadow = true;
    walls.push(rightWall);

    return walls;
}

/**
 * Crea el techo de un interior
 */
export function createCeiling(roomSize, wallHeight, ceilingColor) {
    const ceilingMat = new THREE.MeshStandardMaterial({ color: ceilingColor });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = wallHeight;
    ceiling.receiveShadow = true;
    return ceiling;
}

/**
 * Crea los muebles desde una lista de configuración
 */
export function createFurniture(furnitureList) {
    return furnitureList.map(item => {
        const furnitureMat = createToonMaterial(item.color);
        const furnitureGeo = new THREE.BoxGeometry(item.size[0], item.size[1], item.size[2]);
        const furnitureMesh = new THREE.Mesh(furnitureGeo, furnitureMat);
        furnitureMesh.position.set(item.pos[0], item.pos[1], item.pos[2]);
        furnitureMesh.castShadow = true;
        furnitureMesh.receiveShadow = true;
        return furnitureMesh;
    });
}

/**
 * Crea la puerta de salida de un interior
 */
export function createExitDoor(roomSize) {
    const doorGeo = new THREE.BoxGeometry(1.5, 2.5, 0.2);
    const doorMat = createToonMaterial(0x5d4a3a);
    const exitDoor = new THREE.Mesh(doorGeo, doorMat);
    const doorZ = roomSize / 2 - 0.1;
    exitDoor.position.set(0, 1.25, doorZ);
    exitDoor.castShadow = true;
    exitDoor.userData.isExitDoor = true;
    return { door: exitDoor, doorZ };
}
