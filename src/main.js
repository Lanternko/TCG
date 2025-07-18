// src/main.js - 更新的主遊戲邏輯
import { createGameState, initializeMyGOTeam, checkGameEnd, resetGameState } from './engine/game_state.js';
import { render } from './ui/ui.js';
import { 
  simulateAtBat, 
  processCardEffects, 
  applyActionCard, 
  initializeEffectProcessor,
  updateAuraEffects,
  cleanupExpiredEffects
} from './engine/sim.js';
import { CONFIG } from './data/config.js';

// =============================================================================
// 1. Initialize game state and event handlers
// =============================================================================

const state = createGameState();
let effectProcessor = null;

const handlers = {
  /**
   * Handle card selection events
   * @param {number} idx - Index of clicked card
   */
  select: (idx) => {
    if (state.playerTurn) {
      // If clicking on already selected card, deselect; otherwise, select new card
      state.selected = (state.selected === idx) ? -1 : idx;
      render(state, handlers); // Immediately redraw after each selection to update 'selected' styling
    }
  },
  
  /**
   * Handle main button click events
   */
  button: () => {
    const gameStarted = !!state.cpu.activePitcher;

    if (!gameStarted) {
      // If game hasn't started, initialize decks
      initDecks();
    } else if (state.playerTurn && state.selected !== -1) {
      // If it's player turn and a card is selected, execute player turn
      runPlayerTurn();
    }
    
    // Redraw entire screen after each main button click based on latest state
    render(state, handlers);
  },
  
  /**
   * 重新開始遊戲
   */
  restart: () => {
    resetGameState(state);
    initDecks();
    render(state, handlers);
  },
  
  /**
   * 切換隊伍（開發用）
   */
  switchTeam: (teamId) => {
    if (!state.over) {
      console.log(`切換隊伍到: ${teamId}`);
      // 這裡可以實作隊伍切換邏輯
    }
  }
};

// =============================================================================
// 2. Core game flow functions
// =============================================================================

/**
 * Initialize all decks, hands, and pitchers
 */
function initDecks() {
  console.log("🎯 初始化遊戲...");
  
  // Initialize effect processor
  effectProcessor = initializeEffectProcessor(state);
  
  // Initialize player (HOME team) - 現在預設是MyGO!!!!!
  const playerTeam = state.player.team;
  console.log(`🏠 主隊: ${playerTeam.name} (${playerTeam.id})`);
  
  // 準備玩家牌組（打者 + 戰術卡）
  state.player.deck = [...playerTeam.batters, ...playerTeam.actionCards].map(prepareCard);
  shuffle(state.player.deck);
  state.player.hand = [];
  state.player.pitcher = prepareCard(playerTeam.pitchers[0]); // Set player pitcher
  
  // 如果是MyGO隊伍，執行特殊初始化
  if (playerTeam.id === "MGO") {
    initializeMyGOTeam(state);
  }
  
  draw(state.player, state.cfg.handSize);
  console.log(`🎸 主隊牌組: ${state.player.deck.length}張牌, 手牌: ${state.player.hand.length}張`);

  // Initialize CPU (AWAY team)
  const cpuTeam = state.cpu.team;
  console.log(`🏃 客隊: ${cpuTeam.name} (${cpuTeam.id})`);
  
  state.cpu.deck = [...cpuTeam.batters].map(prepareCard);
  state.cpu.activePitcher = prepareCard(cpuTeam.pitchers[0]);
  console.log(`⚾ 客隊牌組: ${state.cpu.deck.length}張牌`);
  
  // 初始化光環效果
  updateAuraEffects(state);
  
  document.getElementById('outcome-text').textContent = "🎵 MyGO!!!!! vs Yankees - 客隊先攻！";
  
  // Start CPU turn (away team bats first)
  setTimeout(() => {
    runCpuTurn();
  }, 1000);
}

/**
 * Execute a complete player turn
 */
function runPlayerTurn() {
  const card = state.player.hand[state.selected];
  if (!card) return;
  
  console.log(`🎯 玩家打出: ${card.name} (${card.type})`);
  state.gameStats.cardsPlayed++;
  
  let outcomeDescription = "";
  
  if (card.type === 'batter') {
    // 處理打者卡
    state.gameStats.playerAtBats++;
    
    // 觸發登場效果
    const playResult = processCardEffects(card, 'play', state);
    if (playResult.success) {
      console.log(`✨ 登場效果: ${playResult.description}`);
      state.gameStats.effectsTriggered++;
    }
    
    // 進行打擊模擬
    const result = simulateAtBat(card, state.cpu.activePitcher, state);
    processAtBatOutcome(result, card);
    outcomeDescription = result.description;
    
  } else if (card.type === 'action') {
    // 處理戰術卡
    console.log(`🎭 使用戰術卡: ${card.name}`);
    outcomeDescription = applyActionCard(card, state);
    state.gameStats.effectsTriggered++;
  }
  
  // 移除卡牌並抽新牌
  state.player.hand.splice(state.selected, 1);
  state.player.discard.push(card);
  draw(state.player, 1);
  state.selected = -1;
  
  // 清理回合結束的效果
  cleanupExpiredEffects(state, 'atBat');
  
  // 更新光環效果
  updateAuraEffects(state);
  
  // 顯示結果
  document.getElementById('outcome-text').textContent = outcomeDescription;
  render(state, handlers);
  
  // 檢查三出局
  if (state.outs >= 3) {
    setTimeout(changeHalfInning, 1500);
  }
}

/**
 * Process at-bat outcome and update game state
 */
function processAtBatOutcome(result, batterCard) {
  console.log(`📊 打擊結果: ${result.type} - ${result.description}`);
  
  const currentScorer = state.half === 'top' ? 'away' : 'home';

  if (result.type === 'K' || result.type === 'OUT') {
    state.outs++;
    
    // 觸發退場效果
    const deathResult = processCardEffects(batterCard, 'death', state);
    if (deathResult.success) {
      console.log(`💀 退場效果: ${deathResult.description}`);
      state.gameStats.effectsTriggered++;
    }
    
  } else {
    // 成功上壘，計算得分
    let points = 0;
    switch (result.type) {
      case '1B': points = CONFIG.scoring.single; break;
      case '2B': points = CONFIG.scoring.double; break;
      case '3B': points = CONFIG.scoring.triple; break;
      case 'HR': points = CONFIG.scoring.homeRun; break;
      case 'BB': points = CONFIG.scoring.single; break;
    }
    state.score[currentScorer] += points;
    
    // 觸發光環和協同效果
    processCardEffects(batterCard, 'aura', state);
    processCardEffects(batterCard, 'synergy', state);
    
    // 處理跑者推進
    advanceRunners(result, batterCard);
    
    console.log(`🏃 跑者推進: ${result.adv}個壘包, 得分: ${points}`);
  }
  
  // 檢查特殊狀態
  checkSpecialStates();
}

/**
 * 處理跑者推進邏輯
 */
function advanceRunners(result, batterCard) {
  if (!result.adv || result.adv <= 0) return;
  
  // 收集現有跑者
  const existingRunners = [];
  for (let i = 2; i >= 0; i--) {
    if (state.bases[i] && !state.bases[i].locked) {
      existingRunners.push({ runner: state.bases[i], fromBase: i });
    }
  }
  
  // 清空壘包（保留鎖定的角色）
  for (let i = 0; i < 3; i++) {
    if (state.bases[i] && !state.bases[i].locked) {
      state.bases[i] = null;
    }
  }
  
  // 推進現有跑者
  existingRunners.forEach(({ runner, fromBase }) => {
    const newBaseIndex = fromBase + result.adv;
    if (newBaseIndex < 3) {
      // 找到空的壘包
      for (let i = newBaseIndex; i < 3; i++) {
        if (!state.bases[i]) {
          state.bases[i] = runner;
          break;
        }
      }
    }
    // 如果newBaseIndex >= 3，跑者得分（已在上面計算）
  });
  
  // 放置打者
  if (result.adv > 0 && result.adv < 4) {
    const batterBaseIndex = result.adv - 1;
    if (!state.bases[batterBaseIndex]) {
      state.bases[batterBaseIndex] = batterCard;
    } else {
      // 如果該壘包被佔用，嘗試放到下一個壘包
      for (let i = batterBaseIndex + 1; i < 3; i++) {
        if (!state.bases[i]) {
          state.bases[i] = batterCard;
          break;
        }
      }
    }
  }
}

/**
 * 檢查特殊狀態和條件
 */
function checkSpecialStates() {
  if (state.mygoInitialized) {
    // 檢查MyGO!!!!!團隊協同
    const mygoOnBase = state.bases.filter(card => card && card.band === 'MyGO!!!!!').length;
    if (mygoOnBase >= 3) {
      console.log(`🎵 MyGO!!!!!團隊協同啟動！(${mygoOnBase}人在壘)`);
    }
    
    // 檢查Ave Mujica威壓
    const mujicaOnBase = state.bases.filter(card => card && card.band === 'Mujica').length;
    if (mujicaOnBase >= 3) {
      console.log(`🖤 Ave Mujica威壓啟動！(${mujicaOnBase}人在壘)`);
    }
    
    // 檢查樂器協同
    const guitarists = state.bases.filter(card => card && card.instrument && card.instrument.includes('Guitar')).length;
    if (guitarists >= 2) {
      console.log(`🎸 吉他協奏啟動！(${guitarists}人)`);
    }
  }
}

/**
 * Change sides and handle "soft reset" of bases
 */
function changeHalfInning() {
  console.log(`🔄 半局結束: ${state.currentInning}局${state.half}`);
  
  // 軟重置：移除最前面的跑者（但保留鎖定的角色）
  let removedRunner = false;
  for (let i = 2; i >= 0; i--) {
    if (state.bases[i] && !state.bases[i].locked) {
      console.log(`🏃 ${state.bases[i].name} 因半局結束而退場`);
      state.bases[i] = null;
      removedRunner = true;
      break;
    }
  }
  
  // 重置出局數
  state.outs = 0;
  state.gameStats.totalTurns++;
  
  // 清理局數相關效果
  cleanupExpiredEffects(state, 'inning');
  
  if (state.half === 'top') {
    state.half = 'bottom';
    state.playerTurn = true;
    document.getElementById('outcome-text').textContent = "🎵 輪到MyGO!!!!!攻擊！";
  } else {
    state.half = 'top';
    state.currentInning++;
    state.playerTurn = false;
    document.getElementById('outcome-text').textContent = "⚾ 客隊攻擊中...";
    
    // 檢查遊戲結束
    if (checkGameEnd(state)) {
      handleGameEnd();
      return;
    }
    
    setTimeout(() => {
      runCpuTurn();
    }, 1000);
  }
  
  // 更新光環效果
  updateAuraEffects(state);
  render(state, handlers);
}

/**
 * 處理遊戲結束
 */
function handleGameEnd() {
  const result = state.gameResult;
  let message = "";
  
  if (result.winner === 'home') {
    message = "🎉 MyGO!!!!!獲勝！";
  } else if (result.winner === 'away') {
    message = "😔 Yankees獲勝...";
  } else {
    message = "🤝 平手！";
  }
  
  message += ` 終場比數 ${result.finalScore.away} : ${result.finalScore.home}`;
  
  document.getElementById('outcome-text').textContent = message;
  
  // 顯示遊戲統計
  console.log("📊 遊戲統計:", state.gameStats);
  
  render(state, handlers);
}

/**
 * CPU回合模擬
 */
function runCpuTurn() {
  let cpuOuts = 0;
  let cpuBatterIndex = 0;
  const playerPitcher = state.player.pitcher;
  const cpuBases = [null, null, null];

  const turnInterval = setInterval(() => {
    if (cpuOuts >= 3) {
      clearInterval(turnInterval);
      changeHalfInning();
      return;
    }

    const batter = state.cpu.deck[cpuBatterIndex % state.cpu.deck.length];
    const result = simulateAtBat(batter, playerPitcher, state);
    
    state.gameStats.cpuAtBats++;
    console.log(`🤖 CPU: ${batter.name} - ${result.type}`);

    if (result.type === 'K' || result.type === 'OUT') {
      cpuOuts++;
      document.getElementById('outcome-text').textContent = result.description;
    } else {
      // CPU得分邏輯
      let points = 0;
      const advanceCount = result.adv || 0;

      // 推進CPU跑者
      for (let i = 2; i >= 0; i--) {
        if (cpuBases[i]) {
          const newPosition = i + advanceCount;
          if (newPosition >= 3) {
            points++;
            cpuBases[i] = null;
          } else {
            cpuBases[newPosition] = cpuBases[i];
            cpuBases[i] = null;
          }
        }
      }

      // 放置CPU打者
      if (advanceCount > 0 && advanceCount < 4) {
        cpuBases[advanceCount - 1] = batter;
      } else if (advanceCount === 4) {
        points++;
      }

      state.score.away += points;
      document.getElementById('outcome-text').textContent = result.description + 
        (points > 0 ? ` 客隊得${points}分！` : '');
    }
    
    cpuBatterIndex++;
    render(state, handlers);
  }, 1500);
}

// =============================================================================
// 3. Utility helper functions
// =============================================================================

function prepareCard(cardData) {
  const card = { ...cardData };
  
  if (card.type === 'batter') {
    card.ovr = calculateBatterOVR(card.stats);
  } else if (card.type === 'pitcher') {
    card.ovr = calculatePitcherOVR(card.stats);
  } else if (card.type === 'action') {
    card.ovr = card.rarity || "戰術";
  }
  
  return card;
}

function calculateBatterOVR(stats) {
  const w = CONFIG.ovrWeights.batter;
  const power = stats.power ?? 50;
  const hitRate = stats.hitRate ?? 50;
  const contact = stats.contact ?? 50;
  const speed = stats.speed ?? 50;
  const score = power * w.power + hitRate * w.hitRate + contact * w.contact + speed * w.speed;
  const ovr = Math.round(score * w.scale + w.base);
  return Math.min(99, Math.max(40, ovr));
}

function calculatePitcherOVR(stats) {
  const w = CONFIG.ovrWeights.pitcher;
  const power = stats.power ?? 50;
  const velocity = stats.velocity ?? 50;
  const control = stats.control ?? 50;
  const technique = stats.technique ?? 50;
  const score = power * w.power + velocity * w.velocity + control * w.control + technique * w.technique;
  const ovr = Math.round(score * w.scale + w.base);
  return Math.min(99, Math.max(40, ovr));
}

function draw(player, numToDraw) {
  for (let i = 0; i < numToDraw; i++) {
    if (player.deck.length === 0) {
      if (player.discard.length === 0) return;
      player.deck = [...player.discard];
      player.discard = [];
      shuffle(player.deck);
    }
    if (player.hand.length < state.cfg.handSize && player.deck.length > 0) {
      player.hand.push(player.deck.pop());
    }
  }
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

// =============================================================================
// 4. Game startup
// =============================================================================

// 初始化遊戲
console.log("🎮 MyGO!!!!! TCG 啟動中...");
console.log("🎸 預設隊伍: MyGO!!!!! & Ave Mujica");

// 執行初始渲染
render(state, handlers);

// 添加鍵盤快捷鍵
document.addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '5') {
    const index = parseInt(e.key) - 1;
    if (index < state.player.hand.length) {
      handlers.select(index);
    }
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handlers.button();
  } else if (e.key === 'r' || e.key === 'R') {
    handlers.restart();
  }
});

console.log("🎯 遊戲已準備就緒！");
console.log("📋 操作說明:");
console.log("  - 點擊卡牌或按數字鍵1-5選擇");
console.log("  - 按Enter或空格鍵確認");
console.log("  - 按R重新開始");