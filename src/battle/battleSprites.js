import * as THREE from 'three';

const SPRITE_WIDTH = 2.6;
const SPRITE_HEIGHT = 2.6;
const SPRITE_RENDER_ORDER = 20;
const SHADOW_HEIGHT = 0.05;
const SHADOW_RADIUS = 1.35;
const SHADOW_SEGMENTS = 24;
const SHADOW_OPACITY = 0.35;

const textureLoader = new THREE.TextureLoader();
const ROOT_ASSET_BASE = new URL('../../', import.meta.url);
let spriteGroup = null;
let currentScene = null;
const spriteEntries = {
    player: null,
    opponent: null
};
const animatedTextures = new Set();
let activeLoadToken = 0;

function ensureSpriteGroup(scene) {
    if (!spriteGroup) {
        spriteGroup = new THREE.Group();
        spriteGroup.name = 'BattlePokemonSprites';
    }
    if (scene && spriteGroup.parent !== scene) {
        scene.add(spriteGroup);
        currentScene = scene;
    }
}

function removeSpriteEntry(key) {
    const entry = spriteEntries[key];
    if (!entry) return;
    if (entry.sprite && spriteGroup) {
        spriteGroup.remove(entry.sprite);
    }
    if (entry.shadow && spriteGroup) {
        spriteGroup.remove(entry.shadow);
    }
    if (entry.material) {
        entry.material.dispose();
    }
    if (entry.texture) {
        animatedTextures.delete(entry.texture);
        entry.texture.dispose();
    }
    entry.shadowMaterial?.dispose?.();
    entry.shadowGeometry?.dispose?.();
    spriteEntries[key] = null;
}

function disposeAllSprites() {
    removeSpriteEntry('player');
    removeSpriteEntry('opponent');
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
        console.warn('[battleSprites] No se pudo resolver la ruta del sprite', url, error);
        return null;
    }
}

function createShadowEntry(position) {
    if (!position) return null;
    const geometry = new THREE.CircleGeometry(SHADOW_RADIUS, SHADOW_SEGMENTS);
    const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: SHADOW_OPACITY,
        depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x, SHADOW_HEIGHT, position.z);
    mesh.renderOrder = SPRITE_RENDER_ORDER - 1;

    return { mesh, geometry, material };
}

async function createSpriteEntry(url, position, { flipX = false } = {}) {
    const resolvedUrl = resolveSpriteUrl(url);
    if (!resolvedUrl) return null;
    try {
        const texture = await textureLoader.loadAsync(resolvedUrl);
        texture.encoding = THREE.sRGBEncoding;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        animatedTextures.add(texture);

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            alphaTest: 0.05
        });

        const sprite = new THREE.Sprite(material);
        const targetPosition = position?.clone?.() ?? new THREE.Vector3();
        sprite.position.copy(targetPosition);
        sprite.scale.set(flipX ? -SPRITE_WIDTH : SPRITE_WIDTH, SPRITE_HEIGHT, 1);
        sprite.renderOrder = SPRITE_RENDER_ORDER;

        const shadowEntry = createShadowEntry(targetPosition);

        return {
            sprite,
            material,
            texture,
            shadow: shadowEntry?.mesh ?? null,
            shadowGeometry: shadowEntry?.geometry ?? null,
            shadowMaterial: shadowEntry?.material ?? null
        };
    } catch (error) {
        console.warn('[battleSprites] No se pudo cargar el sprite', resolvedUrl, error);
        return null;
    }
}

export async function setBattleSprites({
    scene,
    playerSpriteUrl,
    opponentSpriteUrl,
    playerPosition,
    opponentPosition,
    mirrorPlayer = false
} = {}) {
    if (!scene) return;
    ensureSpriteGroup(scene);
    disposeAllSprites();
    activeLoadToken += 1;
    const loadToken = activeLoadToken;

    const [playerEntry, opponentEntry] = await Promise.all([
        createSpriteEntry(playerSpriteUrl, playerPosition, { flipX: mirrorPlayer }),
        createSpriteEntry(opponentSpriteUrl, opponentPosition, { flipX: false })
    ]);

    if (loadToken !== activeLoadToken) {
        // Otra carga comenzó; descartar esta
        if (playerEntry) {
            playerEntry.material.dispose();
            playerEntry.texture.dispose();
        }
        if (opponentEntry) {
            opponentEntry.material.dispose();
            opponentEntry.texture.dispose();
        }
        return;
    }

    if (playerEntry) {
        if (playerEntry.shadow) {
            spriteGroup.add(playerEntry.shadow);
        }
        spriteGroup.add(playerEntry.sprite);
        spriteEntries.player = playerEntry;
    }
    if (opponentEntry) {
        if (opponentEntry.shadow) {
            spriteGroup.add(opponentEntry.shadow);
        }
        spriteGroup.add(opponentEntry.sprite);
        spriteEntries.opponent = opponentEntry;
    }
}

export function clearBattleSprites() {
    disposeAllSprites();
    activeLoadToken += 1;
    if (spriteGroup && spriteGroup.parent) {
        spriteGroup.parent.remove(spriteGroup);
    }
    currentScene = null;
}

export function updateBattleSpriteTextures() {
    animatedTextures.forEach((texture) => {
        texture.needsUpdate = true;
    });
}
