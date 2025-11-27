import * as THREE from 'three';
import {
    TILE_SIZE,
    MAP_WIDTH,
    MAP_HEIGHT,
    HOUSE_MODEL_ORDER,
    HOUSE_ROTATIONS,
    HOUSE_SCALE_MULTIPLIERS,
    GLB_TOON_BANDS,
    PLAYER_CONFIG
} from '../config/index.js';
import { applyToonMaterial } from './materials.js';
import { scratch } from '../shared/index.js';
import { setLandmark } from './landmarks.js';

const MAIN_HOUSE_STAGE_OFFSET = new THREE.Vector3(0, 0, 4);
const PLAYER_STAGE_OFFSET = new THREE.Vector3(-1.4, 0, 1.4);
const OPPONENT_STAGE_OFFSET = new THREE.Vector3(1.4, 0, -1.1);
const CAMERA_STAGE_OFFSET = new THREE.Vector3(-6.5, 4.5, 6);
const MAIN_HOUSE_LANDMARK_ID = 'main-house-center';
const BATTLE_PLAYER_LANDMARK = 'battle-player-pos';
const BATTLE_OPPONENT_LANDMARK = 'battle-opponent-pos';
const BATTLE_CAMERA_LANDMARK = 'battle-camera-pos';

const loadedGroups = new WeakSet();

export function loadHouseClusters(worldGroup, houseRecords, gltfLoader, physics) {
    if (!worldGroup || !houseRecords || !gltfLoader) {
        throw new Error('loadHouseClusters requiere worldGroup, houseRecords y gltfLoader');
    }

function registerHouseLandmarks(cluster) {
    if (!cluster?.tiles?.length) return;
    const center = cluster.center?.clone?.() ?? new THREE.Vector3();
    if (cluster.type === 'green') {
        setLandmark(MAIN_HOUSE_LANDMARK_ID, { position: center });
        setLandmark(BATTLE_PLAYER_LANDMARK, { position: center.clone().add(PLAYER_STAGE_OFFSET) });
        setLandmark(BATTLE_OPPONENT_LANDMARK, { position: center.clone().add(OPPONENT_STAGE_OFFSET) });
        setLandmark(BATTLE_CAMERA_LANDMARK, { position: center.clone().add(CAMERA_STAGE_OFFSET) });
    }
}

    if (loadedGroups.has(worldGroup)) {
        return;
    }

    const clusters = collectClusters(houseRecords);
    if (!clusters.length) {
        return;
    }

    loadedGroups.add(worldGroup);

    clusters.forEach((cluster, index) => {
        const url = HOUSE_MODEL_ORDER[index % HOUSE_MODEL_ORDER.length];
        gltfLoader.load(
            url,
            ({ scene }) => {
                prepareHouseModel(scene, cluster, url);
                worldGroup.add(scene);
                registerHouseLandmarks(cluster);
                setTimeout(() => applyToonMaterial(scene, GLB_TOON_BANDS), 0);
                if (physics?.world && physics?.rapier) {
                    addPhysicsColliderForHouse(scene, physics);
                }
            },
            undefined,
            (error) => {
                console.error(`✗ Error cargando ${url}:`, error);
            }
        );
    });
}

function collectClusters(houseRecords) {
    const tileMap = new Map();

    Object.entries(houseRecords).forEach(([type, record]) => {
        record.tiles.forEach((group) => {
            const { gridX, gridY } = group.userData;
            if (gridX === undefined || gridY === undefined) return;
            tileMap.set(`${gridX},${gridY}`, { group, type });
        });
    });

    const visited = new Set();
    const clusters = [];

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const key = `${x},${y}`;
            if (!tileMap.has(key) || visited.has(key)) continue;

            const startNode = tileMap.get(key);
            const queue = [{ x, y }];
            const tiles = [];
            visited.add(key);

            while (queue.length) {
                const { x: cx, y: cy } = queue.shift();
                const currentKey = `${cx},${cy}`;
                const node = tileMap.get(currentKey);
                if (!node || node.type !== startNode.type) continue;

                tiles.push({ gx: cx, gy: cy, group: node.group });

                const neighbors = [
                    { nx: cx + 1, ny: cy },
                    { nx: cx - 1, ny: cy },
                    { nx: cx, ny: cy + 1 },
                    { nx: cx, ny: cy - 1 }
                ];

                neighbors.forEach(({ nx, ny }) => {
                    if (nx < 0 || ny < 0 || nx >= MAP_WIDTH || ny >= MAP_HEIGHT) return;
                    const neighborKey = `${nx},${ny}`;
                    if (visited.has(neighborKey)) return;
                    const neighborNode = tileMap.get(neighborKey);
                    if (!neighborNode || neighborNode.type !== startNode.type) return;
                    visited.add(neighborKey);
                    queue.push({ x: nx, y: ny });
                });
            }

            if (!tiles.length) continue;

            const center = new THREE.Vector3();
            tiles.forEach(({ group }) => center.add(group.position));
            center.divideScalar(tiles.length);

            clusters.push({ type: startNode.type, tiles, center });
        }
    }

    return filterClusters(clusters);
}

function filterClusters(clusters) {
    const filtered = [];

    clusters.forEach((cluster) => {
        const tooClose = filtered.some((other) => other.center.distanceTo(cluster.center) < 2);
        if (!tooClose) {
            filtered.push(cluster);
        }
    });

    return filtered;
}

function prepareHouseModel(model, cluster, url) {
    model.userData.isGLBHouse = true;

    const rotation = HOUSE_ROTATIONS[url] || { x: 0, y: Math.PI };
    model.rotation.x = rotation.x ?? 0;
    model.rotation.y = rotation.y ?? 0;

    const footprint = getFootprint(cluster.tiles);
    scaleObjectToFootprint(model, footprint);

    const multiplier = HOUSE_SCALE_MULTIPLIERS[url] ?? 1;
    model.scale.multiplyScalar(multiplier);

    alignToGround(model);
    alignToCenter(model, cluster.center);
}

function getFootprint(tiles) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    tiles.forEach(({ gx, gy }) => {
        minX = Math.min(minX, gx);
        maxX = Math.max(maxX, gx);
        minY = Math.min(minY, gy);
        maxY = Math.max(maxY, gy);
    });

    return {
        w: maxX - minX + 1,
        h: maxY - minY + 1
    };
}

function scaleObjectToFootprint(model, footprint) {
    model.updateMatrixWorld(true);
    scratch.box.setFromObject(model);
    const size = scratch.box.getSize(scratch.vecA);

    const targetW = Math.max(footprint.w * TILE_SIZE, 0.01);
    const targetD = Math.max(footprint.h * TILE_SIZE, 0.01);
    const sx = targetW / Math.max(size.x, 0.01);
    const sz = targetD / Math.max(size.z, 0.01);
    const sy = Math.max(sx, sz);

    model.scale.set(sx, sy, sz);
    model.updateMatrixWorld(true);
}

function alignToGround(model) {
    model.updateMatrixWorld(true);
    scratch.box.setFromObject(model);
    const minY = scratch.box.min.y;
    model.position.y -= minY;
    model.updateMatrixWorld(true);
}

function alignToCenter(model, targetCenter) {
    scratch.box.setFromObject(model);
    scratch.box.getCenter(scratch.vecB);
    const offsetX = targetCenter.x - scratch.vecB.x;
    const offsetZ = targetCenter.z - scratch.vecB.z;
    model.position.x += offsetX;
    model.position.z += offsetZ;
    model.updateMatrixWorld(true);

    // Guardar landmark del centro para reusar como referencia del escenario de batalla
    setLandmark(MAIN_HOUSE_LANDMARK_ID, { position: targetCenter });
}

function addPhysicsColliderForHouse(model, physics) {
    const { rapier, world } = physics;
    scratch.box.setFromObject(model);
    const size = scratch.box.getSize(scratch.vecC);
    const center = scratch.box.getCenter(scratch.vecB);

    const bodyDesc = rapier.RigidBodyDesc.fixed().setTranslation(center.x, size.y / 2, center.z);
    const body = world.createRigidBody(bodyDesc);
    const collider = rapier.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
    world.createCollider(collider, body);
}
