import * as THREE from 'three';
import { PLAYER_CONFIG, TILE_SIZE } from '../config/index.js';
import {
    PLAYER_POKEMON_LATERAL_TILES,
    OPPONENT_POKEMON_LATERAL_TILES,
    POKEMON_FORWARD_TILES,
    computeBattleBasis,
    buildBattlePosition
} from './battleConfig.js';

const textureLoader = new THREE.TextureLoader();
const ROOT_ASSET_BASE = new URL('../../', import.meta.url);
const SPRITE_WIDTH = 1;
const SPRITE_HEIGHT = 1;
const PLAYER_HEIGHT_OFFSET = 0.32;
const OPPONENT_HEIGHT_OFFSET = 0.38;
const WORLD_UNITS_PER_METER = TILE_SIZE;
const MIN_SPRITE_HEIGHT_UNITS = 0.25;
const MAX_SPRITE_HEIGHT_UNITS = 4;

const spriteEntries = {
    player: null,
    opponent: null
};

const loadTokens = {
    player: 0,
    opponent: 0
};

const DEFAULT_SPRITE_FPS = 15;

const DEFAULT_DIRECTION = new THREE.Vector3(0, 0, 1);

function clampSpriteHeight(heightMeters) {
    const meters = typeof heightMeters === 'number' ? heightMeters : 1;
    const units = meters * WORLD_UNITS_PER_METER;
    return THREE.MathUtils.clamp(units, MIN_SPRITE_HEIGHT_UNITS, MAX_SPRITE_HEIGHT_UNITS);
}

function resolveSpriteAspect(spriteConfig) {
    const frameHeight = spriteConfig?.frameHeight ?? spriteConfig?.height ?? null;
    const width = spriteConfig?.width ?? null;
    if (frameHeight && width && frameHeight > 0) {
        return width / frameHeight;
    }
    return 1;
}

function applySpriteScale(mesh, spriteConfig, targetHeightMeters) {
    if (!mesh) return;
    const height = clampSpriteHeight(targetHeightMeters);
    const aspect = resolveSpriteAspect(spriteConfig);
    const widthScale = height * aspect;
    mesh.scale.set(widthScale, height, 1);
}

function disposeSprite(key) {
    const entry = spriteEntries[key];
    if (!entry) return;
    entry.scene?.remove(entry.mesh);
    entry.geometry?.dispose?.();
    entry.material?.dispose?.();
    if (entry.animationHandle) {
        entry.animationHandle.stop();
    }
    entry.texture?.dispose?.();
    spriteEntries[key] = null;
}

function disposeAllSprites() {
    disposeSprite('player');
    disposeSprite('opponent');
}

function resolveSpriteUrl(url) {
    if (!url) return null;
    if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;

    let normalized = url.trim();
    let needsPublicPrefix = false;
    if (normalized.startsWith('/public/')) {
        normalized = normalized.substring('/public/'.length);
    } else if (normalized.startsWith('/')) {
        normalized = normalized.substring(1);
        needsPublicPrefix = true;
    }

    if (needsPublicPrefix && !normalized.startsWith('public/')) {
        normalized = `public/${normalized}`;
    }

    try {
        return new URL(normalized, ROOT_ASSET_BASE).href;
    } catch (error) {
        console.warn('[battleWorldSprites] No se pudo resolver la ruta del sprite', url, error);
        return null;
    }
}

function computeTextureHeight(texture) {
    const image = texture?.image;
    if (!image) return null;
    return image.naturalHeight ?? image.videoHeight ?? image.height ?? null;
}

function createSpriteAnimation(texture, frames) {
    const framesHorizontal = Math.max(1, frames || 1);
    let currentFrame = 0;
    let lastFrameTime = Date.now();
    const fps = DEFAULT_SPRITE_FPS;
    const frameTime = 1000 / fps;
    let rafId = null;
    let stopped = false;

    function updateFrame() {
        if (stopped) return;
        
        const now = Date.now();
        if (now - lastFrameTime >= frameTime) {
            currentFrame = (currentFrame + 1) % framesHorizontal;
            lastFrameTime = now;
            texture.offset.x = currentFrame / framesHorizontal;
        }
        
        rafId = requestAnimationFrame(updateFrame);
    }

    if (framesHorizontal > 1) {
        rafId = requestAnimationFrame(updateFrame);
    }

    return {
        stop: () => {
            stopped = true;
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }
    };
}

function ensureSprite({ key, scene, spriteConfig, targetHeightMeters = 1, onReady }) {
    if (!scene || !spriteConfig?.image) {
        disposeSprite(key);
        return;
    }

    const { image, frames, frameHeight = null, vAlign = 'top' } = spriteConfig;
    const resolvedUrl = resolveSpriteUrl(image);
    if (!resolvedUrl) {
        disposeSprite(key);
        return;
    }

    const current = spriteEntries[key];
    if (current && current.url === resolvedUrl) {
        if (current.mesh.parent !== scene) {
            scene.add(current.mesh);
            current.scene = scene;
        }
        applySpriteScale(current.mesh, spriteConfig, targetHeightMeters);
        current.targetHeight = targetHeightMeters;
        current.spriteConfig = spriteConfig;
        onReady(current.mesh);
        return;
    }

    const token = ++loadTokens[key];
    const framesHorizontal = Math.max(1, frames || 1);
    
    textureLoader.load(
        resolvedUrl,
        (texture) => {
            if (token !== loadTokens[key]) {
                texture.dispose?.();
                return;
            }
            disposeSprite(key);
            
            texture.minFilter = THREE.NearestFilter;
            texture.magFilter = THREE.NearestFilter;

            const textureHeight = computeTextureHeight(texture);
            let repeatY = 1;
            let offsetY = 0;
            if (frameHeight && textureHeight) {
                repeatY = Math.min(1, frameHeight / textureHeight);
                const remaining = Math.max(0, 1 - repeatY);
                if (vAlign === 'center') {
                    offsetY = remaining / 2;
                } else if (vAlign === 'top') {
                    offsetY = remaining;
                } else {
                    offsetY = 0;
                }
            }

            texture.repeat.set(1 / framesHorizontal, repeatY);
            texture.offset.set(0, offsetY);
            texture.encoding = THREE.sRGBEncoding;
            texture.generateMipmaps = false;
            texture.needsUpdate = true;

            const geometry = new THREE.PlaneGeometry(SPRITE_WIDTH, SPRITE_HEIGHT, 1, 1);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.renderOrder = key === 'opponent' ? 35 : 34;
            scene.add(mesh);
            applySpriteScale(mesh, spriteConfig, targetHeightMeters);
            
            const animationHandle = createSpriteAnimation(texture, framesHorizontal);
            
            spriteEntries[key] = { 
                mesh, 
                geometry, 
                material, 
                texture, 
                animationHandle,
                scene, 
                url: resolvedUrl,
                targetHeight: targetHeightMeters,
                spriteConfig
            };
            onReady(mesh);
        },
        undefined,
        () => {
            if (token === loadTokens[key]) {
                console.warn('[battleWorldSprites] No se pudo cargar el sprite 3D', resolvedUrl);
            }
        }
    );
}

function resolveDirection(fromPosition, toPosition, fallback) {
    if (fromPosition && toPosition) {
        const direction = new THREE.Vector3().subVectors(toPosition, fromPosition);
        direction.y = 0;
        if (direction.lengthSq() > 1e-4) {
            return direction.normalize();
        }
    }
    if (fallback) {
        const clone = fallback.clone();
        clone.y = 0;
        if (clone.lengthSq() > 1e-4) {
            return clone.normalize();
        }
    }
    return DEFAULT_DIRECTION.clone();
}

function placePlayerPokemon(mesh, playerEntity, opponentEntity) {
    if (!mesh || !playerEntity) return;
    let fallbackForward = null;
    if (playerEntity.quaternion) {
        fallbackForward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerEntity.quaternion);
    }
    const direction = resolveDirection(playerEntity.position, opponentEntity?.position, fallbackForward);
    const { forward, right } = computeBattleBasis(direction);

    const anchor = buildBattlePosition({
        base: playerEntity.position,
        forwardTiles: POKEMON_FORWARD_TILES,
        lateralTiles: PLAYER_POKEMON_LATERAL_TILES,
        forward,
        right
    });
    const spriteHeight = mesh.scale?.y ?? 1;
    anchor.y = PLAYER_CONFIG.baseHeight + PLAYER_HEIGHT_OFFSET + spriteHeight / 2;
    mesh.position.copy(anchor);

    if (opponentEntity) {
        const lookAt = opponentEntity.position.clone();
        lookAt.y = anchor.y;
        mesh.lookAt(lookAt);
    } else if (playerEntity.quaternion) {
        mesh.quaternion.copy(playerEntity.quaternion);
    }
}

function placeOpponentPokemon(mesh, playerEntity, opponentEntity) {
    if (!mesh || !opponentEntity) return;
    let fallbackForward = null;
    if (opponentEntity.quaternion) {
        fallbackForward = new THREE.Vector3(0, 0, -1).applyQuaternion(opponentEntity.quaternion);
    }
    const direction = resolveDirection(opponentEntity.position, playerEntity?.position, fallbackForward);
    const { forward, right } = computeBattleBasis(direction);

    const anchor = buildBattlePosition({
        base: opponentEntity.position,
        forwardTiles: POKEMON_FORWARD_TILES,
        lateralTiles: OPPONENT_POKEMON_LATERAL_TILES,
        forward,
        right
    });
    const spriteHeight = mesh.scale?.y ?? 1;
    anchor.y = PLAYER_CONFIG.baseHeight + OPPONENT_HEIGHT_OFFSET + spriteHeight / 2;
    mesh.position.copy(anchor);

    if (playerEntity) {
        const lookAt = playerEntity.position.clone();
        lookAt.y = anchor.y;
        mesh.lookAt(lookAt);
    } else if (opponentEntity.quaternion) {
        mesh.quaternion.copy(opponentEntity.quaternion);
    }
}

function normalizeSpriteConfig(config = null) {
    if (!config) return null;
    const frames = Math.max(1, config.frames || 1);
    const width = Number(config.width) || null;
    const height = Number(config.height) || null;
    const vAlign = config.vAlign || 'top';
    return {
        image: config.image ?? null,
        frames,
        height,
        width,
        frameHeight: height,
        vAlign
    };
}

export function setWorldPokemonSprites({
    scene,
    playerEntity,
    opponentEntity,
    playerSprite,
    opponentSprite,
    playerHeightMeters = 1,
    opponentHeightMeters = 1
} = {}) {
    const normalizedPlayer = normalizeSpriteConfig(playerSprite);
    const normalizedOpponent = normalizeSpriteConfig(opponentSprite);

    ensureSprite({
        key: 'player',
        scene,
        spriteConfig: normalizedPlayer,
        targetHeightMeters: playerHeightMeters,
        onReady: (mesh) => placePlayerPokemon(mesh, playerEntity, opponentEntity)
    });

    ensureSprite({
        key: 'opponent',
        scene,
        spriteConfig: normalizedOpponent,
        targetHeightMeters: opponentHeightMeters,
        onReady: (mesh) => placeOpponentPokemon(mesh, playerEntity, opponentEntity)
    });
}

export function updateWorldPokemonSpriteTransforms({ playerEntity, opponentEntity } = {}) {
    if (spriteEntries.player?.mesh) {
        placePlayerPokemon(spriteEntries.player.mesh, playerEntity, opponentEntity);
    }
    if (spriteEntries.opponent?.mesh) {
        placeOpponentPokemon(spriteEntries.opponent.mesh, playerEntity, opponentEntity);
    }
}

export function clearWorldPokemonSprites() {
    disposeAllSprites();
}

export function getBattleSpriteMesh(side) {
    if (side === 'player') {
        return spriteEntries.player?.mesh ?? null;
    }
    if (side === 'opponent') {
        return spriteEntries.opponent?.mesh ?? null;
    }
    return null;
}
