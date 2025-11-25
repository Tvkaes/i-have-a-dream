import * as THREE from 'three';
import {
    registerTreeModel,
    registerFlowerModel,
    setGrassDetailModel,
    setRockPlantModel
} from '../world/index.js';
import {
    FLOWER_MODEL_ENTRIES,
    TREE_MODEL_ENTRIES,
    GRASS_DETAIL_MODEL_PATH,
    ROCK_PLANT_MODEL_PATH
} from '../config/assets.js';
import { loadCachedGLTF } from './assetCache.js';

const FLOWER_TARGET_HEIGHT = 0.4;

const scratchBox = new THREE.Box3();

export async function loadFlowerModels(gltfLoader) {
    await Promise.all(FLOWER_MODEL_ENTRIES.map(async ({ path, name }) => {
        try {
            const url = new URL(path, import.meta.url).href;
            const gltf = await loadCachedGLTF(gltfLoader, url);
            const model = gltf.scene;
            const height = measureModelHeight(model);
            if (height > 0) {
                const scaleFactor = FLOWER_TARGET_HEIGHT / height;
                model.scale.multiplyScalar(scaleFactor);
            }
            registerFlowerModel(model, name);
        } catch (error) {
            console.warn(`No se pudo cargar ${path}; se omitirá este modelo de flores.`, error);
        }
    }));
}

export async function loadGrassDetailModel(gltfLoader) {
    try {
        const url = new URL(GRASS_DETAIL_MODEL_PATH, import.meta.url).href;
        const gltf = await loadCachedGLTF(gltfLoader, url);
        setGrassDetailModel(gltf.scene);
    } catch (error) {
        console.warn('No se pudo cargar grassModel.glb; se omitirán detalles 3D adicionales.', error);
    }
}

export async function loadRockPlantModel(gltfLoader) {
    try {
        const url = new URL(ROCK_PLANT_MODEL_PATH, import.meta.url).href;
        const gltf = await loadCachedGLTF(gltfLoader, url);
        setRockPlantModel(gltf.scene);
    } catch (error) {
        console.warn('No se pudo cargar rock_and_plants.glb; los tiles tipo 11 usarán el buzón por defecto.', error);
    }
}

export async function loadTreePrototypes(gltfLoader) {
    await Promise.all(TREE_MODEL_ENTRIES.map(async ({ path, name, default: isDefault }) => {
        try {
            const url = new URL(path, import.meta.url).href;
            const gltf = await loadCachedGLTF(gltfLoader, url);
            registerTreeModel(name, gltf.scene, { isDefault });
        } catch (error) {
            if (isDefault) {
                console.warn(`No se pudo cargar ${path}; se usarán árboles procedurales como fallback.`, error);
            } else {
                console.warn(`No se pudo cargar ${path}; se omitirá este modelo opcional.`, error);
            }
        }
    }));
}

function measureModelHeight(object) {
    scratchBox.setFromObject(object);
    return scratchBox.max.y - scratchBox.min.y;
}
