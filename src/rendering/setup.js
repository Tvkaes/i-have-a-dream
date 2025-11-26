import * as THREE from 'three';
import { createHandPaintedPostProcess } from './postprocess.js';

const USE_HAND_PAINTED_FX = true;
const HAND_PAINTED_RESOLUTION_SCALE = 0.85;
const MAX_PIXEL_RATIO_DESKTOP = 1.5;
const MAX_PIXEL_RATIO_MOBILE = 1.25;
const MOBILE_VIEWPORT_QUERY = '(max-width: 768px)';

export function getCanvasContainer() {
    const container = document.getElementById('canvas-container');
    if (!container) {
        throw new Error('No se encontró el contenedor del canvas');
    }
    return container;
}

export function createSceneInstance() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 35, 70);
    return scene;
}

export function isMobileViewport() {
    return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
}

export function getMaxPixelRatio() {
    return isMobileViewport() ? MAX_PIXEL_RATIO_MOBILE : MAX_PIXEL_RATIO_DESKTOP;
}

export function createRenderer(container) {
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

export function createCameraContext() {
    return {
        camera: new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000),
        cameraTarget: new THREE.Vector3(),
        lookTarget: new THREE.Vector3(),
        offset: new THREE.Vector3(0, 8, 10)
    };
}

export function addLights(scene) {
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

export function setupPostProcess(renderer) {
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

export function setupLoadingCallbacks(loadingManager, enablePostProcess, postProcessFallback, options = {}) {
    if (!loadingManager) return;

    const { onStart = null, onComplete = null } = options;

    const finalizePostProcess = () => {
        enablePostProcess?.();
        if (postProcessFallback) {
            clearTimeout(postProcessFallback);
        }
        onComplete?.();
    };

    onStart?.();
    loadingManager.onLoad = finalizePostProcess;
    loadingManager.onError = finalizePostProcess;

    return () => {
        loadingManager.onLoad = null;
        loadingManager.onError = null;
        finalizePostProcess();
    };
}

export function setupResizeHandler({ cameraContext, renderer, handPaintedFX }) {
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
