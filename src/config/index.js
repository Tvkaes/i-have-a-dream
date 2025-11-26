export const TILE_SIZE = 1;
export const MAP_WIDTH = 34;
export const MAP_HEIGHT = 30;
export const HALF_WORLD_WIDTH = (MAP_WIDTH * TILE_SIZE) / 2;
export const HALF_WORLD_HEIGHT = (MAP_HEIGHT * TILE_SIZE) / 2;
export const MAP_LIMIT = Math.min(HALF_WORLD_WIDTH, HALF_WORLD_HEIGHT) - 1;

export const DEFAULT_TOON_BANDS = 4;
export const GLB_TOON_BANDS = 2;

export const PLAYER_CONFIG = Object.freeze({
    speed: 5,
    bobSpeed: 6,
    bobHeight: 0.05,
    baseHeight: 0.1
});

export const PLAYER_COLLIDER = Object.freeze({
    radius: 0.4,
    halfHeight: 0.5
});

export const HOUSE_MODEL_ORDER = [
    'public/mainHouse.glb',
    'public/tinyHouse1.glb',
    'public/tinyHouse2.glb',
    'public/tinyHouse2.glb'
];

export const HOUSE_ROTATIONS = Object.freeze({
    'public/mainHouse.glb':  { x: 0, y: Math.PI * 1.5 },
    'public/tinyHouse1.glb': { x: 0, y: Math.PI * 1.5 },
    'public/tinyHouse2.glb': { x: 0, y: -Math.PI / 2 }
});

export const HOUSE_SCALE_MULTIPLIERS = Object.freeze({
    'public/mainHouse.glb':  1.3,
    'public/tinyHouse1.glb': 1.0,
    'public/tinyHouse2.glb': 1.2
});
