const TYPE_ALIASES = Object.freeze({
    planta: 'grass',
    grass: 'grass',
    fuego: 'fire',
    fire: 'fire',
    agua: 'water',
    water: 'water',
    electrico: 'electric',
    elétrico: 'electric',
    'eléctrico': 'electric',
    electric: 'electric',
    normal: 'normal',
    veneno: 'poison',
    poison: 'poison',
    fantasma: 'ghost',
    ghost: 'ghost',
    volador: 'flying',
    flying: 'flying',
    tierra: 'ground',
    ground: 'ground',
    roca: 'rock',
    rock: 'rock',
    hielo: 'ice',
    ice: 'ice',
    siniestro: 'dark',
    dark: 'dark'
});

const TYPE_CHART = Object.freeze({
    fire: { grass: 2, ice: 2, bug: 2, steel: 2, fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5 },
    water: { fire: 2, rock: 2, ground: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
    grass: { water: 2, rock: 2, ground: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
    electric: { water: 2, flying: 2, electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0 },
    normal: { rock: 0.5, steel: 0.5, ghost: 0 },
    poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5 },
    ghost: { ghost: 2, psychic: 2, dark: 0.5, normal: 0 },
    ground: { fire: 2, electric: 2, rock: 2, poison: 2, steel: 2, bug: 0.5, grass: 0.5, flying: 0 },
    flying: { grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5, electric: 0.5 },
    rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
    ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5 },
    dark: { ghost: 2, psychic: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 }
});

function normalizeTypeName(typeName = '') {
    const normalized = String(typeName)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');
    return TYPE_ALIASES[normalized] || normalized || null;
}

function getEffectiveness(attackingType, defendingType) {
    if (!attackingType || !defendingType) return 1;
    const chart = TYPE_CHART[attackingType];
    if (!chart) return 1;
    return chart[defendingType] ?? 1;
}

export function getTypeMultiplier(attackingTypes = [], defendingTypes = []) {
    const atkTypes = (Array.isArray(attackingTypes) ? attackingTypes : [attackingTypes])
        .map(normalizeTypeName)
        .filter(Boolean);
    const defTypes = (Array.isArray(defendingTypes) ? defendingTypes : [defendingTypes])
        .map(normalizeTypeName)
        .filter(Boolean);

    if (!atkTypes.length || !defTypes.length) {
        return 1;
    }

    return atkTypes.reduce((outerProduct, atk) => {
        const defenderProduct = defTypes.reduce((product, def) => product * getEffectiveness(atk, def), 1);
        return outerProduct * defenderProduct;
    }, 1);
}

export function isStabMove(moveType, pokemonTypes = []) {
    if (!moveType) return false;
    const normalized = normalizeTypeName(moveType);
    if (!normalized) return false;
    const pokemonNormalized = (pokemonTypes || []).map(normalizeTypeName);
    return pokemonNormalized.includes(normalized);
}

export function normalizeTypes(types = []) {
    return (Array.isArray(types) ? types : [types])
        .map(normalizeTypeName)
        .filter(Boolean);
}
