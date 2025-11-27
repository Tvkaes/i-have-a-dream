import { NPC_TEAMS } from '../content/npcTeams.js';
import { getPlayerTeam } from '../state/playerTeam.js';
import { buildMoveEntry } from './moveData.js';
import { setWorldPokemonSprites, clearWorldPokemonSprites } from './battleWorldSprites.js';

const DEFAULT_ACTION_OPTIONS = Object.freeze([
    { id: 'fight', label: 'Luchar' },
    { id: 'bag', label: 'Mochila' },
    { id: 'pokemon', label: 'Pokémon' },
    { id: 'run', label: 'Huir' }
]);

const DEFAULT_OPPONENT_ID = 'kidJonathan';
let battleState = null;

function getHud() {
    return window.__battleHud__ || null;
}

function clone(stats = {}) {
    return JSON.parse(JSON.stringify(stats));
}

function hydratePokemon(source) {
    if (!source) return null;
    const moveset = source.moveset_level_13 || source.moveset || [];
    return {
        name: source.name,
        level: source.level,
        type: Array.isArray(source.type) ? [...source.type] : [source.type].filter(Boolean),
        stats: clone(source.stats || {}),
        maxHp: source.stats?.hp ?? 1,
        currentHp: source.stats?.hp ?? 1,
        status: 'OK',
        sprite: source.sprite ? clone(source.sprite) : null,
        moves: moveset.map((moveName) => buildMoveEntry(moveName))
    };
}

function hydrateTeam(rawTeam = []) {
    return rawTeam.map((pokemon) => hydratePokemon(pokemon)).filter(Boolean);
}

function getActivePlayerPokemon() {
    if (!battleState) return null;
    return battleState.playerTeam[battleState.playerIndex] || null;
}

function getActiveOpponentPokemon() {
    if (!battleState) return null;
    return battleState.opponentTeam[battleState.opponentIndex] || null;
}

function formatPanelData(pokemon) {
    if (!pokemon) return null;
    return {
        name: pokemon.name,
        level: pokemon.level,
        currentHp: pokemon.currentHp,
        maxHp: pokemon.maxHp,
        status: pokemon.status || 'OK'
    };
}

function updateHudPanels() {
    const hud = getHud();
    if (!hud) return;
    hud.setPokemonPanels({
        player: formatPanelData(getActivePlayerPokemon()),
        opponent: formatPanelData(getActiveOpponentPokemon())
    });
}

async function updateBattleSprites() {
    const playerPokemon = getActivePlayerPokemon();
    const opponentPokemon = getActiveOpponentPokemon();
    const playerSpriteUrl = playerPokemon?.sprite?.back ?? playerPokemon?.sprite?.front ?? null;
    const opponentSpriteUrl = opponentPokemon?.sprite?.front ?? opponentPokemon?.sprite?.back ?? null;
    const scene = window.__scene__;
    const playerEntity = window.__player__;
    const opponentEntity = window.__activeBattleOpponent__;

    if (!scene || !playerEntity) {
        clearWorldPokemonSprites();
        return;
    }

    setWorldPokemonSprites({
        scene,
        playerEntity,
        opponentEntity,
        playerSpriteUrl,
        opponentSpriteUrl
    });
}

function resetActionMenu(message) {
    const hud = getHud();
    if (!hud) return;
    hud.setMode?.('action');
    hud.setActionOptions?.([...DEFAULT_ACTION_OPTIONS], 0);
    if (message) {
        hud.setMessage?.(message);
    }
}

function buildMoveOptions(pokemon) {
    if (!pokemon?.moves?.length) return [];
    return pokemon.moves.map((move, index) => ({
        id: move.id || `move-${index}`,
        label: move.name,
        name: move.name,
        type: move.type || '--',
        pp: move.currentPP ?? move.pp ?? '--',
        totalPP: move.pp ?? '--',
        moveIndex: index
    }));
}

function showMoveSelection() {
    const hud = getHud();
    const pokemon = getActivePlayerPokemon();
    if (!hud || !pokemon) return;
    const moveOptions = buildMoveOptions(pokemon);
    if (!moveOptions.length) {
        hud.setMessage?.(`${pokemon.name} no tiene movimientos disponibles.`);
        return;
    }
    const firstMeta = {
        pp: moveOptions[0].pp,
        totalPP: moveOptions[0].totalPP,
        type: moveOptions[0].type
    };
    hud.setMoveOptions?.(moveOptions, 0, firstMeta);
    hud.setMode?.('moves');
    hud.setMessage?.(`¿Qué debería hacer ${pokemon.name}?`);
}

function returnToActionMenu() {
    const pokemon = getActivePlayerPokemon();
    resetActionMenu(pokemon ? `¿Qué debería hacer ${pokemon.name}?` : 'Elige una acción.');
}

function handleActionSelection(selection) {
    switch (selection.id) {
        case 'fight':
            showMoveSelection();
            return true;
        case 'bag':
            getHud()?.setMessage?.('La mochila aún no está disponible.');
            return true;
        case 'pokemon':
            getHud()?.setMessage?.('Cambiar de Pokémon se habilitará pronto.');
            return true;
        case 'run':
            getHud()?.setMessage?.('¡No puedes huir de una batalla contra Milo!');
            return true;
        default:
            return false;
    }
}

function handleMoveSelection(selection) {
    const hud = getHud();
    const pokemon = getActivePlayerPokemon();
    if (!hud || !pokemon || typeof selection.moveIndex !== 'number') return false;
    const move = pokemon.moves?.[selection.moveIndex];
    if (!move) return false;
    if ((move.currentPP ?? move.pp ?? 0) <= 0) {
        hud.setMessage?.(`No quedan PP para ${move.name}.`);
        return true;
    }
    move.currentPP = Math.max(0, (move.currentPP ?? move.pp ?? 0) - 1);
    hud.setMessage?.(`${pokemon.name} usó ${move.name}!`);
    updateHudPanels();
    returnToActionMenu();
    return true;
}

export function handleBattleMenuConfirm() {
    const hud = getHud();
    if (!hud || !battleState) return false;
    const selection = hud.getSelection?.();
    if (!selection) return false;
    const mode = hud.getMode?.() ?? 'action';
    if (mode === 'moves') {
        return handleMoveSelection(selection);
    }
    return handleActionSelection(selection);
}

export function handleBattleMenuCancel() {
    const hud = getHud();
    if (!hud) return false;
    if ((hud.getMode?.() ?? 'action') === 'moves') {
        returnToActionMenu();
        return true;
    }
    return false;
}

export function beginMiloBattle() {
    const hud = getHud();
    const playerTeam = hydrateTeam(getPlayerTeam());
    const npcTeam = hydrateTeam(NPC_TEAMS[DEFAULT_OPPONENT_ID]?.pokemon || []);

    if (!playerTeam.length || !npcTeam.length) {
        hud?.setMessage?.('No se pudo iniciar la batalla: falta equipo.');
        return;
    }

    battleState = {
        playerTeam,
        opponentTeam: npcTeam,
        playerIndex: 0,
        opponentIndex: 0
    };

    updateHudPanels();
    returnToActionMenu();
    updateBattleSprites();
}

export function resetBattleState() {
    battleState = null;
    clearWorldPokemonSprites();
}
