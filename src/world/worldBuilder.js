import * as THREE from 'three';
import { PLAYER_CONFIG, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../config/index.js';
import {
    buildTileMap,
    createHouseRecords,
    populateWorld
} from './index.js';
import { clearLandmarks } from './landmarks.js';
import { loadHouseClusters } from './houses.js';
import {
    loadTreePrototypes,
    loadGrassDetailModel,
    loadRockPlantModel,
    loadFlowerModels
} from '../rendering/loaders.js';
import { createBlockingColliders } from '../physics/index.js';

const BLOCKING_TILE_TYPES = new Set([3, 4, 5, 6, 7, 9, 10, 11]);

export function preloadEnvironmentAssets(gltfLoader) {
    return Promise.all([
        loadTreePrototypes(gltfLoader),
        loadGrassDetailModel(gltfLoader),
        loadRockPlantModel(gltfLoader),
        loadFlowerModels(gltfLoader)
    ]);
}

export function buildWorld(scene, gltfLoader, physics) {
    clearLandmarks();
    const worldGroup = new THREE.Group();
    worldGroup.userData.isWorldGroup = true;
    scene.add(worldGroup);

    const tileMap = buildTileMap();
    const houseRecords = createHouseRecords();
    populateWorld(worldGroup, tileMap, houseRecords);
    loadHouseClusters(worldGroup, houseRecords, gltfLoader, physics);
    createBlockingColliders({
        physics,
        tileMap,
        tileSize: TILE_SIZE,
        mapWidth: MAP_WIDTH,
        mapHeight: MAP_HEIGHT,
        blockingTiles: BLOCKING_TILE_TYPES,
        worldId: 'exterior'
    });
    return worldGroup;
}
