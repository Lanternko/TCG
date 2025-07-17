// /src/engine/gameState.js
import { CONFIG } from '../data/config.js';
import { TEAMS } from '../data/teams.js';

export function createGameState() {
  return {
    cfg: CONFIG,
    currentInning: 1,
    half: 'top',
    outs: 0,
    bases: [null, null, null],
    score: { away: 0, home: 0 },
    player: {
      team: TEAMS[0], // Default to Yankees; can be changed to Philosophers
      deck: [],
      hand: [],
      discard: [],
    },
    cpu: {
      team: TEAMS[1],
      deck: [],
      activePitcher: null,
    },
    selected: -1,
    over: false,
    playerTurn: true,
    activeEffects: [], // New: Track active effects (e.g., stat boosts, aura effects)
  };
}