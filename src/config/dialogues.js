const YES_NO_CHOICES = Object.freeze([
    Object.freeze({ id: 'yes', label: 'Sí' }),
    Object.freeze({ id: 'no', label: 'No' })
]);

export const INTERACTION_DIALOGUES = Object.freeze({
    default: Object.freeze({
        prompt: 'Presiona Enter para interactuar',
        speaker: '',
        message: []
    }),
    signWelcome: Object.freeze({
        prompt: 'Presiona Enter para leer el letrero',
        speaker: 'Letrero',
        portrait: 'portraits/sign.png',
        message: [
            '!Bienvenido a mi sueño!',
            'por alguna razon puedes explorar, no te preocupes tu si podras despertar...'
        ]
    }),
    houseGreen: Object.freeze({
        prompt: 'Presiona Enter para tocar la puerta',
        speaker: 'Casa principal',
        portrait: 'portraits/mainHouse.png',
        message: [
            'La puerta está tibia, como si alguien hubiera salido hace poco.',
            'Sientes que este lugar guarda algo especial para ti.',
            '¿Deseas entrar a la casa?'
        ],
        choices: YES_NO_CHOICES
    }),
    houseBlue: Object.freeze({
        prompt: 'Presiona Enter para tocar la puerta',
        speaker: 'Casa azul',
        portrait: 'portraits/blueHouse.png',
        message: [
            'La puerta quedó entreabierta, como si alguien la hubiera olvidado así en medio del caos.',
            'Sale una mezcla de luz y música de Skrillex a todo volumen, recordándote esa etapa descuidada de secundaria.',
            'Nadie responde, pero notas una carta pegada con tu nombre.',
            '¿Deseas entrar a la casa?'
        ],
        choices: YES_NO_CHOICES
    }),
    houseYellow1: Object.freeze({
        prompt: 'Presiona Enter para tocar la puerta',
        speaker: 'Casa amarilla',
        portrait: 'portraits/yellowHouse.png',
        message: [
            'La casa huele a pan recién horneado.',
            'Tal vez regresen pronto… quizás deberías esperar.',
            '¿Deseas entrar a la casa?'
        ],
        choices: YES_NO_CHOICES
    }),
    houseYellow2: Object.freeze({
        prompt: 'Presiona Enter para tocar la puerta',
        speaker: 'Casa amarilla',
        portrait: 'portraits/yellowHouse.png',
        message: [
            'Escuchas risas lejanas al tocar.',
            'Hay un letrero: "Vuelve cuando traigas flores".',
            '¿Deseas entrar a la casa?'
        ],
        choices: YES_NO_CHOICES
    }),
    kidGreenHouse: Object.freeze({
        prompt: 'Presiona Enter para hablar con Milo',
        speaker: 'Milo',
        portrait: 'portraits/kid.png',
        message: [
            'Oye, me pareces conocido... es como si vivieras aquí también.',
            'Aunque no parezca, fui el primero en llegar a esta aldea.',
            'Nunca pude jugar con alguien Pokémon; siempre tuve dos Game Boy y el cable para batallar, pero jamás pude competir.',
            'Oye, tengo una idea: veamos qué tan bueno eres.',
            '¿Quieres jugar conmigo?'
        ],
        choices: YES_NO_CHOICES
    }),
    pokeChikorita: Object.freeze({
        prompt: 'Presiona Enter para revisar la Pokébola',
        speaker: 'Pokébola',
        portrait: 'portraits/pokeball.png',
        message: [
            'Dentro sientes una energía calmada y fresca.',
            'Chikorita parece balancear suavemente su hoja.',
            '¿Quieres que Chikorita forme parte de tu equipo?'
        ],
        choices: YES_NO_CHOICES
    }),
    pokeSquirtle: Object.freeze({
        prompt: 'Presiona Enter para revisar la Pokébola',
        speaker: 'Pokébola',
        portrait: 'portraits/pokeball.png',
        message: [
            'Escuchas un pequeño chapoteo al acercarte.',
            'Squirtle parece impaciente por demostrar su caparazón.',
            '¿Quieres que Squirtle forme parte de tu equipo?'
        ],
        choices: YES_NO_CHOICES
    }),
    pokePidgey: Object.freeze({
        prompt: 'Presiona Enter para revisar la Pokébola',
        speaker: 'Pokébola',
        portrait: 'portraits/pokeball.png',
        message: [
            'Un leve batir de alas resuena en tu mano.',
            'Pidgey vigila todo desde las alturas incluso dentro de la esfera.',
            '¿Quieres que Pidgey forme parte de tu equipo?'
        ],
        choices: YES_NO_CHOICES
    }),
    pokeRattata: Object.freeze({
        prompt: 'Presiona Enter para revisar la Pokébola',
        speaker: 'Pokébola',
        portrait: 'portraits/pokeball.png',
        message: [
            'Sientes un movimiento rápido y nervioso.',
            'Rattata parece listo para correr hacia cualquier reto.',
            '¿Quieres que Rattata forme parte de tu equipo?'
        ],
        choices: YES_NO_CHOICES
    }),
    pokePikachu: Object.freeze({
        prompt: 'Presiona Enter para revisar la Pokébola',
        speaker: 'Pokébola',
        portrait: 'portraits/pokeball.png',
        message: [
            'Un pequeño chispazo te eriza la piel.',
            'Pikachu parece sonreír desde dentro.',
            '¿Quieres que Pikachu forme parte de tu equipo?'
        ],
        choices: YES_NO_CHOICES
    }),
    pokeEevee: Object.freeze({
        prompt: 'Presiona Enter para revisar la Pokébola',
        speaker: 'Pokébola',
        portrait: 'portraits/pokeball.png',
        message: [
            'Percibes un suave ronroneo y un sinfín de posibilidades.',
            'Eevee parece esperar la decisión que definirá su evolución.',
            '¿Quieres que Eevee forme parte de tu equipo?'
        ],
        choices: YES_NO_CHOICES
    })
});
