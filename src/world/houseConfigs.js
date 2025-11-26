// Configuraciones únicas para cada tipo de casa
export const HOUSE_CONFIGS = {
    green: {
        roomSize: 8,
        wallHeight: 5,
        floorColor: 0x6b8e4a,
        wallColor: 0xd4e8c1,
        ceilingColor: 0xa8c686,
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
        furniture: [
            { type: 'couch', pos: [0, 0.5, -2], size: [2.5, 1, 1], color: 0xb35900 },
            { type: 'lamp', pos: [2, 1.5, -1], size: [0.3, 3, 0.3], color: 0xd4a855 }
        ]
    }
};
