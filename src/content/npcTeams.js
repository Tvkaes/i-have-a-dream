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
                height: 0.5,
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
                sprite: {
                    front:{
                        image:'/pokemon/cyndaquill/cyndaquill_front.png',
                        frames:84,
                        width: 44,
                        height: 37,
                    },
                    back:{
                        image:'/pokemon/cyndaquill/cyndaquill_back.png',
                        frames:129,
                        width: 46,
                        height: 37,
                    }
                },
                moveset_level_13: ['Ember', 'Smokescreen', 'Quick Attack', 'Tackle']
            },
            {
                name: 'Totodile',
                level: 13,
                type: ['Water'],
                height: 0.6,
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
                sprite: {
                    front:{
                        image:'/pokemon/totodile/totodile_front.png',
                        frames:54,
                        width: 43,
                        height: 58,
                    },
                    back:{
                        image:'/pokemon/totodile/totodile_back.png',
                        frames:45,
                        width: 44,
                        height: 63,
                    }
                },
                moveset_level_13: ['Water Gun', 'Bite', 'Scratch', 'Leer']
            },
            {
                name: 'Gastly',
                level: 13,
                type: ['Ghost', 'Poison'],
                height: 1.3,
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
                sprite: {
                    front:{
                        image:'/pokemon/gastly/gastly_front.png',
                        frames:57,
                        width: 67,
                        height: 75,
                    },
                    back:{
                        image:'/pokemon/gastly/gastly_back.png',
                        frames:110,
                        width: 64,
                        height: 78,
                    }
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
        height: 0.9,
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
        sprite: {
            front:{
                image:'/pokemon/chikorita/chikorita_front.png',
                frames:36,
                width: 41,
                height: 56,
            },
            back:{
                image:'/pokemon/chikorita/chikorita_back.png',
                frames:53,
                width: 41,
                height: 59,
            }
        },
        moveset_level_13: ['Razor Leaf', 'Tackle', 'Poison Powder', 'Synthesis']
    },
    {
        name: 'Squirtle',
        level: 13,
        type: ['Water'],
        height: 0.5,
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
        sprite: {
            front:{
                image:'/pokemon/squirtle/squirtle_front.png',
                frames:30,
                width: 39,
                height: 43,
            },
            back:{
                image:'/pokemon/squirtle/squirtle_back.png',
                frames:34,
                width: 41,
                height: 47,
            }
        },
        moveset_level_13: ['Water Gun', 'Bite', 'Withdraw', 'Tackle']
    },
    {
        name: 'Pidgey',
        level: 13,
        type: ['Normal', 'Flying'],
        height: 0.3,
        stats: {
            hp: 38,
            attack: 21,
            defense: 20,
            special_attack: 19,
            special_defense: 21,
            speed: 27
        },
        base_stats: {
            hp: 40,
            attack: 45,
            defense: 40,
            special_attack: 35,
            special_defense: 35,
            speed: 56
        },
        assumptions: {
            IV: 31,
            EV: 0,
            nature: 'Neutral'
        },
        sprite: {
            front:{
                image:'/pokemon/pidgey/pidgey_front.png',
                frames:25,
                width: 42,
                height: 48,
            },
            back:{
                image:'/pokemon/pidgey/pidgey_back.png',
                frames:20,
                width: 47,
                height: 48,
            }
        },
        moveset_level_13: ['Gust', 'Quick Attack', 'Sand Attack', 'Tackle']
    },
    {
        name: 'Rattata',
        level: 13,
        type: ['Normal'],
        height: 0.3,
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
        sprite: {
            front:{
                image:'/pokemon/ratatta/rattata_front.png',
                frames:54,
                width: 43,
                height: 43,
            },
            back:{
                image:'/pokemon/ratatta/rattata_back.png',
                frames:96,
                width: 43,
                height: 43,
            }
        },
        moveset_level_13: ['Quick Attack', 'Bite', 'Tackle', 'Focus Energy']
    },
    {
        name: 'Pikachu',
        level: 13,
        type: ['Electric'],
        height: 0.4,
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
        sprite: {
            front:{
                image:'/pokemon/pikachu/pikachu_front.png',
                frames:58,
                width: 50,
                height: 46,
            },
            back:{
                image:'/pokemon/pikachu/pikachu_back.png',
                frames:63,
                width: 43,
                height: 49,
            }
        },
        moveset_level_13: ['Thunder Shock', 'Quick Attack', 'Thunder Wave', 'Double Team']
    },
    {
        name: 'Eevee',
        level: 13,
        type: ['Normal'],
        height: 0.3,
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
        sprite: {
            front:{
                image:'/pokemon/eevee/eevee_front.png',
                frames:67,
                width: 46,
                height: 47,
            },
            back:{
                image:'/pokemon/eevee/eevee_back.png',
                frames:81,
                width: 51,
                height: 52,
            }
        },
        moveset_level_13: ['Quick Attack', 'Sand Attack', 'Covet', 'Growl']
    }
];
