import * as THREE from 'three';

let gradientTexture = null;

function getGradientTexture() {
    if (gradientTexture) return gradientTexture;
    const steps = [
        22, 26, 35,
        88, 94, 122,
        180, 186, 214,
        252, 252, 255
    ];
    const data = new Uint8Array(steps.length + steps.length / 3);
    let ptr = 0;
    for (let i = 0; i < steps.length; i += 3) {
        data[ptr++] = steps[i];
        data[ptr++] = steps[i + 1];
        data[ptr++] = steps[i + 2];
        data[ptr++] = 255;
    }
    gradientTexture = new THREE.DataTexture(data, ptr / 4, 1, THREE.RGBAFormat);
    gradientTexture.colorSpace = THREE.SRGBColorSpace;
    gradientTexture.needsUpdate = true;
    gradientTexture.magFilter = THREE.NearestFilter;
    gradientTexture.minFilter = THREE.NearestFilter;
    gradientTexture.generateMipmaps = false;
    return gradientTexture;
}

export function createToonMaterial({
    color = 0xffffff,
    emissive = 0x000000,
    emissiveIntensity = 0,
    transparent = false,
    opacity = 1,
    side = THREE.DoubleSide,
    gradientMap = getGradientTexture()
} = {}) {
    return new THREE.MeshToonMaterial({
        color,
        emissive,
        emissiveIntensity,
        gradientMap,
        transparent,
        opacity,
        side
    });
}

export function createGlowMaterial({ color = 0xffffff, opacity = 0.65 } = {}) {
    return new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
}

export function createRibbonMaterial({ color = 0xffffff, opacity = 0.8 } = {}) {
    return new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });
}
