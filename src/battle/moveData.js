const MOVE_DATA = {
    'razor leaf': { type: 'Planta', pp: 25, power: 55, accuracy: 95 },
    'tackle': { type: 'Normal', pp: 35, power: 40, accuracy: 100 },
    'poison powder': { type: 'Veneno', pp: 35, power: 0, accuracy: 75 },
    'synthesis': { type: 'Planta', pp: 5, power: 0, accuracy: 100 },
    'water gun': { type: 'Agua', pp: 25, power: 40, accuracy: 100 },
    'bite': { type: 'Siniestro', pp: 25, power: 60, accuracy: 100 },
    'withdraw': { type: 'Agua', pp: 40, power: 0, accuracy: 100 },
    'quick attack': { type: 'Normal', pp: 30, power: 40, accuracy: 100, priority: 1 },
    'focus energy': { type: 'Normal', pp: 30, power: 0, accuracy: 100 },
    'thunder shock': { type: 'Eléctrico', pp: 30, power: 40, accuracy: 100 },
    'thunder wave': {
        type: 'Eléctrico',
        pp: 20,
        power: 0,
        accuracy: 90,
        statusEffect: { type: 'PARALYZED', chance: 1 }
    },
    'double team': { type: 'Normal', pp: 15, power: 0, accuracy: 100 },
    'sand attack': { type: 'Tierra', pp: 15, power: 0, accuracy: 100 },
    'covet': { type: 'Normal', pp: 25, power: 60, accuracy: 100 },
    'growl': { type: 'Normal', pp: 40, power: 0, accuracy: 100 },
    'gust': { type: 'Volador', pp: 35, power: 40, accuracy: 100 },
    'ember': { type: 'Fuego', pp: 25, power: 40, accuracy: 100 },
    'smokescreen': {
        type: 'Normal',
        pp: 20,
        power: 0,
        accuracy: 100,
        statusEffect: { type: 'CONFUSED', chance: 0.5, minTurns: 2, maxTurns: 4 }
    },
    'scratch': { type: 'Normal', pp: 35, power: 40, accuracy: 100 },
    'leer': { type: 'Normal', pp: 30, power: 0, accuracy: 100 },
    'hypnosis': {
        type: 'Psíquico',
        pp: 20,
        power: 0,
        accuracy: 60,
        statusEffect: { type: 'SLEEP', chance: 1, minTurns: 2, maxTurns: 4 }
    },
    'lick': { type: 'Fantasma', pp: 30, power: 30, accuracy: 100 },
    'mean look': { type: 'Normal', pp: 5, power: 0, accuracy: 100 },
    'curse': { type: 'Fantasma', pp: 10, power: 0, accuracy: 100 }
};

function normalizeMoveName(name = '') {
    return String(name).trim().toLowerCase();
}

export function getMoveData(moveName) {
    const normalized = normalizeMoveName(moveName);
    if (!normalized) {
        return { id: '', name: moveName, type: 'Normal', pp: 20 };
    }
    const data = MOVE_DATA[normalized] || { type: 'Normal', pp: 20, power: 0, accuracy: 100 };
    return {
        ...data,
        id: normalized,
        name: moveName
    };
}

export function buildMoveEntry(moveName) {
    const data = getMoveData(moveName);
    return {
        id: data.id,
        name: moveName,
        label: moveName,
        type: data.type,
        pp: data.pp,
        currentPP: data.pp,
        power: data.power,
        accuracy: data.accuracy,
        priority: data.priority ?? 0
    };
}
