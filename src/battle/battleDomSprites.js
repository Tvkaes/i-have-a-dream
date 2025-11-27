let overlayEl = null;
let playerImgEl = null;
let opponentImgEl = null;

function getCanvasContainer() {
    return document.getElementById('canvas-container') || document.body;
}

function ensureOverlay() {
    if (overlayEl) return overlayEl;
    const container = getCanvasContainer();
    overlayEl = document.createElement('div');
    overlayEl.id = 'battle-sprite-overlay';
    container.appendChild(overlayEl);

    playerImgEl = document.createElement('img');
    playerImgEl.className = 'battle-sprite-img battle-sprite-player hidden';
    playerImgEl.alt = 'Pokémon del jugador';
    overlayEl.appendChild(playerImgEl);

    opponentImgEl = document.createElement('img');
    opponentImgEl.className = 'battle-sprite-img battle-sprite-opponent hidden';
    opponentImgEl.alt = 'Pokémon rival';
    overlayEl.appendChild(opponentImgEl);

    return overlayEl;
}

function setImageSource(imgEl, src) {
    if (!imgEl) return;
    if (src) {
        imgEl.src = src;
        imgEl.dataset.hasSprite = 'true';
        imgEl.classList.remove('hidden');
    } else {
        imgEl.removeAttribute('src');
        imgEl.dataset.hasSprite = 'false';
        imgEl.classList.add('hidden');
    }
}
export function setBattlePokemonImages({ playerSpriteUrl = null, opponentSpriteUrl = null } = {}) {
    const overlay = ensureOverlay();
    overlay.classList.remove('hidden');
    setImageSource(playerImgEl, playerSpriteUrl);
    setImageSource(opponentImgEl, opponentSpriteUrl);
}

export function clearBattlePokemonImages() {
    if (!overlayEl) return;
    overlayEl.classList.add('hidden');
    setImageSource(playerImgEl, null);
    setImageSource(opponentImgEl, null);
}
