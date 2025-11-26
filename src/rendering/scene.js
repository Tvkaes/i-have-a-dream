import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLAYER_CONFIG, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../config/index.js';
import {
    buildTileMap,
    createHouseRecords,
    populateWorld,
    getTreeInstances,
    getInteractables
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

const BLOCKING_TILE_TYPES = new Set([3, 4, 5, 6, 7, 9, 10, 11]);
const USE_HAND_PAINTED_FX = true;
const HAND_PAINTED_RESOLUTION_SCALE = 0.85;
const MAX_PIXEL_RATIO_DESKTOP = 1.5;
const MAX_PIXEL_RATIO_MOBILE = 1.25;
const MOBILE_VIEWPORT_QUERY = '(max-width: 768px)';
const PHYSICS_IDLE_STEP_INTERVAL = 0.5; // segundos entre steps cuando el jugador está quieto

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
    const interactionOverlay = setupInteractionOverlay();
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
        handPaintedFX,
        interactionOverlay
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

function isPlayerFacingInteractable(player, targetPosition, tmpDirection, tmpForward) {
    tmpForward.set(0, 0, -1).applyQuaternion(player.quaternion);
    tmpForward.y = 0;
    if (tmpForward.lengthSq() < 1e-5) return false;
    tmpForward.normalize();

    tmpDirection.copy(targetPosition).sub(player.position);
    tmpDirection.y = 0;
    if (tmpDirection.lengthSq() < 1e-4) return true;
    tmpDirection.normalize();

    const alignment = tmpForward.dot(tmpDirection);
    return alignment >= 0.35;
}

function setupInteractionOverlay() {
    const container = getCanvasContainer();
    let overlay = document.getElementById('interaction-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'interaction-overlay';
        container.appendChild(overlay);
    }

    const ensurePanel = (id, className = 'interaction-panel hidden') => {
        let panel = document.getElementById(id);
        if (!panel) {
            panel = document.createElement('div');
            panel.id = id;
            panel.className = className;
            overlay.appendChild(panel);
        } else {
            panel.className = className;
        }
        return panel;
    };

    const promptPanel = ensurePanel('interaction-prompt', 'interaction-panel prompt-panel hidden');
    let promptText = promptPanel.querySelector('p');
    if (!promptText) {
        promptText = document.createElement('p');
        promptPanel.appendChild(promptText);
    }

    const createElement = (tag, className, parent) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (parent) parent.appendChild(element);
        return element;
    };

    let messagePanel = document.getElementById('interaction-message');
    if (!messagePanel) {
        messagePanel = document.createElement('div');
        messagePanel.id = 'interaction-message';
        overlay.appendChild(messagePanel);
    }
    messagePanel.className = 'interaction-panel dialogue-panel hidden';
    if (!messagePanel.querySelector('.dialogue-content')) {
        messagePanel.innerHTML = '';
        const outerBorder = createElement('div', 'dialogue-outer-border', messagePanel);
        const middleBorder = createElement('div', 'dialogue-middle-border', outerBorder);
        const dialogueBox = createElement('div', 'dialogue-box', middleBorder);
        const inner = createElement('div', 'dialogue-inner', dialogueBox);
        createElement('div', 'dialogue-paint-texture', inner);
        ['corner-tl', 'corner-tr', 'corner-bl', 'corner-br'].forEach((cornerClass) => {
            createElement('div', `dialogue-corner ${cornerClass}`, inner);
        });
        const content = createElement('div', 'dialogue-content', inner);
        const header = createElement('div', 'dialogue-character-header', content);
        const portrait = createElement('div', 'dialogue-portrait portrait-empty', header);
        portrait.id = 'interaction-portrait';
        const portraitImage = createElement('img', 'dialogue-portrait-image hidden', portrait);
        portraitImage.id = 'interaction-portrait-image';
        portraitImage.alt = '';
        createElement('div', 'portrait-highlight', portrait);
        const speakerLabel = createElement('div', 'dialogue-character-name', header);
        speakerLabel.id = 'interaction-speaker';
        const textArea = createElement('div', 'dialogue-text-area', content);
        const paragraph = createElement('p', '', textArea);
        paragraph.id = 'interaction-message-text';
        const continuePrompt = createElement('div', 'dialogue-continue hidden', content);
        continuePrompt.id = 'interaction-continue';
        createElement('span', 'continue-arrow', continuePrompt);
        const choicePanel = createElement('div', 'dialogue-choice-panel hidden', content);
        choicePanel.id = 'interaction-choice-panel';
        const choiceList = createElement('ul', 'choice-list', choicePanel);
        choiceList.id = 'interaction-choice-list';
    }

    const messageText = document.getElementById('interaction-message-text');
    const speakerText = document.getElementById('interaction-speaker');
    const continuePrompt = document.getElementById('interaction-continue');
    const portraitElement = document.getElementById('interaction-portrait');
    const portraitImageElement = document.getElementById('interaction-portrait-image');
    const choicePanel = document.getElementById('interaction-choice-panel');
    const choiceList = document.getElementById('interaction-choice-list');

    promptPanel.classList.add('hidden');
    messagePanel.classList.add('hidden');

    let activeMessages = [];
    let messageIndex = 0;
    let activeSpeaker = '';
    let pendingChoices = null;
    let activeChoices = [];
    let choiceIndex = 0;
    let choiceCallback = null;

    const setSpeaker = (value = '') => {
        activeSpeaker = value || '';
        if (speakerText) {
            speakerText.textContent = activeSpeaker;
        }
    };

    const setContinueVisible = (visible) => {
        if (!continuePrompt) return;
        continuePrompt.classList.toggle('hidden', !visible);
    };

    const renderChoices = () => {
        if (!choiceList) return;
        choiceList.innerHTML = '';
        activeChoices.forEach((choice, idx) => {
            const item = document.createElement('li');
            item.className = `choice-option${idx === choiceIndex ? ' active' : ''}`;
            item.textContent = choice.label ?? choice.id ?? `Opción ${idx + 1}`;
            choiceList.appendChild(item);
        });
    };

    const setChoicesVisible = (visible) => {
        if (!choicePanel) return;
        choicePanel.classList.toggle('hidden', !visible);
        if (!visible) {
            choiceList.innerHTML = '';
        }
    };

    const startChoices = (choices = [], callback = null) => {
        if (!Array.isArray(choices) || choices.length === 0) return;
        activeChoices = choices;
        choiceIndex = 0;
        choiceCallback = typeof callback === 'function' ? callback : null;
        setContinueVisible(false);
        renderChoices();
        setChoicesVisible(true);
    };

    const finishChoices = () => {
        setChoicesVisible(false);
        activeChoices = [];
        choiceIndex = 0;
        const callback = choiceCallback;
        choiceCallback = null;
        pendingChoices = null;
        return callback;
    };

    const hasActiveChoices = () => activeChoices.length > 0;

    const queueChoices = (choices, callback) => {
        if (Array.isArray(choices) && choices.length) {
            pendingChoices = { choices, callback };
        } else {
            pendingChoices = null;
        }
    };

    const resolvePortraitSrc = (src = '') => {
        if (!src) return '';
        if (/^https?:\/\//i.test(src) || src.startsWith('data:') || src.startsWith('/')) return src;
        try {
            return new URL(src, window.location.href).toString();
        } catch (err) {
            return src;
        }
    };

    const setPortraitImage = (src = '') => {
        if (!portraitElement || !portraitImageElement) return;

        const clearPortrait = () => {
            portraitElement.classList.add('portrait-empty');
            portraitImageElement.src = '';
            portraitImageElement.classList.add('hidden');
            portraitImageElement.removeAttribute('data-tried-fallback');
        };

        if (!src) {
            clearPortrait();
            return;
        }

        const normalizedSrc = resolvePortraitSrc(src);
        const needsFallbackCandidate = !/^https?:\/\/|^data:|^\//i.test(src);
        const fallbackSrc = needsFallbackCandidate ? resolvePortraitSrc(`public/${src}`) : '';

        portraitImageElement.onload = () => {
            portraitElement.classList.remove('portrait-empty');
            portraitImageElement.classList.remove('hidden');
        };
        portraitImageElement.onerror = () => {
            const triedFallback = portraitImageElement.getAttribute('data-tried-fallback') === 'true';
            if (!triedFallback && fallbackSrc && fallbackSrc !== portraitImageElement.src) {
                portraitImageElement.setAttribute('data-tried-fallback', 'true');
                portraitImageElement.src = fallbackSrc;
                return;
            }
            clearPortrait();
        };

        portraitElement.classList.add('portrait-empty');
        portraitImageElement.classList.add('hidden');
        portraitImageElement.removeAttribute('data-tried-fallback');
        portraitImageElement.src = normalizedSrc;
    };

    const api = {
        showPrompt(text = '') {
            promptText.textContent = text;
            promptPanel.classList.remove('hidden');
        },
        hidePrompt() {
            promptPanel.classList.add('hidden');
        },
        showMessage(text = '', speaker = '', portrait = '') {
            setSpeaker(speaker);
            setPortraitImage(portrait);
            messageText.textContent = text;
            messagePanel.classList.remove('hidden');
            setContinueVisible(true);
        },
        hideMessage() {
            messagePanel.classList.add('hidden');
            activeMessages = [];
            messageIndex = 0;
            setSpeaker('');
            setContinueVisible(false);
            setPortraitImage('');
            setChoicesVisible(false);
            activeChoices = [];
            pendingChoices = null;
            choiceCallback = null;
        },
        hideAll() {
            promptPanel.classList.add('hidden');
            messagePanel.classList.add('hidden');
            activeMessages = [];
            messageIndex = 0;
            setSpeaker('');
            setContinueVisible(false);
            setPortraitImage('');
            setChoicesVisible(false);
            activeChoices = [];
            pendingChoices = null;
            choiceCallback = null;
        },
        isMessageVisible() {
            return !messagePanel.classList.contains('hidden');
        },
        startMessageSequence(messages = [], speaker = '', portrait = '', { choices = null, onSelect = null } = {}) {
            if (!Array.isArray(messages) || messages.length === 0) return;
            activeMessages = messages;
            messageIndex = 0;
            setSpeaker(speaker);
            setPortraitImage(portrait);
            messageText.textContent = messages[0];
            messagePanel.classList.remove('hidden');
            setContinueVisible(true);
            queueChoices(choices, onSelect);
        },
        advanceMessage() {
            if (!activeMessages.length) {
                api.hideMessage();
                api.hidePrompt();
                return;
            }
            messageIndex += 1;
            if (messageIndex >= activeMessages.length) {
                if (pendingChoices) {
                    startChoices(pendingChoices.choices, pendingChoices.callback);
                    return;
                }
                api.hideMessage();
                api.hidePrompt();
                return;
            }
            messageText.textContent = activeMessages[messageIndex];
        },
        isChoiceActive() {
            return hasActiveChoices();
        },
        moveChoice(delta = 0) {
            if (!hasActiveChoices()) return;
            const length = activeChoices.length;
            choiceIndex = (choiceIndex + delta + length) % length;
            renderChoices();
        },
        confirmChoice() {
            if (!hasActiveChoices()) return;
            const selected = activeChoices[choiceIndex];
            const callback = finishChoices();
            api.hideMessage();
            api.hidePrompt();
            if (callback) {
                try {
                    callback(selected);
                } catch (err) {
                    console.warn('Error al manejar la elección:', err);
                }
            }
        },
        shouldLockControls() {
            return api.isMessageVisible() || hasActiveChoices();
        }
    };

    return api;
}

function updateInteractionIndicators({
    player,
    camera,
    input,
    overlay,
    tmpVector,
    tmpForward,
    activeInteractable
}) {
    const nearest = findNearestInteractable(player.position, tmpVector);
    const hasChoiceActive = overlay.isChoiceActive?.() ?? false;
    const hasMessageOpen = overlay.isMessageVisible();

    if (hasChoiceActive) {
        const moveUp = input.consumePressed('arrowup') || input.consumePressed('w');
        const moveDown = input.consumePressed('arrowdown') || input.consumePressed('s');
        if (moveUp) {
            overlay.moveChoice?.(-1);
        } else if (moveDown) {
            overlay.moveChoice?.(1);
        }
        if (input.consumePressed('enter') || input.consumePressed('return')) {
            overlay.confirmChoice?.();
        }
        return { interactable: activeInteractable };
    }

    if (hasMessageOpen) {
        if (input.consumePressed('enter') || input.consumePressed('return')) {
            overlay.advanceMessage();
        }
        return { interactable: activeInteractable };
    }

    if (nearest && isPlayerFacingInteractable(player, nearest.position, tmpVector, tmpForward)) {
        if (nearest.autoTrigger) {
            if (nearest.messages?.length) {
                if (!nearest.__autoShown) {
                    overlay.startMessageSequence(nearest.messages, nearest.speaker, nearest.portrait, {
                        choices: nearest.choices,
                        onSelect: (choice) => nearest.onChoiceSelect?.(choice, nearest)
                    });
                    nearest.__autoShown = true;
                }
            } else {
                nearest.onInteract?.();
            }
            overlay.hidePrompt();
            return { interactable: nearest };
        }

        overlay.showPrompt(nearest.prompt);

        if (input.consumePressed('enter') || input.consumePressed('return')) {
            if (nearest.messages?.length) {
                overlay.startMessageSequence(nearest.messages, nearest.speaker, nearest.portrait, {
                    choices: nearest.choices,
                    onSelect: (choice) => nearest.onChoiceSelect?.(choice, nearest)
                });
                overlay.hidePrompt();
            }
            nearest.onInteract?.();
            if (!nearest.messages?.length) {
                overlay.hidePrompt();
            }
        }
        return { interactable: nearest };
    }

    overlay.hideAll();
    return { interactable: null };
}

function findNearestInteractable(playerPosition, tmpVector) {
    const interactables = getInteractables();
    if (!interactables?.length) return null;
    let closest = null;
    let minDistanceSq = Infinity;

    interactables.forEach((entry) => {
        tmpVector.copy(entry.position);
        const distanceSq = tmpVector.distanceToSquared(playerPosition);
        if (distanceSq < minDistanceSq && distanceSq <= (entry.radius ?? 1.2) ** 2) {
            closest = entry;
            minDistanceSq = distanceSq;
        }
    });

    return closest;
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
    const isMobile = isMobileViewport();
    const sunShadowsEnabled = !isMobile;
    const dirShadowsEnabled = !isMobile;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8cc, 1.5);
    sunLight.position.set(-30, 60, 20);
    sunLight.castShadow = sunShadowsEnabled;
    sunLight.shadow.camera.left = -80;
    sunLight.shadow.camera.right = 80;
    sunLight.shadow.camera.top = 80;
    sunLight.shadow.camera.bottom = -80;
    if (sunShadowsEnabled) {
        sunLight.shadow.mapSize.set(2048, 2048);
    }
    scene.add(sunLight);

    const dirLight = new THREE.DirectionalLight(0xfff4e6, 1.2);
    dirLight.position.set(5, 15, 5);
    dirLight.castShadow = dirShadowsEnabled;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    if (dirShadowsEnabled) {
        dirLight.shadow.mapSize.set(1024, 1024);
    }
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

function isMobileViewport() {
    return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
}

function getMaxPixelRatio() {
    return isMobileViewport() ? MAX_PIXEL_RATIO_MOBILE : MAX_PIXEL_RATIO_DESKTOP;
}

function createRenderer(container) {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const enableShadows = !isMobileViewport();
    renderer.shadowMap.enabled = enableShadows;
    renderer.shadowMap.type = enableShadows ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, getMaxPixelRatio()));
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

    const handPaintedFX = createHandPaintedPostProcess(renderer, {
        resolutionScale: HAND_PAINTED_RESOLUTION_SCALE
    });
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
    handPaintedFX,
    interactionOverlay
}) {
    const { camera, cameraTarget, lookTarget, offset } = cameraContext;
    camera.layers.set(0);

    const culledTrees = new WeakMap();
    const tmpVector = new THREE.Vector3();
    const tmpForward = new THREE.Vector3();
    let activeInteractable = null;
    let physicsIdleTimer = 0;

    const loop = () => {
        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();
        const controlsLocked = interactionOverlay?.shouldLockControls?.() ?? false;
        const playerActive = controlsLocked ? false : updatePlayer(delta, player, input, playerState, physics);

        if (physicsManager) {
            if (playerActive) {
                physicsIdleTimer = 0;
                physicsManager.step();
                physicsManager.syncPlayer(player);
            } else {
                physicsIdleTimer += delta;
                if (physicsIdleTimer >= PHYSICS_IDLE_STEP_INTERVAL) {
                    physicsManager.step();
                    physicsManager.syncPlayer(player);
                    physicsIdleTimer = 0;
                }
            }
        }
        updateCamera(delta, camera, player, offset, cameraTarget, lookTarget);
        cullTreesNearCamera(camera, getTreeInstances(), culledTrees);
        const { interactable } = updateInteractionIndicators({
            player,
            camera,
            input,
            overlay: interactionOverlay,
            tmpVector,
            tmpForward,
            activeInteractable
        });
        activeInteractable = interactable;
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
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, getMaxPixelRatio()));
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
