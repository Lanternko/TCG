// src/engine/game_state.js

import { CONFIG } from '../data/config.js';
import { TEAMS } from '../data/teams.js';

export function createGameState() {
  return {
    cfg: CONFIG,
    currentInning: 1,
    half: 'top', // CPU (away) bats first
    outs: 0,
    bases: [null, null, null],
    score: { away: 0, home: 0 },
    player: {
      // Player is now HOME team (Philosophers)
      team: TEAMS[2], 
      deck: [],
      hand: [],
      discard: [],
      pitcher: null, // Will be set during initialization
    },
    cpu: {
      // CPU is AWAY team (Yankees) 
      team: TEAMS[0], 
      deck: [],
      activePitcher: null,
    },
    selected: -1,
    over: false,
    playerTurn: false, // CPU starts first (away team)
    activeEffects: [],
  };
}