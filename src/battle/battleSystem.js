import { NPC_TEAMS } from '../content/npcTeams.js';
import { getPlayerTeam } from '../state/playerTeam.js';
import { buildMoveEntry } from './moveData.js';
import { setWorldPokemonSprites, clearWorldPokemonSprites } from './battleWorldSprites.js';
import { playMoveAnimation } from './animations/index.js';
import { getTypeMultiplier, isStabMove, normalizeTypes } from './typeChart.js';

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

const AI_CONFIG = Object.freeze({
    lowHpThreshold: 0.35,
    lowHpStatusBonus: 25,
    aggressiveStatusBonus: 20,
    switchScoreMargin: 22,
    superEffectiveStreakThreshold: 2,
    proactiveSwitchEnabled: true
});

const DEFAULT_TURN_DELAY_MS = 900;
const STATUS_MOVE_BONUS = Object.freeze({
    smokescreen: 18,
    sandattack: 15,
    leer: 12,
    growl: 10,
    hypnosis: 25,
    thunderwave: 25,
    curse: 22,
    meanlook: 20
});
let battleState = null;

const STAT_STAGE_MIN = -6;
const STAT_STAGE_MAX = 6;
const FOCUS_ENERGY_TURNS = 4;
const BASE_CRIT_CHANCE = 0.0625;
const FOCUS_ENERGY_CRIT_BONUS = 0.3;
const CRITICAL_DAMAGE_MULTIPLIER = 1.5;

function createBattleRuntime() {
    return {
        attackStage: 0,
        defenseStage: 0,
        accuracyStage: 0,
        evasionStage: 0,
        focusEnergyTurns: 0,
        trapped: false,
        trappedBy: null
    };
}

function getBattleRuntime(pokemon) {
    if (!pokemon) return null;
    if (!pokemon.runtime) {
        pokemon.runtime = createBattleRuntime();
    }
    return pokemon.runtime;
}

function stageToMultiplier(stage = 0) {
    if (stage === 0) return 1;
    if (stage > 0) {
        return (2 + stage) / 2;
    }
    return 2 / (2 - stage);
}

function modifyStatStage(pokemon, statKey, delta) {
    if (!pokemon || !statKey || !delta) return false;
    const runtime = getBattleRuntime(pokemon);
    if (!runtime) return false;
    const stageKey = `${statKey}Stage`;
    const current = runtime[stageKey] ?? 0;
    const next = clamp(current + delta, STAT_STAGE_MIN, STAT_STAGE_MAX);
    if (next === current) return false;
    runtime[stageKey] = next;
    return true;
}

function getModifiedStatValue(pokemon, statKey, baseValue) {
    if (!pokemon) return baseValue;
    const runtime = getBattleRuntime(pokemon);
    const stageKey = `${statKey}Stage`;
    const stage = runtime?.[stageKey] ?? 0;
    const effectiveBase = typeof baseValue === 'number' ? baseValue : 1;
    return Math.max(1, Math.round(effectiveBase * stageToMultiplier(stage)));
}

function getAccuracyMultiplier(pokemon) {
    const runtime = getBattleRuntime(pokemon);
    return stageToMultiplier(runtime?.accuracyStage ?? 0);
}

function getEvasionMultiplier(pokemon) {
    const runtime = getBattleRuntime(pokemon);
    return stageToMultiplier(runtime?.evasionStage ?? 0);
}

function setTrapped(pokemon, trappedBy) {
    const runtime = getBattleRuntime(pokemon);
    if (!runtime || runtime.trapped) return false;
    runtime.trapped = true;
    runtime.trappedBy = trappedBy ?? null;
    return true;
}

function isPokemonTrapped(pokemon) {
    return Boolean(getBattleRuntime(pokemon)?.trapped);
}

function healPokemon(target, amount) {
    if (!target || !amount) return 0;
    const maxHp = target.maxHp ?? target.stats?.hp ?? 1;
    const current = target.currentHp ?? maxHp;
    const next = clamp(current + amount, 0, maxHp);
    const healed = next - current;
    target.currentHp = next;
    return healed;
}

function didCriticalHit(attacker) {
    if (!attacker) return false;
    const runtime = getBattleRuntime(attacker);
    const bonus = runtime?.focusEnergyTurns > 0 ? FOCUS_ENERGY_CRIT_BONUS : 0;
    const chance = Math.min(0.95, BASE_CRIT_CHANCE + bonus);
    const roll = Math.random();
    if (runtime && runtime.focusEnergyTurns > 0) {
        runtime.focusEnergyTurns = Math.max(0, runtime.focusEnergyTurns - 1);
    }
    return roll < chance;
}

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
        height: typeof source.height === 'number' ? source.height : null,
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
    const playerHeight = clamp(playerPokemon?.height ?? 1, 0.3, 3.5);
    const opponentHeight = clamp(opponentPokemon?.height ?? 1, 0.3, 3.5);
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
        opponentSprite: opponentSpriteConfig,
        playerHeightMeters: playerHeight,
        opponentHeightMeters: opponentHeight
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
    recordPlayerMoveSelection(move);
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

function evaluateMoveForOpponent(move, attacker, defender) {
    if (!move || !attacker || !defender) return -Infinity;
    const basePower = Math.max(0, move.power ?? 0);
    const accuracyFactor = clamp((move.accuracy ?? 100) / 100, 0.1, 1);
    const stabBonus = isStabMove(move.type, attacker.type) ? 1.5 : 1;
    const effectiveness = getTypeMultiplier(move.type, defender.type);
    const priorityBonus = (move.priority ?? 0) * 15;
    const statusBonus = basePower === 0 ? (STATUS_MOVE_BONUS[move.id] ?? 5) : 0;
    return basePower * stabBonus * effectiveness * accuracyFactor + priorityBonus + statusBonus;
}

function selectBestMove(attacker, defender) {
    const availableMoves = getAvailableMoves(attacker);
    if (!availableMoves.length) return null;
    const preferStatus = shouldPreferStatusMove(attacker, defender);
    const targetHasFixedStatus = defender?.status && defender.status !== 'OK';
    const defenderAlreadyAfflicted = targetHasFixedStatus || defender?.confused;
    let bestMove = null;
    let bestScore = -Infinity;
    availableMoves.forEach((move) => {
        let score = evaluateMoveForOpponent(move, attacker, defender);
        const hasStatusEffect = Boolean(move?.statusEffect);
        const canApplyStatus = hasStatusEffect && canApplyStatusEffectOnTarget(move, defender);
        if (preferStatus) {
            if (canApplyStatus) {
                score += AI_CONFIG.aggressiveStatusBonus;
            } else if (!hasStatusEffect) {
                score -= 10;
            }
        } else if (hasStatusEffect && !canApplyStatus) {
            score -= 15;
        } else if (!preferStatus && hasStatusEffect && targetHasFixedStatus && move.statusEffect?.type !== 'CONFUSED') {
            score -= 12;
        }

        if (defenderAlreadyAfflicted && move.power > 0) {
            score += 18; // priorizar daño cuando el objetivo ya sufre un estado
        }
        if (defenderAlreadyAfflicted && hasStatusEffect && !canApplyStatus) {
            score -= 8;
        }

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    });
    return bestMove ?? availableMoves[0];
}

function chooseOpponentAction() {
    const opponent = getActiveOpponentPokemon();
    const target = getActivePlayerPokemon();
    if (!opponent || !target) return null;
    const move = selectBestMove(opponent, target);
    return move
        ? {
              side: 'opponent',
              move,
              priority: move.priority ?? 0
          }
        : null;
}

function getSpeed(pokemon) {
    if (!pokemon) return 10;
    const baseSpeed = pokemon.stats?.speed ?? 10;
    return getModifiedStatValue(pokemon, 'speed', baseSpeed);
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

    const opponentSwitched = await maybeSwitchOpponentBeforeTurn();
    const opponentAction = opponentSwitched ? null : chooseOpponentAction();
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
    const scene = window.__scene__;
    hud?.setMessage?.(`${attacker.name} usó ${move.name}!`);
    updateHudPanels();
    await wait();

    const canAct = await handlePreMoveStatus(attacker, actingSide);
    if (!canAct) {
        return { defenderFainted: false };
    }

    const animationPlayed = await playMoveAnimation({
        moveId: move?.id || move?.name,
        attackerSide: actingSide,
        scene
    });
    if (animationPlayed) {
        await wait(300);
    }

    if (!passesAccuracy(move, attacker, defender)) {
        hud?.setMessage?.(`${attacker.name} falló.`);
        await wait();
        return { defenderFainted: false };
    }

    const supportApplied = await applySupportMoveEffect(attacker, defender, move);
    const statusApplied = await applyStatusEffect(attacker, defender, move);
    if ((!move.power || move.power <= 0) && !statusApplied && !supportApplied) {
        hud?.setMessage?.('El movimiento aún no tiene efecto implementado.');
        await wait();
        return { defenderFainted: false };
    }
    if (!move.power || move.power <= 0) {
        return { defenderFainted: false };
    }

    const { damage, effectiveness, critical } = calculateDamage(attacker, defender, move);
    applyDamage(defender, damage);
    updateHudPanels();
    hud?.setMessage?.(`${defender.name} recibió ${damage} de daño.`);
    await wait();

    if (critical) {
        hud?.setMessage?.('¡Un golpe crítico!');
        await wait(400);
    }

    if (actingSide === 'player') {
        recordPlayerEffectiveness(effectiveness, move);
    }

    if (effectiveness > 1.01) {
        hud?.setMessage?.('¡Es muy eficaz!');
        await wait(400);
    } else if (effectiveness < 1) {
        hud?.setMessage?.('No es muy eficaz...');
        await wait(400);
    }

    if (defender.currentHp <= 0) {
        hud?.setMessage?.(`${defender.name} quedó fuera de combate.`);
        await wait();
        const finished = await handleFaint(defender, actingSide === 'player' ? 'opponent' : 'player');
        return finished;
    }

    return { defenderFainted: false };
}

function passesAccuracy(move, attacker, defender) {
    const baseAccuracy = clamp(move?.accuracy ?? 100, 1, 100);
    const accuracyMultiplier = getAccuracyMultiplier(attacker);
    const evasionMultiplier = getEvasionMultiplier(defender);
    const finalAccuracy = clamp(baseAccuracy * (accuracyMultiplier / evasionMultiplier), 1, 100);
    const roll = Math.random() * 100;
    return roll <= finalAccuracy;
}

async function handlePreMoveStatus(pokemon, actingSide) {
    if (!pokemon) return true;
    const hud = getHud();

    if (pokemon.status === 'POISONED') {
        const poisonDamage = Math.max(1, Math.floor((pokemon.maxHp ?? 1) / 8));
        applyDamage(pokemon, poisonDamage);
        updateHudPanels();
        hud?.setMessage?.(`${pokemon.name} sufre daño por el veneno.`);
        await wait(500);
        if (pokemon.currentHp <= 0) {
            const faintSide = actingSide === 'player' ? 'player' : 'opponent';
            await handleFaint(pokemon, faintSide);
            return false;
        }
    }

    if (pokemon.status === 'SLEEP') {
        pokemon.statusTurns = Math.max(0, (pokemon.statusTurns ?? 0) - 1);
        if (pokemon.statusTurns <= 0) {
            pokemon.status = 'OK';
            hud?.setMessage?.(`${pokemon.name} despertó.`);
            await wait(400);
            return true;
        }
        hud?.setMessage?.(`${pokemon.name} sigue dormido.`);
        await wait(600);
        return false;
    }

    if (pokemon.status === 'PARALYZED') {
        if (Math.random() < 0.25) {
            hud?.setMessage?.(`${pokemon.name} está paralizado y no puede moverse.`);
            await wait(600);
            return false;
        }
    }

    if (pokemon.confused) {
        pokemon.confusionTurns = Math.max(0, (pokemon.confusionTurns ?? 0) - 1);
        if (pokemon.confusionTurns <= 0) {
            pokemon.confused = false;
            hud?.setMessage?.(`${pokemon.name} recuperó la claridad.`);
            await wait(400);
        } else if (Math.random() < 1 / 3) {
            hud?.setMessage?.(`${pokemon.name} está confundido y se golpeó a sí mismo.`);
            await wait(400);
            const selfDamage = calculateConfusionDamage(pokemon);
            applyDamage(pokemon, selfDamage);
            updateHudPanels();
            await wait(400);
            if (pokemon.currentHp <= 0) {
                const faintSide = actingSide === 'player' ? 'player' : 'opponent';
                await handleFaint(pokemon, faintSide);
            }
            return false;
        }
    }

    return true;
}

function calculateDamage(attacker, defender, move) {
    const attackerLevel = attacker.level ?? 1;
    const baseAttack = attacker.stats?.attack ?? attacker.stats?.special_attack ?? 10;
    const baseDefense = defender.stats?.defense ?? defender.stats?.special_defense ?? 10;
    const attackStat = getModifiedStatValue(attacker, 'attack', baseAttack);
    const defenseStat = getModifiedStatValue(defender, 'defense', baseDefense);
    const levelFactor = (2 * attackerLevel) / 5 + 2;
    const base = ((levelFactor * move.power * (attackStat / Math.max(1, defenseStat))) / 50) + 2;
    const randomFactor = 0.85 + Math.random() * 0.15;
    const effectiveness = getTypeMultiplier(move.type, defender.type);
    const stabBonus = isStabMove(move.type, attacker.type) ? 1.5 : 1;
    const critical = didCriticalHit(attacker);
    const criticalMultiplier = critical ? CRITICAL_DAMAGE_MULTIPLIER : 1;
    const damage = Math.max(
        1,
        Math.floor(base * randomFactor * effectiveness * stabBonus * criticalMultiplier)
    );
    return { damage, effectiveness, critical };
}

function applyDamage(target, amount) {
    target.currentHp = clamp((target.currentHp ?? target.maxHp ?? 1) - amount, 0, target.maxHp ?? 1);
}

function calculateConfusionDamage(pokemon) {
    const attackStat = pokemon.stats?.attack ?? 10;
    return Math.max(1, Math.floor(attackStat / 2));
}

async function applyStatusEffect(attacker, defender, move) {
    const effect = move?.statusEffect;
    if (!effect) return false;
    const target = effect.self ? attacker : defender;
    if (!target) return false;
    if (effect.type !== 'CONFUSED' && target.status && target.status !== 'OK') {
        return false;
    }
    if (effect.type === 'CONFUSED' && target.confused) {
        return false;
    }

    if (Math.random() > (effect.chance ?? 1)) {
        return false;
    }

    const hud = getHud();
    switch (effect.type) {
        case 'PARALYZED':
            target.status = 'PARALYZED';
            target.statusTurns = null;
            hud?.setMessage?.(`${target.name} quedó paralizado.`);
            break;
        case 'SLEEP':
            target.status = 'SLEEP';
            target.statusTurns = randomInt(effect.minTurns ?? 1, effect.maxTurns ?? 3);
            hud?.setMessage?.(`${target.name} se quedó dormido.`);
            break;
        case 'CONFUSED':
            target.confused = true;
            target.confusionTurns = randomInt(effect.minTurns ?? 2, effect.maxTurns ?? 4);
            hud?.setMessage?.(`${target.name} se confundió.`);
            break;
        case 'POISONED':
            target.status = 'POISONED';
            target.statusTurns = null;
            hud?.setMessage?.(`${target.name} fue envenenado.`);
            break;
        default:
            return false;
    }
    await wait(400);
    return true;
}

async function applySupportMoveEffect(attacker, defender, move) {
    if (!move?.id) return false;
    const hud = getHud();
    switch (move.id) {
        case 'growl':
            if (modifyStatStage(defender, 'attack', -1)) {
                hud?.setMessage?.(`${defender.name} vio reducido su Ataque.`);
                await wait(400);
                return true;
            }
            return false;
        case 'leer':
            if (modifyStatStage(defender, 'defense', -1)) {
                hud?.setMessage?.(`${defender.name} bajó su Defensa.`);
                await wait(400);
                return true;
            }
            return false;
        case 'sand attack':
            if (modifyStatStage(defender, 'accuracy', -1)) {
                hud?.setMessage?.(`${defender.name} perdió precisión.`);
                await wait(400);
                return true;
            }
            return false;
        case 'double team':
            if (modifyStatStage(attacker, 'evasion', 1)) {
                hud?.setMessage?.(`${attacker.name} aumentó su Evasión.`);
                await wait(400);
                return true;
            }
            return false;
        case 'withdraw':
            if (modifyStatStage(attacker, 'defense', 1)) {
                hud?.setMessage?.(`${attacker.name} reforzó su caparazón.`);
                await wait(400);
                return true;
            }
            return false;
        case 'focus energy': {
            const runtime = getBattleRuntime(attacker);
            if (!runtime) return false;
            runtime.focusEnergyTurns = Math.max(runtime.focusEnergyTurns, FOCUS_ENERGY_TURNS);
            hud?.setMessage?.(`${attacker.name} se concentró para asestar golpes críticos.`);
            await wait(400);
            return true;
        }
        case 'synthesis': {
            const healAmount = Math.round((attacker.maxHp ?? attacker.stats?.hp ?? 1) * 0.5);
            const healed = healPokemon(attacker, healAmount);
            if (healed > 0) {
                updateHudPanels();
                hud?.setMessage?.(`${attacker.name} recuperó ${healed} PS.`);
            } else {
                hud?.setMessage?.('Pero su salud ya estaba al máximo.');
            }
            await wait(400);
            return true;
        }
        case 'mean look':
            if (setTrapped(defender, attacker.name)) {
                hud?.setMessage?.(`${defender.name} no podrá escapar.`);
                await wait(400);
                return true;
            }
            return false;
        default:
            return false;
    }
}

function randomInt(min, max) {
    const low = Math.ceil(Math.min(min, max));
    const high = Math.floor(Math.max(min, max));
    return Math.floor(Math.random() * (high - low + 1)) + low;
}

function canApplyStatusEffectOnTarget(move, defender) {
    const effect = move?.statusEffect;
    if (!effect || !defender) return false;
    if (effect.type === 'CONFUSED') {
        return !defender.confused;
    }
    return !defender.status || defender.status === 'OK';
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

function computePokemonMatchupScore(attacker, defender) {
    if (!attacker || !defender) return -Infinity;
    const availableMoves = getAvailableMoves(attacker);
    if (!availableMoves.length) return -Infinity;
    return Math.max(
        ...availableMoves.map((move) => evaluateMoveForOpponent(move, attacker, defender))
    );
}

function computeAverageMatchupScore(attacker, defenders = []) {
    if (!defenders.length) return 0;
    const livingDefenders = defenders.filter((d) => d?.currentHp > 0);
    if (!livingDefenders.length) return 0;
    const total = livingDefenders.reduce((sum, defender) => sum + computePokemonMatchupScore(attacker, defender), 0);
    return total / livingDefenders.length;
}

function reorderOpponentTeam(playerTeam, opponentTeam) {
    if (!Array.isArray(opponentTeam) || !opponentTeam.length) return opponentTeam;
    if (!Array.isArray(playerTeam) || !playerTeam.length) return opponentTeam;
    return [...opponentTeam].sort((a, b) => {
        const bScore = computeAverageMatchupScore(b, playerTeam);
        const aScore = computeAverageMatchupScore(a, playerTeam);
        return bScore - aScore;
    });
}

function findBestOpponentIndex(targetPlayerPokemon, { excludeActive = false } = {}) {
    if (!battleState?.opponentTeam?.length) return { index: -1, score: -Infinity };
    let bestIndex = -1;
    let bestScore = -Infinity;
    battleState.opponentTeam.forEach((pokemon, index) => {
        if (!pokemon || pokemon.currentHp <= 0) return;
        if (excludeActive && index === battleState.opponentIndex) return;
        const score = computePokemonMatchupScore(pokemon, targetPlayerPokemon || getActivePlayerPokemon());
        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    });
    return { index: bestIndex, score: bestScore };
}

function selectBestOpponentReplacement(targetPlayerPokemon = null) {
    const { index } = findBestOpponentIndex(targetPlayerPokemon);
    if (index >= 0) {
        battleState.opponentIndex = index;
        return true;
    }
    return false;
}

function advanceToNextPokemon(side) {
    if (!battleState) return false;
    if (side === 'opponent') {
        return selectBestOpponentReplacement(getActivePlayerPokemon());
    }

    const teamKey = 'playerTeam';
    const indexKey = 'playerIndex';
    const team = battleState[teamKey];
    if (!team) return false;

    for (let i = battleState[indexKey]; i < team.length; i += 1) {
        if (team[i]?.currentHp > 0) {
            battleState[indexKey] = i;
            return true;
        }
    }
    return false;
}

function initAIMemory() {
    return {
        playerMoveCounts: Object.create(null),
        playerSuperEffectiveStreak: 0
    };
}

function shouldPreferStatusMove(attacker, defender) {
    if (!battleState?.aiMemory || !attacker || !defender) return false;
    const memory = battleState.aiMemory;
    const streakTrigger = (memory.playerSuperEffectiveStreak ?? 0) >= AI_CONFIG.superEffectiveStreakThreshold;
    const lowHp = (attacker.currentHp ?? 0) / Math.max(1, attacker.maxHp ?? 1) <= AI_CONFIG.lowHpThreshold;
    const defenderStatusFree = !defender.status || defender.status === 'OK';
    const defenderNotConfused = !defender.confused;
    return (streakTrigger || lowHp) && (defenderStatusFree || defenderNotConfused);
}

function recordPlayerMoveSelection(move) {
    if (!battleState?.aiMemory || !move) return;
    const id = move.id || move.name || 'unknown';
    battleState.aiMemory.playerMoveCounts[id] = (battleState.aiMemory.playerMoveCounts[id] ?? 0) + 1;
}

function recordPlayerEffectiveness(effectiveness, move) {
    if (!battleState?.aiMemory) return;
    if (effectiveness >= 2) {
        battleState.aiMemory.playerSuperEffectiveStreak += 1;
    } else if (effectiveness < 1) {
        battleState.aiMemory.playerSuperEffectiveStreak = Math.max(
            0,
            (battleState.aiMemory.playerSuperEffectiveStreak ?? 0) - 1
        );
    } else {
        battleState.aiMemory.playerSuperEffectiveStreak = 0;
    }
    if (move?.id) {
        battleState.aiMemory.playerMoveCounts[move.id] = (battleState.aiMemory.playerMoveCounts[move.id] ?? 0) + 1;
    }
}

async function maybeSwitchOpponentBeforeTurn() {
    if (!AI_CONFIG.proactiveSwitchEnabled || !battleState) return false;
    const opponent = getActiveOpponentPokemon();
    const player = getActivePlayerPokemon();
    if (!opponent || !player) return false;

    const currentScore = computePokemonMatchupScore(opponent, player);
    const { index: bestIndex, score: bestScore } = findBestOpponentIndex(player, { excludeActive: true });
    const memory = battleState.aiMemory ?? initAIMemory();
    battleState.aiMemory ??= memory;

    const lowHp = (opponent.currentHp ?? 0) / Math.max(1, opponent.maxHp ?? 1) <= AI_CONFIG.lowHpThreshold;
    const streakTrigger = (memory.playerSuperEffectiveStreak ?? 0) >= AI_CONFIG.superEffectiveStreakThreshold;
    const matchupTrigger = bestIndex >= 0 && bestScore - (currentScore ?? 0) >= AI_CONFIG.switchScoreMargin;

    if (!matchupTrigger && !lowHp && !streakTrigger) {
        return false;
    }
    if (bestIndex < 0) {
        return false;
    }

    battleState.opponentIndex = bestIndex;
    memory.playerSuperEffectiveStreak = 0;
    const hud = getHud();
    hud?.setMessage?.('Milo cambia de Pokémon para tomar ventaja.');
    await wait(600);
    updateHudPanels();
    await updateBattleSprites();
    return true;
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

    const orderedOpponentTeam = reorderOpponentTeam(playerTeam, npcTeam);

    battleState = {
        playerTeam,
        opponentTeam: orderedOpponentTeam,
        playerIndex: 0,
        opponentIndex: 0,
        phase: BATTLE_PHASES.PLAYER_CHOICE,
        aiPlan: {
            playerTeamSummary: playerTeam.map((pokemon) => ({
                name: pokemon.name,
                types: normalizeTypes(pokemon.type)
            }))
        },
        aiMemory: initAIMemory()
    };

    updateHudPanels();
    returnToActionMenu();
    updateBattleSprites();
}

export function resetBattleState() {
    battleState = null;
    clearWorldPokemonSprites();
}
