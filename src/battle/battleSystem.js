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
const BATTLE_PHASES = Object.freeze({
    IDLE: 'idle',
    PLAYER_CHOICE: 'player_choice',
    RESOLVING: 'resolving',
    FINISHED: 'finished'
});

const DEFAULT_TURN_DELAY_MS = 900;
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

function wait(ms = DEFAULT_TURN_DELAY_MS) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function normalizeSpriteEntry(entry, fallbackFrames = 1) {
    if (!entry) return null;
    if (typeof entry === 'string') {
        return {
            image: entry,
            frames: Math.max(1, fallbackFrames || 1)
        };
    }

    const image = entry.image ?? entry.src ?? null;
    if (!image) return null;

    return {
        image,
        frames: Math.max(1, entry.frames ?? fallbackFrames ?? 1),
        width: entry.width ?? null,
        height: entry.height ?? null
    };
}

function resolveSpriteConfig(pokemon, preferredSide) {
    if (!pokemon?.sprite) return null;
    const sprite = pokemon.sprite;
    const preferredKey = preferredSide === 'front' ? 'front' : 'back';
    const fallbackKey = preferredKey === 'front' ? 'back' : 'front';
    const preferredFramesKey = preferredKey === 'front' ? 'framesFront' : 'framesBack';
    const fallbackFramesKey = fallbackKey === 'front' ? 'framesFront' : 'framesBack';

    const preferred = normalizeSpriteEntry(sprite[preferredKey], sprite[preferredFramesKey]);
    if (preferred) return preferred;
    const fallback = normalizeSpriteEntry(sprite[fallbackKey], sprite[fallbackFramesKey]);
    if (fallback) return fallback;

    // Compatibilidad con estructura antigua (sprite.front como string, framesFront en sprite)
    if (typeof sprite === 'string') {
        return {
            image: sprite,
            frames: Math.max(1, sprite.frames ?? 1)
        };
    }

    return null;
}

async function updateBattleSprites() {
    const playerPokemon = getActivePlayerPokemon();
    const opponentPokemon = getActiveOpponentPokemon();
    const playerSpriteConfig = resolveSpriteConfig(playerPokemon, 'back');
    const opponentSpriteConfig = resolveSpriteConfig(opponentPokemon, 'front');
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
        playerSprite: playerSpriteConfig,
        opponentSprite: opponentSpriteConfig
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
    if (!battleState || battleState.phase !== BATTLE_PHASES.PLAYER_CHOICE) {
        return false;
    }
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
    if (!battleState || battleState.phase !== BATTLE_PHASES.PLAYER_CHOICE) {
        return false;
    }
    if (!hud || !pokemon || typeof selection.moveIndex !== 'number') return false;
    const move = pokemon.moves?.[selection.moveIndex];
    if (!move) return false;
    if ((move.currentPP ?? move.pp ?? 0) <= 0) {
        hud.setMessage?.(`No quedan PP para ${move.name}.`);
        return true;
    }
    processPlayerMove(selection.moveIndex);
    return true;
}

function processPlayerMove(moveIndex) {
    if (!battleState) return;
    battleState.phase = BATTLE_PHASES.RESOLVING;
    resolveTurn(moveIndex).catch((error) => {
        console.error('[battle] Error resolviendo turno', error);
        battleState.phase = BATTLE_PHASES.PLAYER_CHOICE;
        returnToActionMenu();
    });
}

function getAvailableMoves(pokemon) {
    if (!pokemon?.moves) return [];
    return pokemon.moves.filter((move) => (move.currentPP ?? move.pp ?? 0) > 0);
}

function chooseOpponentAction() {
    const opponent = getActiveOpponentPokemon();
    if (!opponent) return null;
    const availableMoves = getAvailableMoves(opponent);
    const move = availableMoves.length
        ? availableMoves[Math.floor(Math.random() * availableMoves.length)]
        : opponent.moves?.[0] ?? null;
    return move
        ? {
              side: 'opponent',
              move,
              priority: move.priority ?? 0
          }
        : null;
}

function getSpeed(pokemon) {
    return pokemon?.stats?.speed ?? pokemon?.stats?.speed ?? 10;
}

async function resolveTurn(playerMoveIndex) {
    const hud = getHud();
    const playerPokemon = getActivePlayerPokemon();
    const opponentPokemon = getActiveOpponentPokemon();
    if (!playerPokemon || !opponentPokemon) {
        return;
    }

    const playerMove = playerPokemon.moves?.[playerMoveIndex];
    if (!playerMove) {
        battleState.phase = BATTLE_PHASES.PLAYER_CHOICE;
        returnToActionMenu();
        return;
    }

    playerMove.currentPP = clamp((playerMove.currentPP ?? playerMove.pp ?? 1) - 1, 0, playerMove.pp ?? 1);
    hud?.setMoveOptions?.(buildMoveOptions(playerPokemon), playerMoveIndex);

    const opponentAction = chooseOpponentAction();
    const playerAction = {
        side: 'player',
        move: playerMove,
        priority: playerMove.priority ?? 0
    };

    const actionQueue = [playerAction, opponentAction]
        .filter(Boolean)
        .sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            const aSpeed = a.side === 'player' ? getSpeed(playerPokemon) : getSpeed(opponentPokemon);
            const bSpeed = b.side === 'player' ? getSpeed(playerPokemon) : getSpeed(opponentPokemon);
            return bSpeed - aSpeed;
        });

    for (const action of actionQueue) {
        const attacker = action.side === 'player' ? getActivePlayerPokemon() : getActiveOpponentPokemon();
        const defender = action.side === 'player' ? getActiveOpponentPokemon() : getActivePlayerPokemon();
        if (!attacker || !defender || attacker.currentHp <= 0) {
            continue;
        }

        if (action.side === 'opponent') {
            action.move.currentPP = clamp((action.move.currentPP ?? action.move.pp ?? 1) - 1, 0, action.move.pp ?? 1);
        }

        const result = await executeMove(attacker, defender, action.move, action.side);
        if (result?.battleEnded) {
            return;
        }
        if (result?.defenderFainted) {
            break;
        }
    }

    if (battleState?.phase !== BATTLE_PHASES.FINISHED) {
        battleState.phase = BATTLE_PHASES.PLAYER_CHOICE;
        returnToActionMenu();
    }
}

async function executeMove(attacker, defender, move, actingSide) {
    const hud = getHud();
    hud?.setMessage?.(`${attacker.name} usó ${move.name}!`);
    updateHudPanels();
    await wait();

    if (!passesAccuracy(move.accuracy)) {
        hud?.setMessage?.(`${attacker.name} falló.`);
        await wait();
        return { defenderFainted: false };
    }

    if (!move.power || move.power <= 0) {
        hud?.setMessage?.('El movimiento aún no tiene efecto implementado.');
        await wait();
        return { defenderFainted: false };
    }

    const damage = calculateDamage(attacker, defender, move);
    applyDamage(defender, damage);
    updateHudPanels();
    hud?.setMessage?.(`${defender.name} recibió ${damage} de daño.`);
    await wait();

    if (defender.currentHp <= 0) {
        hud?.setMessage?.(`${defender.name} quedó fuera de combate.`);
        await wait();
        const finished = await handleFaint(defender, actingSide === 'player' ? 'opponent' : 'player');
        return finished;
    }

    return { defenderFainted: false };
}

function passesAccuracy(accuracy = 100) {
    const roll = Math.random() * 100;
    return roll <= clamp(accuracy, 1, 100);
}

function calculateDamage(attacker, defender, move) {
    const attackerLevel = attacker.level ?? 1;
    const attackStat = attacker.stats?.attack ?? attacker.stats?.special_attack ?? 10;
    const defenseStat = defender.stats?.defense ?? defender.stats?.special_defense ?? 10;
    const levelFactor = (2 * attackerLevel) / 5 + 2;
    const base = ((levelFactor * move.power * (attackStat / Math.max(1, defenseStat))) / 50) + 2;
    const randomFactor = 0.85 + Math.random() * 0.15;
    return Math.max(1, Math.floor(base * randomFactor));
}

function applyDamage(target, amount) {
    target.currentHp = clamp((target.currentHp ?? target.maxHp ?? 1) - amount, 0, target.maxHp ?? 1);
}

async function handleFaint(faintedPokemon, faintedSide) {
    const hasReplacement = advanceToNextPokemon(faintedSide);
    if (!hasReplacement) {
        await finishBattle(faintedSide === 'opponent' ? 'win' : 'lose');
        return { battleEnded: true };
    }

    await wait(400);
    updateHudPanels();
    await updateBattleSprites();
    const hud = getHud();
    const nextPokemon = faintedSide === 'opponent' ? getActiveOpponentPokemon() : getActivePlayerPokemon();
    hud?.setMessage?.(`${nextPokemon?.name ?? '—'} entra en batalla.`);
    await wait();
    return { defenderFainted: true };
}

function advanceToNextPokemon(side) {
    const teamKey = side === 'player' ? 'playerTeam' : 'opponentTeam';
    const indexKey = side === 'player' ? 'playerIndex' : 'opponentIndex';
    const team = battleState?.[teamKey];
    if (!battleState || !team) return false;

    for (let i = battleState[indexKey]; i < team.length; i += 1) {
        if (team[i]?.currentHp > 0) {
            battleState[indexKey] = i;
            return true;
        }
    }
    return false;
}

async function finishBattle(result) {
    const hud = getHud();
    battleState.phase = BATTLE_PHASES.FINISHED;
    const message = result === 'win' ? '¡Has ganado la batalla!' : 'Te quedaste sin Pokémon...';
    hud?.setMessage?.(message);
    await wait(1500);
    if (typeof window.__triggerBattleCleanup__ === 'function') {
        window.__triggerBattleCleanup__(result);
    } else {
        window.dispatchEvent(new CustomEvent('battleFinished', { detail: { result } }));
    }
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
        opponentIndex: 0,
        phase: BATTLE_PHASES.PLAYER_CHOICE
    };

    updateHudPanels();
    returnToActionMenu();
    updateBattleSprites();
}

export function resetBattleState() {
    battleState = null;
    clearWorldPokemonSprites();
}
