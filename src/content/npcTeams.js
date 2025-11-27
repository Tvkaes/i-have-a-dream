export const NPC_TEAMS = {
    kidJonathan: {
        name: 'Jonathan (Niño)',
        trainerId: 'kid-jonathan',
        levelCap: 13,
        pokemon: [
            {
                name: 'Cyndaquil',
                level: 13,
                type: ['Fire'],
                stats: {
                    hp: 37,
                    attack: 22,
                    defense: 20,
                    special_attack: 24,
                    special_defense: 22,
                    speed: 25
                },
                base_stats: {
                    hp: 39,
                    attack: 52,
                    defense: 43,
                    special_attack: 60,
                    special_defense: 50,
                    speed: 65
                },
                assumptions: {
                    IV: 31,
                    EV: 0,
                    nature: 'Neutral'
                },
                moveset_level_13: ['Ember', 'Smokescreen', 'Quick Attack', 'Tackle']
            },
            {
                name: 'Totodile',
                level: 13,
                type: ['Water'],
                stats: {
                    hp: 40,
                    attack: 25,
                    defense: 25,
                    special_attack: 20,
                    special_defense: 21,
                    speed: 20
                },
                base_stats: {
                    hp: 50,
                    attack: 65,
                    defense: 64,
                    special_attack: 44,
                    special_defense: 48,
                    speed: 43
                },
                assumptions: {
                    IV: 31,
                    EV: 0,
                    nature: 'Neutral'
                },
                moveset_level_13: ['Water Gun', 'Bite', 'Scratch', 'Leer']
            },
            {
                name: 'Gastly',
                level: 13,
                type: ['Ghost', 'Poison'],
                stats: {
                    hp: 34,
                    attack: 18,
                    defense: 16,
                    special_attack: 35,
                    special_defense: 18,
                    speed: 29
                },
                base_stats: {
                    hp: 30,
                    attack: 35,
                    defense: 30,
                    special_attack: 100,
                    special_defense: 35,
                    speed: 80
                },
                assumptions: {
                    IV: 31,
                    EV: 0,
                    nature: 'Neutral'
                },
                moveset_level_13: ['Hypnosis', 'Lick', 'Mean Look', 'Curse']
            }
        ]
    }
};

export const PLAYER_POKEMON_CHOICES = [
    {
        name: 'Chikorita',
        level: 13,
        type: ['Grass'],
        stats: {
            hp: 41,
            attack: 20,
            defense: 27,
            special_attack: 21,
            special_defense: 27,
            speed: 20
        },
        base_stats: {
            hp: 45,
            attack: 49,
            defense: 65,
            special_attack: 49,
            special_defense: 65,
            speed: 45
        },
        assumptions: {
            IV: 31,
            EV: 0,
            nature: 'Neutral'
        },
        moveset_level_13: ['Razor Leaf', 'Tackle', 'Poison Powder', 'Synthesis']
    },
    {
        name: 'Squirtle',
        level: 13,
        type: ['Water'],
        stats: {
            hp: 39,
            attack: 22,
            defense: 30,
            special_attack: 23,
            special_defense: 29,
            speed: 21
        },
        base_stats: {
            hp: 44,
            attack: 48,
            defense: 65,
            special_attack: 50,
            special_defense: 64,
            speed: 43
        },
        assumptions: {
            IV: 31,
            EV: 0,
            nature: 'Neutral'
        },
        moveset_level_13: ['Water Gun', 'Bite', 'Withdraw', 'Tackle']
    },
    {
        name: 'Rattata',
        level: 13,
        type: ['Normal'],
        stats: {
            hp: 33,
            attack: 28,
            defense: 19,
            special_attack: 17,
            special_defense: 19,
            speed: 33
        },
        base_stats: {
            hp: 30,
            attack: 56,
            defense: 35,
            special_attack: 25,
            special_defense: 35,
            speed: 72
        },
        assumptions: {
            IV: 31,
            EV: 0,
            nature: 'Neutral'
        },
        moveset_level_13: ['Quick Attack', 'Bite', 'Tackle', 'Focus Energy']
    },
    {
        name: 'Pikachu',
        level: 13,
        type: ['Electric'],
        stats: {
            hp: 33,
            attack: 22,
            defense: 16,
            special_attack: 26,
            special_defense: 23,
            speed: 38
        },
        base_stats: {
            hp: 35,
            attack: 55,
            defense: 40,
            special_attack: 50,
            special_defense: 50,
            speed: 90
        },
        assumptions: {
            IV: 31,
            EV: 0,
            nature: 'Neutral'
        },
        moveset_level_13: ['Thunder Shock', 'Quick Attack', 'Thunder Wave', 'Double Team']
    },
    {
        name: 'Eevee',
        level: 13,
        type: ['Normal'],
        stats: {
            hp: 40,
            attack: 25,
            defense: 24,
            special_attack: 20,
            special_defense: 27,
            speed: 23
        },
        base_stats: {
            hp: 55,
            attack: 55,
            defense: 50,
            special_attack: 45,
            special_defense: 65,
            speed: 55
        },
        assumptions: {
            IV: 31,
            EV: 0,
            nature: 'Neutral'
        },
        moveset_level_13: ['Quick Attack', 'Sand Attack', 'Covet', 'Growl']
    }
];
