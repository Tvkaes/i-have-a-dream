import { PLAYER_POKEMON_CHOICES } from '../content/npcTeams.js';

const MAX_TEAM_SIZE = 3;
let selectedTeam = [];

function normalizeName(name = '') {
    return String(name).trim().toLowerCase();
}

function clonePokemonData(pokemon) {
    return JSON.parse(JSON.stringify(pokemon));
}

function findPokemonByName(name) {
    const normalized = normalizeName(name);
    return PLAYER_POKEMON_CHOICES.find((pokemon) => normalizeName(pokemon.name) === normalized) || null;
}

export function getPlayerTeam() {
    return selectedTeam.map((pokemon) => clonePokemonData(pokemon));
}

export function getTeamCount() {
    return selectedTeam.length;
}

export function getMaxTeamSize() {
    return MAX_TEAM_SIZE;
}

export function isTeamComplete() {
    return selectedTeam.length === MAX_TEAM_SIZE;
}

export function isPokemonSelected(name) {
    const normalized = normalizeName(name);
    return selectedTeam.some((pokemon) => normalizeName(pokemon.name) === normalized);
}

export function resetPlayerTeam() {
    selectedTeam = [];
}

export function selectPokemon(name) {
    if (!name) {
        return { success: false, reason: 'invalid_name' };
    }
    if (isPokemonSelected(name)) {
        return { success: false, reason: 'already_selected' };
    }
    if (selectedTeam.length >= MAX_TEAM_SIZE) {
        return { success: false, reason: 'team_full' };
    }
    const pokemonData = findPokemonByName(name);
    if (!pokemonData) {
        return { success: false, reason: 'not_found' };
    }
    selectedTeam = [...selectedTeam, clonePokemonData(pokemonData)];
    return { success: true };
}

export function deselectPokemon(name) {
    if (!name) {
        return { success: false, reason: 'invalid_name' };
    }
    if (!isPokemonSelected(name)) {
        return { success: false, reason: 'not_selected' };
    }
    const normalized = normalizeName(name);
    selectedTeam = selectedTeam.filter((pokemon) => normalizeName(pokemon.name) !== normalized);
    return { success: true };
}

export function getPokemonData(name) {
    const pokemon = findPokemonByName(name);
    return pokemon ? clonePokemonData(pokemon) : null;
}

export function getTeamSummary() {
    if (!selectedTeam.length) return 'Equipo vacío';
    const names = selectedTeam.map((pokemon) => pokemon.name).join(', ');
    return `Equipo: ${names} (${selectedTeam.length}/${MAX_TEAM_SIZE})`;
}
