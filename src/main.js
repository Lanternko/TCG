// src/main.js (重構版)
import { createGameState } from './engine/game_state.js';
import { render } from './ui/ui.js';
import { simulateAtBat, processCardEffects } from './engine/sim.js';

// =============================================================================
// 1. 初始化遊戲狀態與事件處理器
// =============================================================================

const state = createGameState();

const handlers = {
  /**
   * 處理卡牌選擇事件
   * @param {number} idx - 被點擊的卡牌索引
   */
  select: (idx) => {
    if (state.playerTurn) {
      // 如果點擊的是已經選中的卡牌，則取消選擇；否則，選擇新卡牌。
      state.selected = (state.selected === idx) ? -1 : idx;
      render(state, handlers); // 每次選擇後都立即重繪，以更新卡牌的 'selected' 樣式
    }
  },
  /**
   * 處理主按鈕點擊事件
   */
  button: () => {
    const gameStarted = !!state.cpu.activePitcher;

    if (!gameStarted) {
      // 如果遊戲尚未開始，則初始化牌組
      initDecks();
    } else if (state.playerTurn && state.selected !== -1) {
      // 如果是玩家回合且已選擇卡牌，則執行玩家回合
      runPlayerTurn();
    }
    
    // 每次點擊主按鈕後，都根據最新狀態重繪整個畫面
    render(state, handlers);
  },
};

// =============================================================================
// 2. 核心遊戲流程函數
// =============================================================================

/**
 * 初始化所有牌組、手牌和投手
 */
function initDecks() {
  // 初始化玩家
  const playerTeam = state.player.team;
  state.player.deck = [...playerTeam.batters];
  shuffle(state.player.deck);
  state.player.hand = [];
  draw(state.player, state.cfg.handSize);

  // 初始化 CPU
  state.cpu.deck = [...state.cpu.team.batters];
  state.cpu.activePitcher = state.cpu.team.pitchers[0];
  
  document.getElementById('outcome-text').textContent = "輪到你打擊！";
}

/**
 * 執行一個完整的玩家回合
 */
function runPlayerTurn() {
  const card = state.player.hand[state.selected];
  if (!card) return;

  // --- 效果與模擬階段 ---
  processCardEffects(card, 'play', state);
  const result = simulateAtBat(card, state.cpu.activePitcher, state);
  
  // --- 結果處理階段 ---
  processAtBatOutcome(result, card);

  // --- 狀態更新階段 ---
  // 從手牌移除卡牌，加入棄牌堆
  state.player.hand.splice(state.selected, 1);
  state.player.discard.push(card);
  draw(state.player, 1); // 抽一張新牌
  state.selected = -1; // 重置選擇

  // 清理一次性效果 (例如：只持續一次打擊的效果)
  state.activeEffects = state.activeEffects.filter(e => e.duration !== "atBat");

  // --- 回合結束檢查 ---
  render(state, handlers); // 先渲染一次本次打擊的結果

  if (state.outs >= 3) {
    // 使用 setTimeout 給予玩家 1.5 秒的時間查看結果，然後才換邊
    setTimeout(changeHalfInning, 1500);
  }
}

/**
 * 處理打擊結果，更新分數、出局數和壘包
 * @param {object} result - 模擬結果
 * @param {object} card - 打擊的卡牌
 */
function processAtBatOutcome(result, card) {
  document.getElementById('outcome-text').textContent = result.description;

  if (result.type === 'K' || result.type === 'OUT') {
    state.outs++;
    processCardEffects(card, 'death', state); // 處理 'death' 效果
    // 處理永久效果 (如 Aristotle)
    const deathEffect = card.effects?.death;
    if (deathEffect?.duration === 'permanent') {
        state.player.deck.forEach(c => c.stats[deathEffect.stat] += deathEffect.value);
        state.player.hand.forEach(c => c.stats[deathEffect.stat] += deathEffect.value);
        state.player.discard.forEach(c => c.stats[deathEffect.stat] += deathEffect.value);
    }
  } else {
    // 如果安全上壘，處理 'aura' 和 'synergy' 效果
    processCardEffects(card, 'aura', state);
    processCardEffects(card, 'synergy', state);

    // 推進跑者和計分 (這是個簡化版本，未來可以擴充得更複雜)
    const runners = state.bases.filter(Boolean); // 目前壘上的跑者
    runners.push(card); // 打者也算進來
    state.bases = [null, null, null]; // 清空壘包準備重置
    let scoreGained = 0;

    runners.forEach(runner => {
      // 假設每個跑者都前進 result.adv 個壘包
      const currentBase = state.bases.indexOf(runner); // -1 if not on base
      const newBaseIndex = currentBase + result.adv;
      if (newBaseIndex >= 3) {
        scoreGained++; // 跑回本壘得分
      } else {
        state.bases[newBaseIndex] = runner; // 前進到新壘包
      }
    });

    // 更新分數
    const currentScorer = state.half === 'top' ? 'away' : 'home';
    state.score[currentScorer] += scoreGained;
  }
}

/**
 * 攻守交換
 */
function changeHalfInning() {
  // 重置狀態
  state.outs = 0;
  state.bases = [null, null, null];
  state.activeEffects = state.activeEffects.filter(e => e.duration !== "inning");

  if (state.half === 'top') {
    // 換 CPU 打擊
    state.half = 'bottom';
    state.playerTurn = false;
    document.getElementById('outcome-text').textContent = "對手正在打擊...";
    runCpuTurn();
  } else {
    // 換玩家打擊
    state.half = 'top';
    state.currentInning++;
    state.playerTurn = true;
    document.getElementById('outcome-text').textContent = "輪到你打擊！";
  }

  // 檢查比賽是否結束
  if (state.currentInning > state.cfg.innings) {
    state.over = true;
    document.getElementById('outcome-text').textContent = `比賽結束！終場比數 ${state.score.away} : ${state.score.home}`;
  }

  render(state, handlers);
}

/**
 * 模擬 CPU 的完整回合
 */
function runCpuTurn() {
  let cpuOuts = 0;
  let cpuBatterIndex = 0;
  const playerPitcher = state.player.team.pitchers[0];

  // 使用 setInterval 來模擬一次次的打擊，讓玩家能看到過程
  const turnInterval = setInterval(() => {
    if (cpuOuts >= 3) {
      clearInterval(turnInterval);
      changeHalfInning(); // 3出局，換邊
      return;
    }

    const batter = state.cpu.deck[cpuBatterIndex % state.cpu.deck.length];
    const result = simulateAtBat(batter, playerPitcher, state);

    if (result.type === 'K' || result.type === 'OUT') {
      cpuOuts++;
    } else {
      // 簡化 CPU 得分邏輯
      let points = 0;
      switch (result.type) {
        case 'HR': points = 1 + state.bases.filter(Boolean).length; break;
        case '3B': points = 1; break; // 簡化處理
        case '2B': points = 1; break;
        case '1B': points = 1; break;
      }
      state.score.home += points;
    }
    cpuBatterIndex++;
    render(state, handlers); // 每次 CPU 打擊後都更新畫面
  }, 1000); // 每秒打一次
}


// =============================================================================
// 3. 輔助工具函數
// =============================================================================

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
// 4. 遊戲啟動
// =============================================================================

// 進行首次渲染，顯示 "Play Ball" 畫面
render(state, handlers);
