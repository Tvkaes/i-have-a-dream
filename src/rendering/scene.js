import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLAYER_CONFIG } from '../config/index.js';
import { registerWorld, setupHouseInteriors } from '../world/scenes.js';
import { preloadEnvironmentAssets, buildWorld } from '../world/worldBuilder.js';
import { createPlayer, createInputHandler, createPlayerState } from '../player/index.js';
import { clearAssetCache } from './assetCache.js';
import { createPhysicsContext, disposePhysicsContext, attachPlayerPhysics, enableOnlyWorldColliders } from '../physics/index.js';
import { PhysicsManager } from '../physics/manager.js';
import { setupInteractionOverlay } from '../ui/interactionOverlay.js';
import { setupLoadingScreen } from '../ui/loadingScreen.js';
import { startRenderLoop } from './renderLoop.js';
import {
    getCanvasContainer,
    createSceneInstance,
    createRenderer,
    createCameraContext,
    addLights,
    setupPostProcess,
    setupLoadingCallbacks,
    setupResizeHandler
} from './setup.js';

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
    window.__scene__ = scene;
    const renderer = createRenderer(container);
    const loadingManager = new THREE.LoadingManager();
    const cameraContext = createCameraContext();
    const { handPaintedFX, enablePostProcess, postProcessFallback, disposePostProcess } = setupPostProcess(renderer);
    const loadingScreen = setupLoadingScreen();
    window.__loadingScreen__ = loadingScreen;

    addLights(scene);

    const physics = createPhysicsContext(RAPIER);
    window.__physics__ = physics;
    const physicsManager = new PhysicsManager(physics);
    const gltfLoader = new GLTFLoader(loadingManager);

    await preloadEnvironmentAssets(gltfLoader);
    const worldGroup = buildWorld(scene, gltfLoader, physics);
    setupHouseInteriors(scene, physics);
    registerWorld('exterior', worldGroup, new THREE.Vector3(0, PLAYER_CONFIG.baseHeight, 0));

    // Asegurar que solo los colliders del exterior estén activos al inicio
    enableOnlyWorldColliders(physics, 'exterior');

    let player = setupPlayerEntity(scene, physics);
    window.__player__ = player; // Exponer player globalmente
    
    // Setup interaction overlay con acceso a scene, player y physics
    const interactionOverlay = setupInteractionOverlay(() => scene, () => player, () => physics);
    window.__interactionOverlay__ = interactionOverlay;
    
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
        handPaintedFX,
        interactionOverlay
    });

    const detachLoadingCallbacks = setupLoadingCallbacks(loadingManager, enablePostProcess, postProcessFallback, {
        onStart: () => loadingScreen?.show('Cargando mundo...'),
        onComplete: () => loadingScreen?.hide()
    });
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
        window.__player__ = null;
        window.__loadingScreen__ = null;
        window.__scene__ = null;
        window.__physics__ = null;
    };
}

function setupPlayerEntity(scene, physics) {
    const player = createPlayer();
    player.position.set(0, PLAYER_CONFIG.baseHeight, 0);
    scene.add(player);
    attachPlayerPhysics(physics, player.position.x, player.position.z, RAPIER);
    return player;
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
