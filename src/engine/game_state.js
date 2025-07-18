// src/engine/game_state.js - 更新遊戲狀態

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
      // 現在預設使用 MyGO!!!!! 隊伍 (MGO)
      team: getTeamById("MGO") || TEAMS[0], // 如果找不到MGO就用第一個隊伍
      deck: [],
      hand: [],
      discard: [],
      pitcher: null, // Will be set during initialization
    },
    
    cpu: {
      // CPU 使用 Yankees 隊伍
      team: getTeamById("NYY") || TEAMS[0], 
      deck: [],
      activePitcher: null,
    },
    
    selected: -1,
    over: false,
    playerTurn: false, // CPU starts first (away team)
    activeEffects: [],
    
    // === 新增的遊戲狀態追蹤 ===
    gameStats: {
      totalTurns: 0,
      playerAtBats: 0,
      cpuAtBats: 0,
      effectsTriggered: 0,
      cardsPlayed: 0
    },
    
    // 鎖定的角色（用於"一輩子"效果）
    lockedCharacters: [],
    
    // 被動效果追蹤
    passiveEffects: {
      handBuffs: [], // 手牌中的被動效果
      fieldAuras: [], // 場上的光環效果
      permanentMods: [] // 永久修改
    }
  };
}

/**
 * 根據ID查找隊伍
 */
function getTeamById(teamId) {
  return TEAMS.find(team => team.id === teamId);
}

/**
 * 初始化 MyGO!!!!! 隊伍的特殊設置
 */
export function initializeMyGOTeam(gameState) {
  const mygoTeam = gameState.player.team;
  
  if (mygoTeam.id === "MGO") {
    console.log("🎸 MyGO!!!!! 隊伍已準備就緒！");
    
    // 設置特殊的初始狀態
    gameState.mygoInitialized = true;
    
    // 記錄隊伍成員以便後續條件檢查
    gameState.bandMembers = {
      mygo: mygoTeam.batters.filter(card => card.band === 'MyGO!!!!!'),
      mujica: mygoTeam.batters.filter(card => card.band === 'Mujica'),
      all: mygoTeam.batters
    };
    
    // 初始化樂器分組
    gameState.instrumentGroups = {
      vocal: mygoTeam.batters.filter(card => card.instrument.includes('Vocal')),
      guitar: mygoTeam.batters.filter(card => card.instrument.includes('Guitar')), 
      bass: mygoTeam.batters.filter(card => card.instrument.includes('Bass')),
      drums: mygoTeam.batters.filter(card => card.instrument.includes('Drums')),
      keyboard: mygoTeam.batters.filter(card => card.instrument.includes('Keyboard'))
    };
    
    console.log(`樂隊組成:`, {
      'MyGO!!!!!': gameState.bandMembers.mygo.length,
      'Ave Mujica': gameState.bandMembers.mujica.length,
      '總計': gameState.bandMembers.all.length
    });
    
    console.log(`樂器分佈:`, {
      '主唱': gameState.instrumentGroups.vocal.length,
      '吉他': gameState.instrumentGroups.guitar.length,
      '貝斯': gameState.instrumentGroups.bass.length,
      '鼓': gameState.instrumentGroups.drums.length,
      '鍵盤': gameState.instrumentGroups.keyboard.length
    });
  }
  
  return gameState;
}

/**
 * 獲取可用的隊伍列表
 */
export function getAvailableTeams() {
  return TEAMS.map(team => ({
    id: team.id,
    name: team.name,
    description: team.description || '',
    theme: team.theme || 'default',
    batterCount: team.batters ? team.batters.length : 0,
    actionCardCount: team.actionCards ? team.actionCards.length : 0
  }));
}

/**
 * 切換玩家隊伍
 */
export function switchPlayerTeam(gameState, teamId) {
  const newTeam = getTeamById(teamId);
  if (!newTeam) {
    console.warn(`找不到隊伍: ${teamId}`);
    return false;
  }
  
  // 重置遊戲狀態
  gameState.player.team = newTeam;
  gameState.player.deck = [];
  gameState.player.hand = [];
  gameState.player.discard = [];
  gameState.player.pitcher = null;
  gameState.activeEffects = [];
  gameState.selected = -1;
  
  // 如果是MyGO隊伍，執行特殊初始化
  if (teamId === "MGO") {
    initializeMyGOTeam(gameState);
  }
  
  console.log(`隊伍已切換為: ${newTeam.name}`);
  return true;
}

/**
 * 重置遊戲狀態（新遊戲）
 */
export function resetGameState(gameState) {
  gameState.currentInning = 1;
  gameState.half = 'top';
  gameState.outs = 0;
  gameState.bases = [null, null, null];
  gameState.score = { away: 0, home: 0 };
  gameState.selected = -1;
  gameState.over = false;
  gameState.playerTurn = false;
  gameState.activeEffects = [];
  gameState.lockedCharacters = [];
  gameState.gameStats = {
    totalTurns: 0,
    playerAtBats: 0,
    cpuAtBats: 0,
    effectsTriggered: 0,
    cardsPlayed: 0
  };
  
  // 重置牌組
  gameState.player.deck = [];
  gameState.player.hand = [];
  gameState.player.discard = [];
  gameState.player.pitcher = null;
  gameState.cpu.deck = [];
  gameState.cpu.activePitcher = null;
  
  console.log("遊戲狀態已重置");
  return gameState;
}

/**
 * 檢查遊戲結束條件
 */
export function checkGameEnd(gameState) {
  if (gameState.currentInning > gameState.cfg.innings) {
    gameState.over = true;
    
    const homeScore = gameState.score.home;
    const awayScore = gameState.score.away;
    
    let winner = '';
    if (homeScore > awayScore) {
      winner = 'home';
    } else if (awayScore > homeScore) {
      winner = 'away';
    } else {
      winner = 'tie';
    }
    
    gameState.gameResult = {
      winner: winner,
      finalScore: {
        home: homeScore,
        away: awayScore
      },
      totalInnings: gameState.currentInning - 1,
      gameStats: { ...gameState.gameStats }
    };
    
    return true;
  }
  
  return false;
}

/**
 * 獲取遊戲狀態摘要
 */
export function getGameStateSummary(gameState) {
  return {
    inning: `${gameState.currentInning}局${gameState.half === 'top' ? '上' : '下'}`,
    score: `${gameState.score.away} - ${gameState.score.home}`,
    outs: gameState.outs,
    basesOccupied: gameState.bases.filter(Boolean).length,
    handSize: gameState.player.hand.length,
    deckSize: gameState.player.deck.length,
    activeEffectsCount: gameState.activeEffects.length,
    isGameOver: gameState.over,
    currentTeam: gameState.playerTurn ? gameState.player.team.name : gameState.cpu.team.name
  };
}

/**
 * 深拷貝遊戲狀態（用於保存/載入）
 */
export function cloneGameState(gameState) {
  return JSON.parse(JSON.stringify(gameState));
}

/**
 * 驗證遊戲狀態完整性
 */
export function validateGameState(gameState) {
  const errors = [];
  
  // 檢查基本屬性
  if (!gameState.cfg) errors.push('缺少遊戲配置');
  if (!gameState.player || !gameState.player.team) errors.push('缺少玩家隊伍');
  if (!gameState.cpu || !gameState.cpu.team) errors.push('缺少CPU隊伍');
  
  // 檢查數值範圍
  if (gameState.currentInning < 1 || gameState.currentInning > 20) {
    errors.push('局數超出合理範圍');
  }
  if (gameState.outs < 0 || gameState.outs > 3) {
    errors.push('出局數不正確');
  }
  if (gameState.bases.length !== 3) {
    errors.push('壘包數量不正確');
  }
  
  // 檢查分數
  if (gameState.score.home < 0 || gameState.score.away < 0) {
    errors.push('分數不能為負數');
  }
  
  // 檢查手牌
  if (gameState.player.hand.length > gameState.cfg.handSize * 2) {
    errors.push('手牌數量過多');
  }
  
  if (errors.length > 0) {
    console.warn('遊戲狀態驗證失敗:', errors);
    return false;
  }
  
  return true;
}

/**
 * 獲取當前活躍的特殊狀態
 */
export function getActiveSpecialStates(gameState) {
  const specialStates = [];
  
  // 檢查鎖定角色
  if (gameState.lockedCharacters && gameState.lockedCharacters.length > 0) {
    specialStates.push({
      type: 'locked',
      count: gameState.lockedCharacters.length,
      description: `${gameState.lockedCharacters.length}名角色被鎖定`
    });
  }
  
  // 檢查樂隊協同
  if (gameState.mygoInitialized) {
    const mygoOnBase = gameState.bases.filter(card => card && card.band === 'MyGO!!!!!').length;
    const mujicaOnBase = gameState.bases.filter(card => card && card.band === 'Mujica').length;
    
    if (mygoOnBase >= 3) {
      specialStates.push({
        type: 'mygo_synergy',
        count: mygoOnBase,
        description: `MyGO!!!!!團隊協同(${mygoOnBase}人)`
      });
    }
    
    if (mujicaOnBase >= 3) {
      specialStates.push({
        type: 'mujica_synergy',
        count: mujicaOnBase,
        description: `Ave Mujica威壓(${mujicaOnBase}人)`
      });
    }
  }
  
  // 檢查樂器協同
  const guitarists = gameState.bases.filter(card => card && card.instrument && card.instrument.includes('Guitar')).length;
  if (guitarists >= 2) {
    specialStates.push({
      type: 'guitar_synergy',
      count: guitarists,
      description: `吉他協奏(${guitarists}人)`
    });
  }
  
  return specialStates;
}