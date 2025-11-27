import * as THREE from 'three';
import { TILE_SIZE, PLAYER_CONFIG } from '../config/index.js';

const textureLoader = new THREE.TextureLoader();
const ROOT_ASSET_BASE = new URL('../../', import.meta.url);
const SPRITE_WIDTH = 1;
const SPRITE_HEIGHT = 1;
const PLAYER_HEIGHT_OFFSET = 0.32;
const OPPONENT_HEIGHT_OFFSET = 0.38;

const spriteEntries = {
    player: null,
    opponent: null
};

const loadTokens = {
    player: 0,
    opponent: 0
};

const DEFAULT_DIRECTION = new THREE.Vector3(0, 0, 1);

function disposeSprite(key) {
    const entry = spriteEntries[key];
    if (!entry) return;
    entry.scene?.remove(entry.mesh);
    entry.geometry?.dispose?.();
    entry.material?.dispose?.();
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

function ensureSprite({ key, scene, spriteUrl, onReady }) {
    if (!scene || !spriteUrl) {
        disposeSprite(key);
        return;
    }

    const resolvedUrl = resolveSpriteUrl(spriteUrl);
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
        onReady(current.mesh);
        return;
    }

    const token = ++loadTokens[key];
    textureLoader.load(
        resolvedUrl,
        (texture) => {
            if (token !== loadTokens[key]) {
                texture.dispose?.();
                return;
            }
            disposeSprite(key);
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
            spriteEntries[key] = { mesh, geometry, material, texture, scene, url: resolvedUrl };
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
    direction.multiplyScalar(TILE_SIZE);

    const anchor = playerEntity.position.clone().add(direction);
    anchor.y = PLAYER_CONFIG.baseHeight + PLAYER_HEIGHT_OFFSET;
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
    direction.multiplyScalar(TILE_SIZE);

    const anchor = opponentEntity.position.clone().add(direction);
    anchor.y = PLAYER_CONFIG.baseHeight + OPPONENT_HEIGHT_OFFSET;
    mesh.position.copy(anchor);

    if (playerEntity) {
        const lookAt = playerEntity.position.clone();
        lookAt.y = anchor.y;
        mesh.lookAt(lookAt);
    } else if (opponentEntity.quaternion) {
        mesh.quaternion.copy(opponentEntity.quaternion);
    }
}

export function setWorldPokemonSprites({
    scene,
    playerEntity,
    opponentEntity,
    playerSpriteUrl,
    opponentSpriteUrl
} = {}) {
    ensureSprite({
        key: 'player',
        scene,
        spriteUrl: playerSpriteUrl,
        onReady: (mesh) => placePlayerPokemon(mesh, playerEntity, opponentEntity)
    });

    ensureSprite({
        key: 'opponent',
        scene,
        spriteUrl: opponentSpriteUrl,
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
