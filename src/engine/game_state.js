// src/engine/game_state.js

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
      // 核心改動：將預設隊伍從 TEAMS[0] 改為 TEAMS[2] (哲學家隊)
      team: TEAMS[2], 
      deck: [],
      hand: [],
      discard: [],
    },
    cpu: {
      team: TEAMS[1], // CPU 保持為 Dodgers
      deck: [],
      activePitcher: null,
    },
    selected: -1,
    over: false,
    playerTurn: true,
    activeEffects: [],
  };
}