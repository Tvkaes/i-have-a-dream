import * as THREE from 'three';
import { DEFAULT_TOON_BANDS } from '../config/index.js';

const gradientCache = new Map();
const toonMaterialCache = new Map();

export function getToonGradient(bands = DEFAULT_TOON_BANDS) {
    if (gradientCache.has(bands)) {
        return gradientCache.get(bands);
    }

    const colors = new Uint8Array(bands);
    for (let i = 0; i < bands; i++) {
        colors[i] = (i / (bands - 1)) * 255;
    }

    const gradientMap = new THREE.DataTexture(colors, bands, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.generateMipmaps = false;
    gradientMap.needsUpdate = true;

    gradientCache.set(bands, gradientMap);
    return gradientMap;
}

export function createToonMaterial(color, emissive = 0x000000, bands = DEFAULT_TOON_BANDS) {
    const key = `${color}-${emissive}-${bands}`;
    if (toonMaterialCache.has(key)) {
        return toonMaterialCache.get(key);
    }

    const saturated = saturateColor(new THREE.Color(color));
    const material = new THREE.MeshToonMaterial({
        color: saturated,
        gradientMap: getToonGradient(bands),
        emissive: new THREE.Color(emissive),
        emissiveIntensity: 0.1
    });

    toonMaterialCache.set(key, material);
    return material;
}

export function applyToonMaterial(object3D, bands = DEFAULT_TOON_BANDS, options = {}) {
    const gradientMap = getToonGradient(bands);
    const {
        saturationBoost = 1.4,
        lightnessBoost = 1.05,
        emissiveIntensity = 0.05
    } = options;

    object3D.traverse((child) => {
        if (!child.isMesh) return;

        const convert = (mat) => {
            const baseColor = mat && mat.color ? mat.color.clone() : new THREE.Color(0xffffff);
            const stylized = saturateColor(baseColor, { sBoost: saturationBoost, lBoost: lightnessBoost });
            if (mat && typeof mat.dispose === 'function') {
                mat.dispose();
            }
            const toon = new THREE.MeshToonMaterial({
                color: stylized,
                map: mat && mat.map ? mat.map : null,
                gradientMap,
                emissive: stylized.clone(),
                emissiveIntensity
            });
            toon.needsUpdate = true;
            return toon;
        };

        if (Array.isArray(child.material)) {
            child.material = child.material.map(convert);
        } else {
            child.material = convert(child.material);
        }

        child.castShadow = true;
        child.receiveShadow = true;
    });
}

function saturateColor(color, { sBoost = 1.4, lBoost = 1.05 } = {}) {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.s = Math.min(1, hsl.s * sBoost);
    hsl.l = Math.min(0.98, hsl.l * lBoost);
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
}
