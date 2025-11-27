import * as THREE from 'three';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../config/index.js';
import { GRASS_TEXTURE_PATH, MIX_TEXTURE_PATH } from '../config/assets.js';
import { INTERACTION_DIALOGUES } from '../config/dialogues.js';
import { createToonMaterial } from './materials.js';
import { transitionTo } from './transitionService.js';
import { loadCachedTexture } from '../rendering/assetCache.js';
import { sharedGeometries } from '../shared/index.js';

const HALF_WORLD_WIDTH = (MAP_WIDTH * TILE_SIZE) / 2;
const HALF_WORLD_HEIGHT = (MAP_HEIGHT * TILE_SIZE) / 2;
const BASE_GRASS_COLOR = 0x5db85d;
const GRASS_TEXTURE = loadGrassTexture();
const GRASS_MATERIALS = createGrassMaterials(GRASS_TEXTURE);
const MIX_TEXTURE = loadMixTexture();
const MIX_MATERIALS = createMixMaterials(MIX_TEXTURE);
const PATH_TILE_TYPES = new Set([1, 10]);
const HOUSE_TILE_TYPES = new Set([5, 6, 7]);
const BLOCKING_TILE_TYPES = new Set([3, 4, 5, 6, 7, 9, 10, 11]);
const DEFAULT_ENTRY_SIGN_OFFSET = new THREE.Vector3(0.4, 0, TILE_SIZE + 0.05);
const HOUSE_ENTRY_SIGN_OFFSETS = Object.freeze({
    green: new THREE.Vector3(2.5, 0, TILE_SIZE + 0.05),
    blue: new THREE.Vector3(0.35 + TILE_SIZE, 0, TILE_SIZE + 0.05),
    yellow1: new THREE.Vector3(0.5 + 0.7, 0, TILE_SIZE + 0.05),
    yellow2: new THREE.Vector3(0.45, 0, TILE_SIZE + 0.05)
});
const HOUSE_DIALOGUE_KEYS = Object.freeze({
    green: 'houseGreen',
    blue: 'houseBlue',
    yellow1: 'houseYellow1',
    yellow2: 'houseYellow2'
});
const PATH_TEXTURE = createPathTexture();
const PATH_TEXTURE_REPEAT = new THREE.Vector2(MAP_WIDTH / 2, MAP_HEIGHT / 2);
const PATH_RESOLUTION = 10;
const PATH_BLEND_RADIUS = PATH_RESOLUTION * 2.8;
const PATH_LIGHT_TINT = new THREE.Color(0xf8e0c6);
const PATH_LIGHT_BLEND = 0.6;
const SOUTH_PROTECTED_ROW = MAP_HEIGHT - 4;

const treeModelLibrary = new Map();
let defaultTreeModel = null;
let grassDetailPrototype = null;
let rockPlantPrototype = null;
const flowerModelLibrary = [];
const treeInstances = new Set();
const interactables = [];

class GroundBatcher {
    constructor() {
        this.entries = new Map();
        this.tmpPosition = new THREE.Vector3();
        this.tmpEuler = new THREE.Euler();
        this.tmpQuaternion = new THREE.Quaternion();
        this.unitScale = new THREE.Vector3(1, 1, 1);
    }

    addInstance(material, gridX, gridY, rotationY = 0, offsetY = 0) {
        if (!material) return;
        let entry = this.entries.get(material);
        if (!entry) {
            entry = { material, matrices: [] };
            this.entries.set(material, entry);
        }

        const worldX = gridX * TILE_SIZE - HALF_WORLD_WIDTH;
        const worldZ = gridY * TILE_SIZE - HALF_WORLD_HEIGHT;
        const matrix = new THREE.Matrix4();
        this.tmpPosition.set(worldX, offsetY, worldZ);
        this.tmpQuaternion.setFromEuler(this.tmpEuler.set(0, rotationY, 0));
        matrix.compose(this.tmpPosition, this.tmpQuaternion, this.unitScale);
        entry.matrices.push(matrix);
    }

    commitTo(group) {
        if (!group) return;
        this.entries.forEach(({ material, matrices }) => {
            if (!matrices.length) return;
            const instanced = new THREE.InstancedMesh(sharedGeometries.plane, material, matrices.length);
            matrices.forEach((matrix, index) => {
                instanced.setMatrixAt(index, matrix);
            });
            instanced.instanceMatrix.needsUpdate = true;
            instanced.castShadow = false;
            instanced.receiveShadow = true;
            instanced.name = 'GroundBatch';
            group.add(instanced);
        });
    }
}

export function registerTreeInstance(object3D) {
    if (object3D) {
        treeInstances.add(object3D);
    }
}

export function getTreeInstances() {
    return treeInstances;
}

export function clearTreeInstances() {
    treeInstances.clear();
}

export function registerInteractable(entry = {}) {
    const {
        id,
        position,
        radius = TILE_SIZE,
        prompt = 'Presiona Enter para interactuar',
        message = [],
        onInteract = null,
        speaker = '',
        portrait = '',
        autoTrigger = false,
        choices = null,
        onChoiceSelect = null,
        worldId = 'exterior' // Mundo al que pertenece este interactable
    } = entry;
    if (!position) return;
    const safePosition = position.clone ? position.clone() : new THREE.Vector3(position.x ?? 0, position.y ?? 0, position.z ?? 0);
    const messages = Array.isArray(message)
        ? message.map((line) => `${line}`)
        : (message ? [`${message}`] : []);
    interactables.push({
        id: id ?? `interactable-${interactables.length}`,
        position: safePosition,
        radius,
        prompt,
        messages,
        onInteract,
        speaker,
        portrait,
        autoTrigger,
        choices: Array.isArray(choices) ? choices.map((choice) => ({
            id: choice?.id ?? choice?.value ?? choice?.label ?? String(choice),
            label: choice?.label ?? choice?.id ?? String(choice)
        })) : null,
        onChoiceSelect,
        worldId, // Guardar worldId
        __autoShown: false
    });
}

export function getInteractables(filterWorldId = null) {
    if (!filterWorldId) return interactables;
    return interactables.filter(obj => obj.worldId === filterWorldId);
}

export function clearInteractables() {
    interactables.length = 0;
}

export function registerTreeModel(name, modelScene, { isDefault = false } = {}) {
    if (!modelScene) return;
    modelScene.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    treeModelLibrary.set(name, modelScene);
    if (isDefault || !defaultTreeModel) {
        defaultTreeModel = modelScene;
    }
}

export function setGrassDetailModel(modelScene) {
    if (!modelScene) return;
    modelScene.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    grassDetailPrototype = modelScene;
}

export function setRockPlantModel(modelScene) {
    if (!modelScene) return;
    modelScene.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    rockPlantPrototype = modelScene;
}

export function registerFlowerModel(modelScene) {
    if (!modelScene) return;
    modelScene.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    flowerModelLibrary.push(modelScene);
}

function isGrassTile(tileValue) {
    return tileValue === 0 || tileValue === 3 || tileValue === 4 || tileValue === 5 || tileValue === 6 || tileValue === 7 || tileValue === 8 || tileValue === 9 || tileValue === 11;
}

function pseudoRandom2D(x, y) {
    const seed = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return seed - Math.floor(seed);
}

function createMixMaterials(baseTexture) {
    const template = createToonMaterial(BASE_GRASS_COLOR);
    const quadrants = [
        { key: '0-0', offsetX: 0, offsetY: 0 },
        { key: '1-0', offsetX: 0.5, offsetY: 0 },
        { key: '0-1', offsetX: 0, offsetY: 0.5 },
        { key: '1-1', offsetX: 0.5, offsetY: 0.5 }
    ];

    return quadrants.reduce((map, { key, offsetX, offsetY }) => {
        const material = template.clone();
        const texture = baseTexture.clone();
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(0.5, 0.5);
        texture.offset.set(offsetX, offsetY);
        texture.needsUpdate = true;

        material.map = texture;
        material.color.set(0xffffff);
        material.needsUpdate = true;
        map.set(key, material);
        return map;
    }, new Map());
}

export function buildTileMap() {
    const map = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));

    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            map[y][x] = 3;
        }
    }

    fillRandom(map, { xStart: 0, xEnd: 4, yStart: 4, yEnd: 12 }, 4, 0.4);
    fillRandom(map, { xStart: 26, xEnd: MAP_WIDTH, yStart: 4, yEnd: 12 }, 4, 0.4);
    fillRandom(map, { xStart: 0, xEnd: 5, yStart: 16, yEnd: 26 }, 4, 0.5);

    for (let y = 26; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (x < 8 || x > 23 || y > 27) {
                map[y][x] = 3;
            }
        }
    }

    for (let x = 8; x < 24; x++) {
        map[25][x] = 4;
    }

    for (let y = 10; y < 20; y++) {
        for (let x = 14; x < 18; x++) {
            map[y][x] = 1;
        }
    }

    for (let y = 19; y < 20; y++) {
        for (let x = 11; x < 22; x++) {
            map[y][x] = 1;
        }
    }

    fillRect(map, 9, 13, 5, 9, 5);
    fillRect(map, 20, 24, 5, 9, 6);

    for (let x = 6; x < 9; x++) map[6][x] = 9;
    for (let y = 7; y < 9; y++) map[y][6] = 9;
    map[7][7] = 8;
    map[8][7] = 8;

    map[7][19] = 8;
    map[8][19] = 8;
    map[7][24] = 11;

    fillRect(map, 6, 9, 13, 16, 7);
    map[16][5] = 8;
    map[17][5] = 8;
    map[18][6] = 8;
    map[18][7] = 8;

    fillRect(map, 21, 24, 20, 23, 7);
    map[15][24] = 11;
    map[17][15] = 10;

    for (let y = 26; y < 29; y++) {
        for (let x = 28; x < MAP_WIDTH; x++) {
            map[y][x] = 2;
        }
    }

    return map;
}

export function getGrassTilesTouchingPath(tileMap) {
    const grassTiles = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (!isGrassTile(tileMap[y][x])) continue;
            if (isGrassTileTouchingPath(x, y, tileMap)) {
                grassTiles.push({ x, y });
            }
        }
    }
    return grassTiles;
}

function isGrassTileTouchingPath(x, y, tileMap) {
    const neighbors = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 }
    ];
    return neighbors.some(({ dx, dy }) => {
        const nx = x + dx;
        const ny = y + dy;
        if (!isInBounds(nx, ny)) return false;
        return PATH_TILE_TYPES.has(tileMap[ny][nx]);
    });
}

export function createHouseRecords() {
    return {
        green: { tiles: [], type: 'green' },
        blue: { tiles: [], type: 'blue' },
        yellow1: { tiles: [], type: 'yellow1' },
        yellow2: { tiles: [], type: 'yellow2' }
    };
}

export function populateWorld(worldGroup, tileMap, houseRecords) {
    const groundBatcher = new GroundBatcher();
    clearTreeInstances();
    clearInteractables();
    addPathOverlay(worldGroup, tileMap);
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tile = createTile(x, y, tileMap[y][x], houseRecords, tileMap, groundBatcher);
            worldGroup.add(tile);
        }
    }
    groundBatcher.commitTo(worldGroup);
    registerHouseEntrySigns(houseRecords);
}

function createTile(gridX, gridY, type, houseRecords, tileMap, groundBatcher) {
    const group = new THREE.Group();
    const worldPosition = gridToWorldPosition(gridX, gridY);

    const addGround = (color, emissive = 0x000000, offsetY = 0, materialOverride = null) => {
        const material = materialOverride ?? createToonMaterial(color, emissive);
        const mesh = new THREE.Mesh(sharedGeometries.plane, material);
        mesh.receiveShadow = true;
        mesh.position.y = offsetY;
        group.add(mesh);
        return mesh;
    };

    const addGrassGround = (gridX, gridY, tileMap, offsetY = 0) => {
        const touchesPath = isGrassTileTouchingPath(gridX, gridY, tileMap);
        const material = touchesPath ? getMixMaterial(gridX, gridY) : getGrassMaterial(gridX, gridY);
        const rotation = touchesPath && touchesPathLaterally(gridX, gridY, tileMap) ? Math.PI / 2 : 0;
        if (groundBatcher) {
            groundBatcher.addInstance(material, gridX, gridY, rotation, offsetY);
        } else {
            const mesh = addGround(BASE_GRASS_COLOR, 0x000000, offsetY, material);
            if (rotation !== 0) {
                mesh.rotation.y = rotation;
            }
        }
    };

    const touchesPathLaterally = (x, y, tileMap) => {
        const left = x > 0 && PATH_TILE_TYPES.has(tileMap[y][x - 1]);
        const right = x < MAP_WIDTH - 1 && PATH_TILE_TYPES.has(tileMap[y][x + 1]);
        return left || right;
    };

    switch (type) {
        case 0:
            addGrassGround(gridX, gridY, tileMap);
            addGrassDetailIfNeeded(group, gridX, gridY, tileMap);
            break;
        case 1:
            addGround(0xdaa520);
            break;
        case 2:
            addGround(0x4a90d9, 0x2060a0, -0.15);
            break;
        case 3:
            addGrassGround(gridX, gridY, tileMap);
            addTreeModelInstance(group, 'dense', gridX, gridY);
            break;
        case 4:
            addGrassGround(gridX, gridY, tileMap);
            addTreeModelInstance(group, 'tall', gridX, gridY);
            break;
        case 5:
            addGrassGround(gridX, gridY, tileMap);
            trackHouseTile(group, gridX, gridY, houseRecords.green.tiles, 'green');
            break;
        case 6:
            addGrassGround(gridX, gridY, tileMap);
            trackHouseTile(group, gridX, gridY, houseRecords.blue.tiles, 'blue');
            break;
        case 7:
            addGrassGround(gridX, gridY, tileMap);
            if (gridY < 18) {
                trackHouseTile(group, gridX, gridY, houseRecords.yellow1.tiles, 'yellow1');
            } else {
                trackHouseTile(group, gridX, gridY, houseRecords.yellow2.tiles, 'yellow2');
            }
            break;
        case 8:
            addGrassGround(gridX, gridY, tileMap);
            addFlowerModelInstances(group, gridX, gridY);
            break;
        case 9:
            addGrassGround(gridX, gridY, tileMap);
            for (let i = 0; i < 3; i++) {
                const post = new THREE.Mesh(sharedGeometries.fencePost, createToonMaterial(0x8b4513));
                post.position.set(-0.3 + i * 0.3, 0.25, 0);
                post.castShadow = true;
                group.add(post);
            }
            break;
        case 10:
            addGround(0xdaa520);
            addSignDecoration(group);
            registerInteractable({
                id: `sign-${gridX}-${gridY}`,
                position: worldPosition,
                radius: TILE_SIZE,
                ...INTERACTION_DIALOGUES.signWelcome
            });
            break;
        case 11:
            addGrassGround(gridX, gridY, tileMap);
            const placedRock = addRockPlantInstance(group, gridX, gridY);
            if (!placedRock) {
                addProceduralRock(group, gridX, gridY);
            }
            break;
        default:
            addGround(0x5db85d);
            break;
    }

    group.position.copy(worldPosition);

    return group;
}

function gridToWorldPosition(gridX, gridY) {
    return new THREE.Vector3(
        gridX * TILE_SIZE - HALF_WORLD_WIDTH,
        0,
        gridY * TILE_SIZE - HALF_WORLD_HEIGHT
    );
}

function getGrassMaterial(gridX, gridY) {
    const key = `${gridX % 2}-${gridY % 2}`;
    return GRASS_MATERIALS.get(key);
}

function getMixMaterial(gridX, gridY) {
    const key = `${gridX % 2}-${gridY % 2}`;
    return MIX_MATERIALS.get(key);
}

function createGrassMaterials(baseTexture) {
    const template = createToonMaterial(BASE_GRASS_COLOR);
    const quadrants = [
        { key: '0-0', offsetX: 0, offsetY: 0 },
        { key: '1-0', offsetX: 0.5, offsetY: 0 },
        { key: '0-1', offsetX: 0, offsetY: 0.5 },
        { key: '1-1', offsetX: 0.5, offsetY: 0.5 }
    ];

    return quadrants.reduce((map, { key, offsetX, offsetY }) => {
        const material = template.clone();
        const texture = baseTexture.clone();
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(0.5, 0.5);
        texture.offset.set(offsetX, offsetY);
        texture.needsUpdate = true;

        material.map = texture;
        material.color.set(0xffffff);
        material.needsUpdate = true;
        map.set(key, material);
        return map;
    }, new Map());
}

function loadGrassTexture() {
    const url = new URL(GRASS_TEXTURE_PATH, import.meta.url).href;
    return loadCachedTexture(url, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;
    });
}

function loadMixTexture() {
    const url = new URL(MIX_TEXTURE_PATH, import.meta.url).href;
    return loadCachedTexture(url, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;
    });
}

function addGrassDetailIfNeeded(group, gridX, gridY, tileMap) {
    if (!grassDetailPrototype) return;
    if (isGrassTileTouchingPath(gridX, gridY, tileMap)) return;

    const nearHouse = touchesHouseTile(gridX, gridY, tileMap);
    const variation = (pseudoRandom2D(gridX + 101, gridY + 131) - 0.5) * 0.18;
    const spawnChance = Math.min(0.55, Math.max(0.04, (nearHouse ? 0.28 : 0.12) + variation));
    if (pseudoRandom2D(gridX + 211, gridY + 199) > spawnChance) return;

    const clusterCount = nearHouse
        ? (pseudoRandom2D(gridX + 17, gridY + 19) > 0.65 ? 2 : 1)
        : (pseudoRandom2D(gridX + 223, gridY + 227) > 0.85 ? 2 : 1);

    for (let i = 0; i < clusterCount; i++) {
        const detail = grassDetailPrototype.clone(true);
        const radius = 0.12 + pseudoRandom2D(gridX + 41 + i * 7, gridY + 43 + i * 11) * 0.28;
        const angle = pseudoRandom2D(gridX + 59 + i * 13, gridY + 67 + i * 17) * Math.PI * 2;
        const offsetX = Math.cos(angle) * radius;
        const offsetZ = Math.sin(angle) * radius;
        const scale = 2.2 + pseudoRandom2D(gridX + 71 + i * 5, gridY + 73 + i * 9) * 0.9;

        detail.position.set(offsetX, 0, offsetZ);
        detail.rotation.y = pseudoRandom2D(gridX + 91 + i * 3, gridY + 97 + i) * Math.PI * 2;
        detail.scale.multiplyScalar(scale);
        group.add(detail);
    }
}

function addSignDecoration(targetGroup, offset = new THREE.Vector3()) {
    const signPost = new THREE.Mesh(sharedGeometries.signPost, createToonMaterial(0x6b4423));
    signPost.position.set(offset.x, 0.35 + offset.y, offset.z);
    signPost.castShadow = true;
    targetGroup.add(signPost);

    const signBoard = new THREE.Mesh(sharedGeometries.signBoard, createToonMaterial(0x8b6914));
    signBoard.position.set(offset.x, 0.75 + offset.y, offset.z);
    signBoard.castShadow = true;
    targetGroup.add(signBoard);
}

function registerHouseEntrySigns(houseRecords) {
    Object.values(houseRecords).forEach((record) => {
        const tiles = record?.tiles ?? [];
        if (!tiles.length) return;
        const entryTile = findEntranceTile(tiles);
        if (!entryTile) return;
        addHouseEntrySign(entryTile, record.type ?? entryTile.userData?.houseType ?? 'house');
    });
}

function findEntranceTile(tiles) {
    return tiles.reduce((best, group) => {
        const gy = group.userData?.gridY ?? -Infinity;
        if (!best) return group;
        const bestGy = best.userData?.gridY ?? -Infinity;
        if (gy > bestGy) return group;
        if (gy === bestGy) {
            const gx = group.userData?.gridX ?? 0;
            const bestGx = best.userData?.gridX ?? 0;
            return gx < bestGx ? group : best;
        }
        return best;
    }, null);
}

function addHouseEntrySign(tileGroup, houseType) {
    if (!tileGroup || tileGroup.userData?.entrySign) return;
    const offsetTemplate = HOUSE_ENTRY_SIGN_OFFSETS[houseType] ?? DEFAULT_ENTRY_SIGN_OFFSET;
    const offset = offsetTemplate.clone();
    const position = tileGroup.position.clone().add(offset);
    tileGroup.userData.entrySign = true;
    const dialogue = INTERACTION_DIALOGUES[HOUSE_DIALOGUE_KEYS[houseType]] ?? INTERACTION_DIALOGUES.signWelcome;
    registerInteractable({
        id: `house-entry-${houseType}-${tileGroup.userData?.gridX}-${tileGroup.userData?.gridY}`,
        position,
        radius: TILE_SIZE,
        ...dialogue,
        worldId: 'exterior',
        onChoiceSelect: (choice) => {
            if (choice.id !== 'yes') return;
            const scene = window.__scene__;
            const player = window.__player__;
            const physics = window.__physics__;
            if (!scene || !player) return;
            const returnPos = player.position.clone();
            transitionTo({
                worldId: `interior-${houseType}`,
                scene,
                player,
                physics,
                returnPos,
                reason: 'enter-house'
            });
        }
    });
}

function addRockPlantInstance(group, gridX, gridY) {
    if (!rockPlantPrototype) {
        return false;
    }

    const instance = rockPlantPrototype.clone(true);
    const scale = 0.1;
    instance.scale.setScalar(scale);
    instance.rotation.y += pseudoRandom2D(gridX + 331, gridY + 337) * Math.PI * 2;
    group.add(instance);
    return true;
}

function touchesHouseTile(x, y, tileMap) {
    const neighbors = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 }
    ];
    return neighbors.some(({ dx, dy }) => {
        const nx = x + dx;
        const ny = y + dy;
        if (!isInBounds(nx, ny)) return false;
        return HOUSE_TILE_TYPES.has(tileMap[ny][nx]);
    });
}

function addTreeModelInstance(group, variant, gridX, gridY) {
    const availableModels = treeModelLibrary.size > 0
        ? Array.from(treeModelLibrary.values())
        : (defaultTreeModel ? [defaultTreeModel] : []);

    const prototype = availableModels.length > 0
        ? availableModels[Math.floor(pseudoRandom2D(gridX + 13, gridY + 29) * availableModels.length)]
        : null;

    if (!prototype) {
        if (variant === 'dense') {
            addTree(sharedGeometries.denseTrunk, sharedGeometries.denseLeaves, group, 0x5a3a1a, 0x2d5c2d, 1, 2.2, 1.3);
        } else {
            addTree(sharedGeometries.treeTrunk, sharedGeometries.treeLeaves, group, 0x6b4423, 0x3d7a3d, 0.7, 1.6, 1);
        }
        return;
    }

    const tree = prototype.clone(true);
    const baseScale = variant === 'dense' ? 1.05 : 0.9;
    const jitter = (pseudoRandom2D(gridX, gridY) - 0.5) * 0.25;
    const finalScale = Math.max(0.65, baseScale + jitter);
    tree.scale.multiplyScalar(finalScale);
    tree.position.set(0, 0, 0);
    tree.rotation.y += pseudoRandom2D(gridX + 17, gridY + 31) * Math.PI * 2;
    tree.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    group.add(tree);
    registerTreeInstance(tree);
}

function addTree(trunkGeo, leavesGeo, group, trunkColor, leavesColor, trunkHeight, leavesHeight, leavesScaleY) {
    const treeGroup = new THREE.Group();
    treeGroup.name = 'ProceduralTree';

    const trunk = new THREE.Mesh(trunkGeo, createToonMaterial(trunkColor));
    trunk.position.y = trunkHeight;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const leaves = new THREE.Mesh(leavesGeo, createToonMaterial(leavesColor));
    leaves.position.y = leavesHeight;
    leaves.scale.y = leavesScaleY;
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    treeGroup.add(leaves);

    group.add(treeGroup);
    registerTreeInstance(treeGroup);
}

function addFlowerModelInstances(group, gridX, gridY) {
    if (flowerModelLibrary.length === 0) {
        return;
    }

    const instanceCount = 1 + Math.floor(pseudoRandom2D(gridX + 401, gridY + 407) * 2);
    for (let i = 0; i < instanceCount; i++) {
        const base = flowerModelLibrary[Math.floor(pseudoRandom2D(gridX + 409 + i * 7, gridY + 419 + i * 11) * flowerModelLibrary.length)];
        if (!base) continue;
        const flower = base.clone(true);
        const radius = 0.08 + pseudoRandom2D(gridX + 431 + i * 5, gridY + 439 + i * 3) * 0.28;
        const angle = pseudoRandom2D(gridX + 443 + i * 13, gridY + 449 + i * 17) * Math.PI * 2;
        flower.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        const scale = 0.85 + pseudoRandom2D(gridX + 457 + i * 23, gridY + 463 + i * 19) * 0.55;
        flower.scale.multiplyScalar(scale);
        flower.rotation.y = pseudoRandom2D(gridX + 467 + i * 29, gridY + 479 + i * 31) * Math.PI * 2;
        group.add(flower);
    }
}

function addMailboxDecoration(group, gridX, gridY) {
    const offsetX = (pseudoRandom2D(gridX + 521, gridY + 517) - 0.5) * 0.7;
    const offsetZ = (pseudoRandom2D(gridX + 533, gridY + 541) - 0.5) * 0.7;
    const rotation = pseudoRandom2D(gridX + 547, gridY + 557) * Math.PI * 2;
    const scale = 0.85 + pseudoRandom2D(gridX + 563, gridY + 571) * 0.4;

    const mailboxPost = new THREE.Mesh(sharedGeometries.mailboxPost, createToonMaterial(0x696969));
    mailboxPost.position.set(offsetX, 0.25, offsetZ);
    mailboxPost.rotation.y = rotation;
    mailboxPost.scale.setScalar(scale);
    group.add(mailboxPost);

    const mailbox = new THREE.Mesh(sharedGeometries.mailboxBox, createToonMaterial(0xc0c0c0));
    mailbox.position.set(offsetX, 0.55 * scale, offsetZ + 0.05);
    mailbox.rotation.y = rotation;
    mailbox.scale.multiplyScalar(scale);
    mailbox.castShadow = true;
    group.add(mailbox);
}

function trackHouseTile(group, x, y, collection, type) {
    group.userData.houseType = type;
    group.userData.gridX = x;
    group.userData.gridY = y;
    collection.push(group);
}

function isInBounds(x, y) {
    return x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT;
}

function addPathOverlay(worldGroup, tileMap) {
    const blendTexture = createPathBlendTexture(tileMap);
    const material = createPathShaderMaterial(PATH_TEXTURE, blendTexture);
    const geometry = new THREE.PlaneGeometry(MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE, 1, 1);
    const overlay = new THREE.Mesh(geometry, material);
    overlay.rotation.x = -Math.PI / 2;
    overlay.position.set(-TILE_SIZE / 2, 0.011, -TILE_SIZE / 2);
    overlay.renderOrder = 1;
    overlay.name = 'PathBlendOverlay';
    worldGroup.add(overlay);
}

function createPathShaderMaterial(pathTexture, blendTexture) {
    return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
            pathTexture: { value: pathTexture },
            blendMap: { value: blendTexture },
            textureRepeat: { value: PATH_TEXTURE_REPEAT.clone() },
            pathTint: { value: new THREE.Vector3(PATH_LIGHT_TINT.r, PATH_LIGHT_TINT.g, PATH_LIGHT_TINT.b) },
            pathTintStrength: { value: PATH_LIGHT_BLEND }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            uniform sampler2D pathTexture;
            uniform sampler2D blendMap;
            uniform vec2 textureRepeat;
            uniform vec3 pathTint;
            uniform float pathTintStrength;

            void main() {
                float blend = texture2D(blendMap, vUv).r;
                if (blend >= 0.999) discard;

                vec4 pathColor = texture2D(pathTexture, vUv * textureRepeat);
                pathColor.rgb = mix(pathColor.rgb, pathTint, pathTintStrength);
                float alpha = 1.0 - blend;
                if (alpha <= 0.01) discard;

                gl_FragColor = vec4(pathColor.rgb, alpha);
            }
        `
    });
}

function createPathBlendTexture(tileMap) {
    const width = MAP_WIDTH * PATH_RESOLUTION;
    const height = MAP_HEIGHT * PATH_RESOLUTION;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const mask = new Uint8Array(width * height);
    markPathPixels(mask, tileMap, width);
    const distanceField = createDistanceField(mask, width, height);

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    for (let i = 0; i < distanceField.length; i++) {
        const dist = Math.min(distanceField[i], PATH_BLEND_RADIUS);
        const t = dist / PATH_BLEND_RADIUS;
        const smooth = t * t * (3 - 2 * t);
        const value = Math.floor(smooth * 255);
        const offset = i * 4;
        data[offset] = value;
        data[offset + 1] = value;
        data[offset + 2] = value;
        data[offset + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
}

function createDistanceField(mask, width, height) {
    const size = width * height;
    const dist = new Float32Array(size);
    const INF = Number.POSITIVE_INFINITY;

    for (let i = 0; i < size; i++) {
        dist[i] = mask[i] ? 0 : INF;
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            let best = dist[idx];
            if (x > 0) best = Math.min(best, dist[idx - 1] + 1);
            if (y > 0) best = Math.min(best, dist[idx - width] + 1);
            if (x > 0 && y > 0) best = Math.min(best, dist[idx - width - 1] + Math.SQRT2);
            if (x < width - 1 && y > 0) best = Math.min(best, dist[idx - width + 1] + Math.SQRT2);
            dist[idx] = best;
        }
    }

    for (let y = height - 1; y >= 0; y--) {
        for (let x = width - 1; x >= 0; x--) {
            const idx = y * width + x;
            let best = dist[idx];
            if (x < width - 1) best = Math.min(best, dist[idx + 1] + 1);
            if (y < height - 1) best = Math.min(best, dist[idx + width] + 1);
            if (x < width - 1 && y < height - 1) best = Math.min(best, dist[idx + width + 1] + Math.SQRT2);
            if (x > 0 && y < height - 1) best = Math.min(best, dist[idx + width - 1] + Math.SQRT2);
            dist[idx] = best;
        }
    }

    return dist;
}

function markPathPixels(mask, tileMap, textureWidth) {
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (!PATH_TILE_TYPES.has(tileMap[y][x])) continue;
            const startX = x * PATH_RESOLUTION;
            const startY = y * PATH_RESOLUTION;
            for (let py = 0; py < PATH_RESOLUTION; py++) {
                const rowOffset = (startY + py) * textureWidth + startX;
                mask.fill(1, rowOffset, rowOffset + PATH_RESOLUTION);
            }
        }
    }
}

function createPathTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#d4a574';
    ctx.fillRect(0, 0, size, size);

    const colors = ['#c9995f', '#dfb185', '#caa168', '#e0bd95'];
    for (let i = 0; i < 1200; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillStyle = color;
        const w = 1 + Math.random() * 2;
        ctx.fillRect(Math.random() * size, Math.random() * size, w, w);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
}

function fillRect(map, xStart, xEnd, yStart, yEnd, value) {
    for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
            map[y][x] = value;
        }
    }
}

function fillRandom(map, bounds, value, threshold) {
    for (let y = bounds.yStart; y < bounds.yEnd; y++) {
        for (let x = bounds.xStart; x < bounds.xEnd; x++) {
            if (Math.random() > threshold) {
                map[y][x] = value;
            }
        }
    }
}
