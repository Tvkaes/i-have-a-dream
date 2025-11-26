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
        portrait: 'public/portraits/sign.png',
        message: [
            '!Bienvenido a mi sueño!',
            'por alguna razon puedes explorar, no te preocupes tu si podras despertar...'
        ]
    }),
    houseGreen: Object.freeze({
        prompt: 'Presiona Enter para tocar la puerta',
        speaker: 'Casa principal',
        portrait: 'public/portraits/mainHouse.png',
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
        portrait: 'public/portraits/blueHouse.png',
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
        portrait: 'public/portraits/yellowHouse.png',
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
        portrait: 'public/portraits/yellowHouse.png',
        message: [
            'Escuchas risas lejanas al tocar.',
            'Hay un letrero: "Vuelve cuando traigas flores".',
            '¿Deseas entrar a la casa?'
        ],
        choices: YES_NO_CHOICES
    })
});
