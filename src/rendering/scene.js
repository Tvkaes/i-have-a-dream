import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLAYER_CONFIG, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../config/index.js';
import {
    buildTileMap,
    createHouseRecords,
    populateWorld,
    getTreeInstances
} from '../world/index.js';
import { loadHouseClusters } from '../world/houses.js';
import {
    createPlayer,
    createInputHandler,
    createPlayerState,
    updatePlayer,
    updateCamera
} from '../player/index.js';
import {
    loadFlowerModels,
    loadGrassDetailModel,
    loadRockPlantModel,
    loadTreePrototypes
} from './loaders.js';
import { createHandPaintedPostProcess } from './postprocess.js';
import { clearAssetCache } from './assetCache.js';
import {
    createPhysicsContext,
    disposePhysicsContext,
    attachPlayerPhysics,
    createBlockingColliders
} from '../physics/index.js';
import { PhysicsManager } from '../physics/manager.js';

const BLOCKING_TILE_TYPES = new Set([5, 6, 7, 9, 10, 11]);
const USE_HAND_PAINTED_FX = true;

let RAPIER = null;
let disposeSceneHandle = null;
const disposeHooks = new Set();
const initHooks = new Set();

(async () => {
    const rapierModule = await import('https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.12.0/rapier.es.js');
    await rapierModule.init();
    RAPIER = rapierModule;
    initScene();
})();

async function initScene() {
    disposeScene();

    const container = getCanvasContainer();
    const scene = createSceneInstance();
    const renderer = createRenderer(container);
    const loadingManager = new THREE.LoadingManager();
    const cameraContext = createCameraContext();
    const { handPaintedFX, enablePostProcess, postProcessFallback, disposePostProcess } = setupPostProcess(renderer);

    addLights(scene);

    const physics = createPhysicsContext(RAPIER);
    const physicsManager = new PhysicsManager(physics);
    const gltfLoader = new GLTFLoader(loadingManager);

    await preloadEnvironmentAssets(gltfLoader);
    buildWorld(scene, gltfLoader, physics);

    const player = setupPlayerEntity(scene, physics);
    const input = createInputHandler();
    registerSceneDisposeHook(() => input.dispose?.());
    const playerState = createPlayerState();
    const clock = new THREE.Clock();

    const stopRenderLoop = startRenderLoop({
        renderer,
        scene,
        cameraContext,
        player,
        input,
        playerState,
        physics,
        physicsManager,
        clock,
        handPaintedFX
    });

    const detachLoadingCallbacks = setupLoadingCallbacks(loadingManager, enablePostProcess, postProcessFallback);
    const removeResizeHandler = setupResizeHandler({ cameraContext, renderer, handPaintedFX });

    runSceneInitHooks({ scene, renderer, physics, player, cameraContext });

    disposeSceneHandle = () => {
        stopRenderLoop?.();
        detachLoadingCallbacks?.();
        removeResizeHandler?.();
        disposePostProcess?.();
        renderer.setAnimationLoop(null);
        renderer.dispose();
        disposePhysicsContext(physics);
    };
}

function cullTreesNearCamera(camera, treeInstances, culledTrees) {
    const cameraPosition = camera.position;
    const clipDistance = 3;
    const fadeDistance = 4.5;

    treeInstances.forEach((tree) => {
        const prevState = culledTrees.get(tree) ?? true;
        const distance = cameraPosition.distanceTo(tree.getWorldPosition(new THREE.Vector3()));
        const shouldHide = distance < clipDistance;
        const currentlyVisible = tree.visible;

        if (shouldHide && currentlyVisible) {
            tree.visible = false;
            culledTrees.set(tree, false);
        } else if (!shouldHide && !currentlyVisible && distance > fadeDistance) {
            tree.visible = true;
            culledTrees.set(tree, true);
        } else if (!culledTrees.has(tree)) {
            culledTrees.set(tree, currentlyVisible);
        }
    });
}

export function disposeScene() {
    if (typeof disposeSceneHandle === 'function') {
        disposeSceneHandle();
        disposeSceneHandle = null;
    }

    disposeHooks.forEach((hook) => {
        try {
            hook?.();
        } catch (error) {
            console.warn('Error en hook de dispose:', error);
        }
    });

    clearAssetCache();
}

export function registerSceneDisposeHook(hook) {
    if (typeof hook !== 'function') return () => {};
    disposeHooks.add(hook);
    return () => disposeHooks.delete(hook);
}

export function registerSceneInitHook(hook) {
    if (typeof hook !== 'function') return () => {};
    initHooks.add(hook);
    return () => initHooks.delete(hook);
}

function addLights(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8cc, 1.5);
    sunLight.position.set(-30, 60, 20);
    sunLight.castShadow = true;
    sunLight.shadow.camera.left = -80;
    sunLight.shadow.camera.right = 80;
    sunLight.shadow.camera.top = 80;
    sunLight.shadow.camera.bottom = -80;
    sunLight.shadow.mapSize.set(2048, 2048);
    scene.add(sunLight);

    const dirLight = new THREE.DirectionalLight(0xfff4e6, 1.2);
    dirLight.position.set(5, 15, 5);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.mapSize.set(1024, 1024);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xadd8e6, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);
}

function getCanvasContainer() {
    const container = document.getElementById('canvas-container');
    if (!container) {
        throw new Error('No se encontró el contenedor del canvas');
    }
    return container;
}

function createSceneInstance() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 35, 70);
    return scene;
}

function createRenderer(container) {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.replaceChildren(renderer.domElement);
    return renderer;
}

function createCameraContext() {
    return {
        camera: new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000),
        cameraTarget: new THREE.Vector3(),
        lookTarget: new THREE.Vector3(),
        offset: new THREE.Vector3(0, 8, 10)
    };
}

function setupPostProcess(renderer) {
    if (!USE_HAND_PAINTED_FX) {
        return {
            handPaintedFX: null,
            enablePostProcess: () => {},
            postProcessFallback: null,
            disposePostProcess: () => {}
        };
    }

    const handPaintedFX = createHandPaintedPostProcess(renderer);
    const enablePostProcess = () => {
        if (handPaintedFX && !handPaintedFX.enabled) {
            handPaintedFX.enabled = true;
        }
    };
    const postProcessFallback = setTimeout(enablePostProcess, 7000);
    const disposePostProcess = () => {
        clearTimeout(postProcessFallback);
        handPaintedFX.renderTarget?.dispose?.();
        handPaintedFX.material?.dispose?.();
    };

    return { handPaintedFX, enablePostProcess, postProcessFallback, disposePostProcess };
}

function preloadEnvironmentAssets(gltfLoader) {
    return Promise.all([
        loadTreePrototypes(gltfLoader),
        loadGrassDetailModel(gltfLoader),
        loadRockPlantModel(gltfLoader),
        loadFlowerModels(gltfLoader)
    ]);
}

function buildWorld(scene, gltfLoader, physics) {
    const worldGroup = new THREE.Group();
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
        blockingTiles: BLOCKING_TILE_TYPES
    });
}

function setupPlayerEntity(scene, physics) {
    const player = createPlayer();
    player.position.set(0, PLAYER_CONFIG.baseHeight, 0);
    scene.add(player);
    attachPlayerPhysics(physics, player.position.x, player.position.z, RAPIER);
    return player;
}

function startRenderLoop({
    renderer,
    scene,
    cameraContext,
    player,
    input,
    playerState,
    physics,
    physicsManager,
    clock,
    handPaintedFX
}) {
    const { camera, cameraTarget, lookTarget, offset } = cameraContext;
    camera.layers.set(0);

    const culledTrees = new WeakMap();

    const loop = () => {
        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();
        updatePlayer(delta, player, input, playerState, physics);
        physicsManager?.step();
        physicsManager?.syncPlayer(player);
        updateCamera(delta, camera, player, offset, cameraTarget, lookTarget);
        cullTreesNearCamera(camera, getTreeInstances(), culledTrees);
        if (handPaintedFX?.enabled) {
            handPaintedFX.render(scene, camera, elapsed);
        } else {
            renderer.render(scene, camera);
        }
    };

    renderer.setAnimationLoop(loop);

    return () => {
        renderer.setAnimationLoop(null);
    };
}

function setupLoadingCallbacks(loadingManager, enablePostProcess, postProcessFallback) {
    if (!loadingManager) return;

    const finalizePostProcess = () => {
        enablePostProcess?.();
        if (postProcessFallback) {
            clearTimeout(postProcessFallback);
        }
    };

    loadingManager.onLoad = finalizePostProcess;
    loadingManager.onError = finalizePostProcess;

    return () => {
        loadingManager.onLoad = null;
        loadingManager.onError = null;
        finalizePostProcess();
    };
}

function setupResizeHandler({ cameraContext, renderer, handPaintedFX }) {
    const handleResize = () => {
        const { camera } = cameraContext;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        handPaintedFX?.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
}

function runSceneInitHooks(context) {
    initHooks.forEach((hook) => {
        try {
            hook(context);
        } catch (error) {
            console.warn('Error en hook de init:', error);
        }
    });
}
