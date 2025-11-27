import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLAYER_CONFIG, TILE_SIZE } from '../config/index.js';
import { INTERACTION_DIALOGUES } from '../config/dialogues.js';
import { registerInteractable } from './index.js';
import { HOUSE_CONFIGS } from './houseConfigs.js';
import {
    createFloor,
    createWalls,
    createCeiling,
    createFurniture,
    createExitDoor
} from './interiorComponents.js';
import { enableOnlyWorldColliders, registerWorldBodies } from '../physics/index.js';
import { POKEBALL_MODEL_PATH } from '../config/assets.js';
import { loadCachedGLTF } from '../rendering/assetCache.js';

const POKEBALL_SCALE = 0.04;
const worlds = new Map();
let currentWorldId = 'exterior';
let transitionCallback = null;
let returnPosition = null; // Guarda la posición desde donde se entró a un interior

export function registerWorld(id, worldGroup, spawnPosition = null) {
    worlds.set(id, {
        group: worldGroup,
        spawnPosition: spawnPosition || new THREE.Vector3(0, PLAYER_CONFIG.baseHeight, 0)
    });
}

function createPokemonTable() {
    const group = new THREE.Group();
    const tableTop = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.2, 1),
        new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
    );
    tableTop.position.y = 0.8;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    group.add(tableTop);

    const legGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x5d3a1a });
    const legPositions = [
        [-1.3, 0.4, -0.4],
        [1.3, 0.4, -0.4],
        [-1.3, 0.4, 0.4],
        [1.3, 0.4, 0.4]
    ];
    legPositions.forEach(([x, y, z]) => {
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(x, y, z);
        leg.castShadow = true;
        group.add(leg);
    });

    return group;
}

let pokeballPrototypePromise = null;
function loadPokeballAsset() {
    if (pokeballPrototypePromise) return pokeballPrototypePromise;
    const loader = new GLTFLoader();
    const url = new URL(POKEBALL_MODEL_PATH, import.meta.url).href;
    pokeballPrototypePromise = loadCachedGLTF(loader, url)
        .then((gltf) => {
            const prototype = gltf.scene || gltf.scenes?.[0] || null;
            if (prototype) {
                prototype.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                prototype.scale.setScalar(POKEBALL_SCALE);
                prototype.rotation.x = -Math.PI / 2;
            }
            return prototype;
        })
        .catch((error) => {
            console.warn('No se pudo cargar el modelo de Pokébola:', error);
            return null;
        });
    return pokeballPrototypePromise;
}

function applyPokeballOrientation(target) {
    if (!target) return;
    target.rotation.set(-Math.PI , Math.PI / 2, Math.PI);
    
}

function createPokeballFallback() {
    const placeholder = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    placeholder.castShadow = true;
    placeholder.receiveShadow = true;
    placeholder.scale.setScalar(POKEBALL_SCALE / 0.25);
    applyPokeballOrientation(placeholder);
    return placeholder;
}

function createPokeballMesh() {
    const placeholder = createPokeballFallback();
    loadPokeballAsset().then((prototype) => {
        if (!prototype || !placeholder.parent) return;
        const clone = prototype.clone(true);
        clone.position.copy(placeholder.position);
        clone.quaternion.copy(placeholder.quaternion);
        clone.scale.setScalar(POKEBALL_SCALE);
        applyPokeballOrientation(clone);
        placeholder.parent.add(clone);
        placeholder.removeFromParent();
    });
    return placeholder;
}

function createKidNPC() {
    const group = new THREE.Group();
    group.name = 'KidNPC';

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.3), new THREE.MeshStandardMaterial({ color: 0xff8c69 }));
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffddb0 }));
    head.position.y = 1.35;
    head.castShadow = true;
    group.add(head);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.25, 16), new THREE.MeshStandardMaterial({ color: 0x3366ff }));
    cap.rotation.x = Math.PI;
    cap.position.y = 1.55;
    cap.castShadow = true;
    group.add(cap);

    return group;
}

export function getCurrentWorldId() {
    return currentWorldId;
}

export function setTransitionCallback(callback) {
    transitionCallback = callback;
}

export function loadWorld(worldId, scene, player, onComplete = null, returnPos = null, physics = null) {
    const targetWorld = worlds.get(worldId);
    if (!targetWorld) {
        console.warn(`Mundo "${worldId}" no encontrado`);
        return;
    }

    const loadingScreen = window.__loadingScreen__;
    loadingScreen?.show('Cambiando de escenario...');

    // Guardar posición de retorno si se proporciona (entrando a un interior)
    if (returnPos) {
        returnPosition = returnPos.clone();
    }

    // Si estamos saliendo al exterior, usar la posición de retorno guardada
    const spawnPos = (worldId === 'exterior' && returnPosition) 
        ? returnPosition 
        : targetWorld.spawnPosition;

    // Limpiar escena (solo grupos de mundo, no luces/cámara)
    const toRemove = [];
    scene.children.forEach((child) => {
        if (child.userData?.isWorldGroup) {
            toRemove.push(child);
        }
    });
    toRemove.forEach((child) => scene.remove(child));

    // Agregar nuevo mundo
    targetWorld.group.userData.isWorldGroup = true;
    scene.add(targetWorld.group);

    // Reposicionar jugador (tanto visual como física)
    player.position.copy(spawnPos);
    player.rotation.y = 0;

    // IMPORTANTE: Actualizar también el cuerpo de física para evitar que sobrescriba la posición
    if (physics?.playerBody) {
        physics.playerBody.setTranslation(
            { x: spawnPos.x, y: 0, z: spawnPos.z },
            true
        );
        physics.playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    // Activar solo los colliders del mundo actual
    enableOnlyWorldColliders(physics, worldId);

    // Limpiar returnPosition al volver al exterior
    if (worldId === 'exterior') {
        returnPosition = null;
    }

    currentWorldId = worldId;

    if (transitionCallback) {
        transitionCallback(worldId);
    }

    if (onComplete) {
        onComplete();
    }

    loadingScreen?.hide();
}


export function createHouseInterior(houseType, physics = null) {
    const config = HOUSE_CONFIGS[houseType] || HOUSE_CONFIGS.green;
    const group = new THREE.Group();
    group.name = `interior-${houseType}`;

    const {
        roomSize,
        wallHeight,
        floorColor,
        wallColor,
        ceilingColor,
        furniture,
        lighting
    } = config;

    // Crear colliders para las paredes del interior
    if (physics?.world && physics.rapier) {
        const bodies = [];
        const halfRoom = roomSize / 2;
        const wallThickness = 0.5;

        // Pared trasera (norte)
        const backWall = physics.world.createRigidBody(
            physics.rapier.RigidBodyDesc.fixed().setTranslation(0, 0, -halfRoom)
        );
        physics.world.createCollider(
            physics.rapier.ColliderDesc.cuboid(halfRoom, wallHeight, wallThickness),
            backWall
        );
        bodies.push(backWall);

        // Pared izquierda (oeste)
        const leftWall = physics.world.createRigidBody(
            physics.rapier.RigidBodyDesc.fixed().setTranslation(-halfRoom, 0, 0)
        );
        physics.world.createCollider(
            physics.rapier.ColliderDesc.cuboid(wallThickness, wallHeight, halfRoom),
            leftWall
        );
        bodies.push(leftWall);

        // Pared derecha (este)
        const rightWall = physics.world.createRigidBody(
            physics.rapier.RigidBodyDesc.fixed().setTranslation(halfRoom, 0, 0)
        );
        physics.world.createCollider(
            physics.rapier.ColliderDesc.cuboid(wallThickness, wallHeight, halfRoom),
            rightWall
        );
        bodies.push(rightWall);

        // Pared frontal con puerta (sur) - dos segmentos a los lados de la puerta
        const doorWidth = 2;
        const sideWidth = (roomSize - doorWidth) / 2 - wallThickness;
        
        const leftDoorWall = physics.world.createRigidBody(
            physics.rapier.RigidBodyDesc.fixed().setTranslation(-halfRoom + sideWidth / 2, 0, halfRoom)
        );
        physics.world.createCollider(
            physics.rapier.ColliderDesc.cuboid(sideWidth / 2, wallHeight, wallThickness),
            leftDoorWall
        );
        bodies.push(leftDoorWall);

        const rightDoorWall = physics.world.createRigidBody(
            physics.rapier.RigidBodyDesc.fixed().setTranslation(halfRoom - sideWidth / 2, 0, halfRoom)
        );
        physics.world.createCollider(
            physics.rapier.ColliderDesc.cuboid(sideWidth / 2, wallHeight, wallThickness),
            rightDoorWall
        );
        bodies.push(rightDoorWall);

        registerWorldBodies(physics, `interior-${houseType}`, bodies, { enabled: false });
    }

    // Agregar suelo
    group.add(createFloor(roomSize, floorColor));

    // Agregar paredes
    createWalls(roomSize, wallHeight, wallColor).forEach(wall => group.add(wall));

    // Agregar techo
    group.add(createCeiling(roomSize, wallHeight, ceilingColor));

    // Iluminación específica
    if (lighting?.ambient) {
        const ambient = new THREE.AmbientLight(lighting.ambient.color ?? 0xffffff, lighting.ambient.intensity ?? 0.4);
        group.add(ambient);
    }

    if (lighting?.point) {
        const pointConfig = lighting.point;
        const pointLight = new THREE.PointLight(pointConfig.color ?? 0xffffff, pointConfig.intensity ?? 1, pointConfig.distance ?? 10);
        const [px = 0, py = wallHeight - 0.5, pz = 0] = pointConfig.position ?? [];
        pointLight.position.set(px, py, pz);
        pointLight.castShadow = true;
        group.add(pointLight);
    }

    // Agregar muebles
    createFurniture(furniture).forEach(item => group.add(item));

    if (houseType === 'green') {
        const kid = createKidNPC();
        kid.position.set(-3, 0, 0.5);
        group.add(kid);

        registerInteractable({
            id: 'kid-green-house',
            position: new THREE.Vector3(-1.5, PLAYER_CONFIG.baseHeight, -1),
            radius: TILE_SIZE,
            worldId: 'interior-green',
            ...INTERACTION_DIALOGUES.kidGreenHouse,
            onChoiceSelect: (choice) => {
                const overlay = window.__interactionOverlay__;
                if (!overlay) return;
                if (choice.id === 'yes') {
                    overlay.showMessage('¡Genial! Imagina que esta sala es una ciudad entera.', 'Milo', 'portraits/kid.png');
                } else {
                    overlay.showMessage('Está bien, te esperaré por si cambias de idea.', 'Milo', 'portraits/kid.png');
                }
            }
        });

        const table = createPokemonTable();
        table.position.set(2.5, 0, 0);
        table.rotation.y = Math.PI / 2;
        group.add(table);

        if (physics?.world && physics.rapier) {
            const body = physics.world.createRigidBody(
                physics.rapier.RigidBodyDesc.fixed().setTranslation(2.5, 0.45, 0)
            );
            const collider = physics.rapier.ColliderDesc.cuboid(0.5, 0.45, 1.5)
                .setTranslation(0, 0.45, 0);
            physics.world.createCollider(collider, body);
            registerWorldBodies(physics, 'interior-green', [body], { enabled: false });
        }

        const pokeballData = [
            { id: 'poke-chikorita', dialogue: INTERACTION_DIALOGUES.pokeChikorita, position: new THREE.Vector3(2.2, 1.05, -1.2) },
            { id: 'poke-squirtle', dialogue: INTERACTION_DIALOGUES.pokeSquirtle, position: new THREE.Vector3(2.2, 1.05, 0) },
            { id: 'poke-pidgey', dialogue: INTERACTION_DIALOGUES.pokePidgey, position: new THREE.Vector3(2.2, 1.05, 1.2) },
            { id: 'poke-rattata', dialogue: INTERACTION_DIALOGUES.pokeRattata, position: new THREE.Vector3(2.8, 1.05, -1.2) },
            { id: 'poke-pikachu', dialogue: INTERACTION_DIALOGUES.pokePikachu, position: new THREE.Vector3(2.8, 1.05, 0) },
            { id: 'poke-eevee', dialogue: INTERACTION_DIALOGUES.pokeEevee, position: new THREE.Vector3(2.8, 1.05, 1.2) }
        ];

        pokeballData.forEach(({ id, dialogue, position }) => {
            const pokeball = createPokeballMesh();
            pokeball.position.copy(position);
            group.add(pokeball);

            registerInteractable({
                id,
                position: new THREE.Vector3(position.x, PLAYER_CONFIG.baseHeight, position.z),
                radius: TILE_SIZE,
                worldId: 'interior-green',
                ...dialogue
            });
        });
    }

    // Puerta de salida
    const { door: exitDoor, doorZ } = createExitDoor(roomSize);
    group.add(exitDoor);

    // Registrar interactable para salir (asociado a este interior específico)
    registerInteractable({
        id: `exit-door-${houseType}`,
        position: new THREE.Vector3(0, PLAYER_CONFIG.baseHeight, doorZ),
        radius: TILE_SIZE,
        prompt: 'Presiona Enter para salir',
        message: [],
        worldId: `interior-${houseType}`, // Asociar al mundo interior
        onInteract: () => {
            const overlay = window.__interactionOverlay__;
            if (overlay && overlay.loadWorld) {
                overlay.loadWorld('exterior');
            }
        }
    });

    return group;
}

export function setupHouseInteriors(scene, physics = null) {
    const interiors = ['green', 'blue', 'yellow1', 'yellow2'];
    
    interiors.forEach((houseType) => {
        const interior = createHouseInterior(houseType, physics);
        const config = HOUSE_CONFIGS[houseType] || HOUSE_CONFIGS.green;
        // Calcular posición de spawn: un tile adelante de la puerta interior
        const doorZ = config.roomSize / 2 - 0.1;
        const spawnOffset = config.spawnOffset ?? {};
        const spawnPos = new THREE.Vector3(
            spawnOffset.x ?? 0,
            PLAYER_CONFIG.baseHeight,
            spawnOffset.z ?? (doorZ - TILE_SIZE * 1.5)
        );
        registerWorld(`interior-${houseType}`, interior, spawnPos);
    });
}
