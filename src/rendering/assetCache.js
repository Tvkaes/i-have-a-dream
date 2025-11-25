import * as THREE from 'three';

const gltfCache = new Map();
const fbxCache = new Map();
const textureCache = new Map();

export async function loadCachedGLTF(loader, url) {
    if (!loader || !url) {
        throw new Error('loadCachedGLTF requiere un loader y una URL válidos');
    }
    if (!gltfCache.has(url)) {
        gltfCache.set(url, loader.loadAsync(url));
    }
    return gltfCache.get(url);
}

export async function loadCachedFBX(loader, url) {
    if (!loader || !url) {
        throw new Error('loadCachedFBX requiere un loader y una URL válidos');
    }
    if (!fbxCache.has(url)) {
        fbxCache.set(url, loader.loadAsync(url));
    }
    return fbxCache.get(url);
}

export function loadCachedTexture(url, configure) {
    if (!url) {
        throw new Error('loadCachedTexture requiere una URL válida');
    }
    if (!textureCache.has(url)) {
        const loader = new THREE.TextureLoader();
        const texture = loader.load(url);
        configure?.(texture);
        textureCache.set(url, texture);
    }
    return textureCache.get(url);
}

export function clearAssetCache() {
    gltfCache.clear();
    fbxCache.clear();
    textureCache.forEach((texture) => texture?.dispose?.());
    textureCache.clear();
}
