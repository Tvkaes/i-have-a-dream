import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLAYER_CONFIG, MAP_LIMIT } from '../config/index.js';
import { createToonMaterial } from '../world/materials.js';
import { sharedGeometries } from '../shared/index.js';
import { PLAYER_MODEL_PATH, PLAYER_ANIMATION_PATHS } from '../config/assets.js';
import { loadCachedGLTF, loadCachedFBX } from '../rendering/assetCache.js';

const PLAYER_MODEL_SCALE = 0.7;
const PLAYER_MODEL_ROTATION = new THREE.Euler(0, Math.PI, 0);
const DEFAULT_ANIMATION = 'idle';
const JUMP_ANIMATION_DURATION = 0.8;
const USE_PLAYER_ANIMATIONS = true;

export function createPlayer() {
    const player = new THREE.Group();
    player.name = 'Player';
    setLayerRecursive(player, 0);

    player.userData = {
        mixer: null,
        animations: {},
        animationDurations: {},
        currentAction: null,
        activeAnimation: DEFAULT_ANIMATION
    };

    addFallbackGeometry(player);
    loadPlayerAssets(player);

    return player;
}

function setLayerRecursive(object, layer) {
    object.layers.set(layer);
    object.children?.forEach((child) => setLayerRecursive(child, layer));
}

export function createInputHandler() {
    const activeKeys = new Set();

    const handleKeyDown = (event) => {
        activeKeys.add(event.key.toLowerCase());
    };

    const handleKeyUp = (event) => {
        activeKeys.delete(event.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return {
        isActive(key) {
            return activeKeys.has(key);
        },
        dispose() {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            activeKeys.clear();
        }
    };
}

export function createPlayerState() {
    return {
        animationPhase: 0,
        moveDirection: new THREE.Vector2(),
        activeAnimation: DEFAULT_ANIMATION,
        jumpTimer: 0
    };
}

export function updatePlayer(delta, player, input, state, physics = null) {
    const playerData = player.userData || {};
    if (USE_PLAYER_ANIMATIONS && playerData.mixer) {
        playerData.mixer.update(delta);
    }

    const direction = state.moveDirection;
    direction.set(0, 0);

    if (input.isActive('w') || input.isActive('arrowup')) direction.y -= 1;
    if (input.isActive('s') || input.isActive('arrowdown')) direction.y += 1;
    if (input.isActive('a') || input.isActive('arrowleft')) direction.x -= 1;
    if (input.isActive('d') || input.isActive('arrowright')) direction.x += 1;

    const hasPhysics = Boolean(physics?.world && physics.playerBody);

    const hasMoveInput = direction.lengthSq() > 1e-4;
    let wantsJump = false;
    let canJump = false;

    if (USE_PLAYER_ANIMATIONS) {
        state.jumpTimer = Math.max(0, state.jumpTimer - delta);
        wantsJump = input.isActive(' ') || input.isActive('space');
        canJump = state.jumpTimer === 0;
    }

    if (hasMoveInput) {
        direction.normalize();
        const distance = PLAYER_CONFIG.speed * delta;
        const moveX = direction.x * distance;
        const moveZ = direction.y * distance;

        if (hasPhysics) {
            const body = physics.playerBody;
            const speed = PLAYER_CONFIG.speed;
            body.setLinvel({ x: direction.x * speed, y: 0, z: direction.y * speed }, true);
        } else {
            player.position.x = THREE.MathUtils.clamp(player.position.x + moveX, -MAP_LIMIT, MAP_LIMIT);
            player.position.z = THREE.MathUtils.clamp(player.position.z + moveZ, -MAP_LIMIT, MAP_LIMIT);
        }

        state.animationPhase += delta * PLAYER_CONFIG.bobSpeed;
        player.position.y = PLAYER_CONFIG.baseHeight + Math.abs(Math.sin(state.animationPhase)) * PLAYER_CONFIG.bobHeight;

        const desiredRotation = Math.atan2(-direction.x, -direction.y);
        player.rotation.y = THREE.MathUtils.damp(player.rotation.y, desiredRotation, 12, delta);
    } else {
        state.animationPhase = 0;
        player.position.y = THREE.MathUtils.damp(player.position.y, PLAYER_CONFIG.baseHeight, 6, delta);
        if (hasPhysics) {
            physics.playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
    }

    if (USE_PLAYER_ANIMATIONS) {
        const isJumping = state.jumpTimer > 0;
        if (canJump && wantsJump && playPlayerAnimation(player, 'jump', 0.05)) {
            const jumpDuration = player.userData?.animationDurations?.jump || JUMP_ANIMATION_DURATION;
            state.jumpTimer = jumpDuration;
            state.activeAnimation = 'jump';
            return;
        }

        if (isJumping) {
            return;
        }

        const targetAnimation = hasMoveInput ? 'run' : 'idle';
        if (state.activeAnimation !== targetAnimation && playPlayerAnimation(player, targetAnimation)) {
            state.activeAnimation = targetAnimation;
        }
    }
}

export function updateCamera(delta, camera, player, offset, cameraTarget, lookTarget) {
    cameraTarget.copy(player.position).add(offset);
    camera.position.lerp(cameraTarget, 1 - Math.exp(-4 * delta));

    lookTarget.set(player.position.x, player.position.y + 0.5, player.position.z - 2);
    camera.lookAt(lookTarget);
}

async function loadPlayerAssets(player) {
    try {
        const model = await loadModelAsset(PLAYER_MODEL_PATH);
        model.scale.setScalar(PLAYER_MODEL_SCALE);
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        setLayerRecursive(model, 0);

        model.rotation.copy(PLAYER_MODEL_ROTATION);
        model.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(model);
        if (isFinite(bbox.min.y) && isFinite(bbox.max.y)) {
            const modelHeight = bbox.max.y - bbox.min.y;
            const baseOffset = -bbox.min.y;
            model.position.y += baseOffset;
            model.position.y += PLAYER_MODEL_SCALE * 0.02 * modelHeight;
        }

        removeFallbackGeometry(player);
        player.add(model);

        if (USE_PLAYER_ANIMATIONS) {
            const mixer = new THREE.AnimationMixer(model);
            player.userData.mixer = mixer;
            await loadPlayerAnimations(mixer, player.userData.animations, player.userData.animationDurations);
            playPlayerAnimation(player, DEFAULT_ANIMATION, 0);
        }
    } catch (error) {
        console.error('No se pudo cargar el jugador; se mantiene el modelo fallback.', error);
    }
}

async function loadPlayerAnimations(mixer, animationsStore, durationStore = {}) {
    const entries = Object.entries(PLAYER_ANIMATION_PATHS);
    await Promise.all(entries.map(async ([name, relativePath]) => {
        if (!relativePath) return;
        try {
            const clip = await loadAnimationClip(relativePath);
            if (!clip) {
                console.warn(`[Player] ❌ La animación "${name}" (${relativePath}) no contiene datos; verifica que el archivo incluya un clip compatible con el rig del jugador.`);
                return;
            }

            const action = mixer.clipAction(clip);
            if (name === 'jump') {
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
            } else {
                action.setLoop(THREE.LoopRepeat, Infinity);
            }
            animationsStore[name] = action;
            durationStore[name] = clip.duration ?? null;
        } catch (error) {
            console.warn(`[Player] ❌ No se pudo cargar la animación "${name}" (${relativePath}).`, error);
        }
    }));
}

function playPlayerAnimation(player, name, fadeDuration = 0.2) {
    const data = player.userData;
    const action = data?.animations?.[name];
    if (!action) {
        console.warn(`[Player] ⚠️ Intento de reproducir animación "${name}" que no existe. Disponibles:`, Object.keys(data?.animations || {}));
        if (name === 'idle' && data?.currentAction) {
            data.currentAction.fadeOut(fadeDuration);
            data.currentAction = null;
        }
        return false;
    }

    if (data.currentAction === action) {
        return true;
    }

    if (data.currentAction) {
        data.currentAction.fadeOut(fadeDuration);
    }

    action.reset().fadeIn(fadeDuration).play();
    data.currentAction = action;
    data.activeAnimation = name;
    return true;
}

function toModuleUrl(relativePath) {
    return new URL(relativePath, import.meta.url).href;
}

async function loadModelAsset(path) {
    if (path.toLowerCase().endsWith('.glb') || path.toLowerCase().endsWith('.gltf')) {
        const loader = new GLTFLoader();
        const gltf = await loadCachedGLTF(loader, toModuleUrl(path));
        return gltf.scene;
    }

    const loader = new FBXLoader();
    return loadCachedFBX(loader, toModuleUrl(path));
}

async function loadAnimationClip(path) {
    const lower = path.toLowerCase();
    if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
        const loader = new GLTFLoader();
        const gltf = await loadCachedGLTF(loader, toModuleUrl(path));
        return gltf.animations[0] ?? null;
    }

    const loader = new FBXLoader();
    const asset = await loadCachedFBX(loader, toModuleUrl(path));
    return asset.animations?.[0] ?? null;
}

function addFallbackGeometry(player) {
    const fallback = new THREE.Group();
    fallback.name = 'PlayerFallback';
    fallback.userData.isFallback = true;
    setLayerRecursive(fallback, 1);

    const body = new THREE.Mesh(sharedGeometries.playerBody, createToonMaterial(0xff4444));
    body.position.y = 0.5;
    body.castShadow = true;
    fallback.add(body);

    const head = new THREE.Mesh(sharedGeometries.playerHead, createToonMaterial(0xffdbac));
    head.position.y = 1.1;
    head.castShadow = true;
    fallback.add(head);

    const cap = new THREE.Mesh(sharedGeometries.playerCap, createToonMaterial(0x3333ff));
    cap.position.y = 1.3;
    cap.castShadow = true;
    fallback.add(cap);

    const visor = new THREE.Mesh(sharedGeometries.playerVisor, createToonMaterial(0x2222cc));
    visor.position.set(0, 1.25, 0.3);
    visor.castShadow = true;
    fallback.add(visor);

    player.add(fallback);
}

function removeFallbackGeometry(player) {
    player.children
        .filter((child) => child.userData?.isFallback)
        .forEach((child) => {
            player.remove(child);
        });
}
