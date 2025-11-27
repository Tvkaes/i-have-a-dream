// Configuraciones únicas para cada tipo de casa
export const HOUSE_CONFIGS = {
    green: {
        roomSize: 9,
        wallHeight: 5,
        floorColor: 0x6b8e4a,
        wallColor: 0xd4e8c1,
        ceilingColor: 0xa8c686,
        spawnOffset: { x: 0, z: 2 },
        lighting: {
            point: { color: 0xfff0d0, intensity: 1.2, distance: 14, position: [0, 4.5, 1] },
            ambient: { color: 0xf9f5e6, intensity: 0.35 }
        },
        furniture: [
            { type: 'table', pos: [0, 0.5, -2], size: [1.5, 1, 1.5], color: 0x8b6914 },
            { type: 'chair', pos: [-1, 0.4, -2], size: [0.5, 0.8, 0.5], color: 0x6b4423 },
            { type: 'chair', pos: [1, 0.4, -2], size: [0.5, 0.8, 0.5], color: 0x6b4423 }
        ]
    },
    blue: {
        roomSize: 6,
        wallHeight: 4.5,
        floorColor: 0x4a6b8e,
        wallColor: 0xb3d4e8,
        ceilingColor: 0x86a8c6,
        spawnOffset: { x: 0, z: 1.5 },
        lighting: {
            point: { color: 0xb8d8ff, intensity: 1.1, distance: 11, position: [0.5, 4, -0.5] },
            ambient: { color: 0xdcefff, intensity: 0.45 }
        },
        furniture: [
            { type: 'desk', pos: [-2, 0.6, -1.5], size: [1.2, 1.2, 0.8], color: 0x5d4a3a },
            { type: 'shelf', pos: [2, 1.2, -2.5], size: [0.3, 2.4, 1.5], color: 0x8b6914 }
        ]
    },
    yellow1: {
        roomSize: 7,
        wallHeight: 4.2,
        floorColor: 0xd4a855,
        wallColor: 0xfff4d4,
        ceilingColor: 0xf5e6c1,
        spawnOffset: { x: 0, z: 1.75 },
        lighting: {
            point: { color: 0xffe8b0, intensity: 1.25, distance: 12, position: [-0.3, 4.2, -0.3] },
            ambient: { color: 0xfff1d0, intensity: 0.4 }
        },
        furniture: [
            { type: 'bed', pos: [-2, 0.4, -2], size: [2, 0.8, 1.5], color: 0xe8d0a0 },
            { type: 'nightstand', pos: [-2, 0.4, -0.5], size: [0.6, 0.8, 0.6], color: 0x8b6914 }
        ]
    },
    yellow2: {
        roomSize: 5.5,
        wallHeight: 3.8,
        floorColor: 0xe8c06f,
        wallColor: 0xfff8e6,
        ceilingColor: 0xffedb3,
        spawnOffset: { x: 0, z: 1.3 },
        lighting: {
            point: { color: 0xfff0c9, intensity: 1.15, distance: 10, position: [0, 3.5, 0.4] },
            ambient: { color: 0xfff5d7, intensity: 0.32 }
        },
        furniture: [
            { type: 'couch', pos: [0, 0.5, -2], size: [2.5, 1, 1], color: 0xb35900 },
            { type: 'lamp', pos: [2, 1.5, -1], size: [0.3, 3, 0.3], color: 0xd4a855 }
        ]
    }
};
