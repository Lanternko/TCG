// src/main.js - 修復版本
console.log('🎸 MyGO!!!!! TCG Enhanced Edition 載入中...');

// ✅ 修復 1: 添加所有必要的 imports
import { GAME_CONFIG } from './data/config.js';
import { TEAMS, getTeamById } from './data/teams.js';
import { createGameState } from './engine/game_state.js';
import { render } from './ui/ui.js';
import { EffectProcessor } from './engine/effects.js';
import { simulateAtBat } from './engine/sim.js';

// ✅ 修復 2: 移除重複的全域變數宣告
let gameInitialized = false;
let draggedCard = null;
let draggedCardIndex = -1;
let awaitingTargetSelection = false;
let pendingActionCard = null;
let currentGameState = null;
let currentHandlers = null;
let effectProcessor = null;

// ✅ 修復 3: 簡化 window 物件使用
window.awaitingTargetSelection = false;
window.pendingActionCard = null;
window.gameState = null;

async function initializeGame() {
  try {
    console.log('📦 開始載入增強版遊戲模組...');
    
    // ✅ 修復 4: 移除不必要的動態 import
    console.log('✅ 使用靜態 imports，跳過動態載入');
    
    // 將配置掛載到 window 供全域使用
    window.GAME_CONFIG = GAME_CONFIG;
    
    startGame();
    
  } catch (error) {
    console.error('❌ 模組載入失敗:', error);
    showErrorMessage(`載入失敗: ${error.message}`);
  }
}

function startGame() {
  try {
    console.log('🎯 開始初始化增強版遊戲...');
    
    // --- 創建核心遊戲狀態 ---
    const state = createGameState();
    currentGameState = state;
    window.gameState = state;
    console.log('✅ 遊戲狀態創建成功');

    // --- 初始化效果處理器 ---
    effectProcessor = new EffectProcessor(state);
    window.effectProcessor = effectProcessor;
    console.log('✅ 效果處理器 (EffectProcessor) 初始化完成');

    // --- 準備隊伍資料 ---
    const mygoTeam = TEAMS.find(team => team.id === "MGO");
    if (!mygoTeam) {
      throw new Error('找不到MyGO隊伍資料');
    }
    console.log('✅ MyGO隊伍確認:', mygoTeam.name);
    
    // 創建 handlers 物件
    const handlers = {
      select: (idx) => {
        console.log('🎯 選擇卡牌:', idx);
        if (state.playerTurn && !awaitingTargetSelection) {
          state.selected = (state.selected === idx) ? -1 : idx;
          render(state, handlers);
        }
      },
      button: () => {
        console.log('🎯 主按鈕點擊');
        const gameStarted = !!state.cpu.activePitcher;
        
        if (!gameStarted) {
          initDecks(state, handlers);
        } else if (state.playerTurn && state.selected !== -1) {
          runPlayerTurn(state, handlers);
        }
        
        render(state, handlers);
      },
      baseClick: (baseIndex) => {
        console.log('🎯 壘包點擊:', baseIndex);
        if (awaitingTargetSelection && state.bases[baseIndex]) {
          handleTargetSelection(baseIndex, state, handlers);
        }
      },
      dragToBatter: (cardIndex) => {
        console.log('🎯 拖拽到打擊位置:', cardIndex);
        if (state.playerTurn && !awaitingTargetSelection) {
          state.selected = cardIndex;
          runPlayerTurn(state, handlers);
        }
      },
      render: render
    };
    
    currentHandlers = handlers;
    window.currentHandlers = handlers;
    window.handleHandCardSelection = handleHandCardSelection;
    window.cancelTargetSelection = cancelTargetSelection;
    
    setupDragDropZones(handlers);
    
    const mainButton = document.getElementById('main-button');
    if (mainButton) {
      mainButton.onclick = handlers.button;
    }
    
    render(state, handlers);
    
    gameInitialized = true;
    console.log('🎉 增強版遊戲初始化完成！');
    
    const outcomeText = document.getElementById('outcome-text');
    if (outcomeText) {
      outcomeText.textContent = '🎸 MyGO!!!!! Enhanced Edition 準備就緒！點擊 Play Ball 開始遊戲！';
    }
    
  } catch (error) {
    console.error('❌ 遊戲初始化失敗:', error);
    showErrorMessage(`初始化失敗: ${error.message}`);
  }
}

function setupDragDropZones(handlers) {
  const centerField = document.querySelector('.center-field');
  if (centerField) {
    centerField.replaceWith(centerField.cloneNode(true));
    const newCenterField = document.querySelector('.center-field');
    
    newCenterField.addEventListener('dragover', (e) => {
      e.preventDefault();
      newCenterField.classList.add('drag-over');
      
      const dropHint = document.getElementById('drop-hint');
      if (dropHint) {
        dropHint.classList.add('active');
        dropHint.textContent = '釋放以進行打擊';
      }
    });
    
    newCenterField.addEventListener('dragleave', (e) => {
      if (!newCenterField.contains(e.relatedTarget)) {
        newCenterField.classList.remove('drag-over');
        
        const dropHint = document.getElementById('drop-hint');
        if (dropHint) {
          dropHint.classList.remove('active');
          dropHint.textContent = '拖拽卡片到此區域進行打擊';
        }
      }
    });
    
    newCenterField.addEventListener('drop', (e) => {
      e.preventDefault();
      newCenterField.classList.remove('drag-over');
      
      const dropHint = document.getElementById('drop-hint');
      if (dropHint) {
        dropHint.classList.remove('active');
      }
      
      const cardIndex = parseInt(e.dataTransfer.getData('text/plain'));
      if (cardIndex !== -1 && !isNaN(cardIndex)) {
        console.log('🎯 拖拽到中央場地:', cardIndex);
        handlers.dragToBatter(cardIndex);
      }
    });
    
    newCenterField.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (window.awaitingTargetSelection) {
        window.cancelTargetSelection(window.gameState, handlers);
      }
    });
  }
}

// ✅ 修復 5: 使用配置文件的設定
function initDecks(state, handlers) {
  try {
    console.log('🎯 初始化牌組...');
    
    const playerTeam = TEAMS.find(team => team.id === "MGO");
    state.player.team = playerTeam;
    state.player.deck = [...playerTeam.batters, ...playerTeam.actionCards].map(prepareCard);
    shuffle(state.player.deck);
    state.player.hand = [];
    state.player.pitcher = prepareCard(playerTeam.pitchers[0]);
    
    // ✅ 使用配置的起始手牌數
    drawCards(state.player, GAME_CONFIG.HAND.STARTING_DRAW);
    
    const cpuTeam = TEAMS.find(team => team.id === "NYY");
    state.cpu.team = cpuTeam;
    state.cpu.deck = [...cpuTeam.batters].map(prepareCard);
    state.cpu.activePitcher = prepareCard(cpuTeam.pitchers[0]);
    
    console.log('✅ 牌組初始化完成');
    
    const outcomeText = document.getElementById('outcome-text');
    if (outcomeText) {
      outcomeText.textContent = '🎵 MyGO!!!!! vs Yankees - 客隊先攻！';
    }
    
    setTimeout(() => runCpuTurn(state, handlers), 1000);
    
  } catch (error) {
    console.error('❌ 牌組初始化失敗:', error);
    showErrorMessage(`牌組初始化失敗: ${error.message}`);
  }
}

// ✅ 修復 6: 簡化玩家回合邏輯
function runPlayerTurn(state, handlers) {
  try {
    const cardIndex = state.selected;
    const card = state.player.hand[cardIndex];
    
    if (!card) {
      console.warn('⚠️ 沒有選擇有效的卡牌');
      state.selected = -1;
      render(state, handlers);
      return;
    }
    
    console.log(`🎯 玩家回合：使用 ${card.name}`);
    
    if (card.type === 'batter') {
      // ✅ 修復 7: 只使用一種效果處理方式
      handleBattlecry(card);
      
      // ✅ 修復 8: 使用 sim.js 的模擬函數
      const result = simulateAtBat(card, state.cpu.activePitcher, state);
      
      // 處理打擊結果
      processAtBatResult(result, card, state);
      
      // 移除卡牌並抽新牌
      removeCardFromHand(state, cardIndex);
      drawCards(state.player, GAME_CONFIG.HAND.DRAW_AFTER_PLAY);
      
    } else if (card.type === 'action') {
      if (needsTargetSelection(card)) {
        startTargetSelection(card, state, handlers);
        return;
      } else {
        executeActionCard(card, state);
        removeCardFromHand(state, cardIndex);
      }
    }
    
    state.selected = -1;
    render(state, handlers);
    
    // 檢查是否需要更換半局
    if (state.outs >= GAME_CONFIG.FLOW.OUTS_PER_INNING) {
      setTimeout(() => changeHalfInning(state, handlers), 1500);
    }
    
  } catch (error) {
    console.error('❌ 玩家回合執行失敗:', error);
    showErrorMessage(`玩家回合出錯: ${error.message}`);
  }
}

// ✅ 修復 9: 統一效果處理
function handleBattlecry(card) {
  if (!card.effects || !card.effects.play) return;
  
  // 只使用 EffectProcessor，移除重複處理
  const result = effectProcessor.processBattlecry(card);
  
  if (result && result.success) {
    console.log('✅ 戰吼效果:', result.description);
    updateOutcomeText(`${card.name}: ${result.description}`);
  }
}

// ✅ 修復 10: 統一抽牌邏輯
function drawCards(player, count) {
  if (!effectProcessor) {
    console.error('❌ EffectProcessor 未初始化');
    return;
  }
  
  effectProcessor.drawCards(player, count);
}

// ✅ 修復 11: 簡化打擊結果處理
function processAtBatResult(result, batterCard, state) {
  console.log('⚾ 處理打擊結果:', result.type);
  
  updateOutcomeText(result.description);
  
  if (result.type === 'K' || result.type === 'OUT') {
    state.outs++;
    console.log(`❌ ${batterCard.name} 出局，出局數: ${state.outs}`);
    
    // 處理死聲效果
    if (batterCard.effects && batterCard.effects.death) {
      const deathResult = effectProcessor.processDeathrattle(batterCard);
      if (deathResult.success) {
        console.log('💀 死聲效果:', deathResult.description);
      }
    }
  } else {
    // 處理上壘和得分
    const advancement = getAdvancement(result.type);
    const pointsScored = advanceRunners(state, batterCard, advancement);
    state.score.home += pointsScored;
    
    console.log(`📊 得分: +${pointsScored} (總分: ${state.score.home})`);
  }
}

function getAdvancement(hitType) {
  switch (hitType) {
    case 'HR': return 4;
    case '3B': return 3;
    case '2B': return 2;
    case '1B':
    case 'BB': return 1;
    default: return 0;
  }
}

function advanceRunners(state, newBatter, advancement) {
  let pointsScored = 0;
  
  console.log('🏃 開始壘包推進...');
  
  // 從三壘開始處理
  for (let i = 2; i >= 0; i--) {
    const runner = state.bases[i];
    if (runner) {
      const newPosition = i + advancement;
      
      if (newPosition >= 3) {
        // 得分
        if (!runner.locked) {
          console.log(`🏠 ${runner.name} 從 ${i + 1} 壘得分！`);
          
          // 處理得分時的死聲效果
          if (runner.effects && runner.effects.death) {
            effectProcessor.processDeathrattle(runner);
          }
          
          state.player.discard.push(runner);
          pointsScored++;
          state.bases[i] = null;
        }
      } else {
        // 推進
        if (!runner.locked && !state.bases[newPosition]) {
          state.bases[newPosition] = runner;
          state.bases[i] = null;
        }
      }
    }
  }
  
  // 放置新打者
  if (advancement < 4) {
    const targetBase = advancement - 1;
    if (targetBase >= 0 && targetBase <= 2 && !state.bases[targetBase]) {
      state.bases[targetBase] = newBatter;
    } else {
      // 滿壘情況處理
      let placed = false;
      for (let i = targetBase + 1; i <= 2; i++) {
        if (!state.bases[i]) {
          state.bases[i] = newBatter;
          placed = true;
          break;
        }
      }
      if (!placed) {
        pointsScored++;
        state.player.discard.push(newBatter);
      }
    }
  } else {
    // 全壘打
    state.player.discard.push(newBatter);
  }
  
  return pointsScored;
}

function executeActionCard(card, state, targetCard = null, targetIndex = -1) {
  let description = "";
  
  if (effectProcessor && card.effects?.play) {
    console.log('🎭 使用效果處理器執行戰術卡:', card.name);
    
    if (targetCard) {
      card.effects.play.targetCard = targetCard;
      card.effects.play.targetIndex = targetIndex;
    }
    
    const result = effectProcessor.processEffect(card, card.effects.play, 'play');
    if (result.success) {
      description = result.description;
    } else {
      description = `${card.name} 執行失敗: ${result.reason}`;
    }
  } else {
    description = `${card.name} 戰術卡發動！`;
  }
  
  updateOutcomeText(description);
  return description;
}

function removeCardFromHand(state, cardIndex) {
  if (cardIndex < 0 || cardIndex >= state.player.hand.length) {
    console.warn('⚠️ 無效的卡牌索引:', cardIndex);
    return null;
  }
  
  const removedCard = state.player.hand.splice(cardIndex, 1)[0];
  
  // 處理死聲效果
  if (removedCard.effects?.death) {
    const deathResult = effectProcessor.processDeathrattle(removedCard);
    if (deathResult.success) {
      console.log('💀 死聲效果:', deathResult.description);
    }
  }
  
  state.player.discard.push(removedCard);
  return removedCard;
}

function prepareCard(cardData) {
  const card = { ...cardData };
  
  // 初始化加成欄位
  card.permanentBonus = card.permanentBonus || {};
  card.tempBonus = card.tempBonus || {};
  
  // 計算 OVR
  if (card.type === 'batter') {
    card.ovr = calculateBatterOVR(card.stats);
  } else if (card.type === 'pitcher') {
    card.ovr = calculatePitcherOVR(card.stats);
  } else if (card.type === 'action') {
    card.ovr = card.rarity || "戰術";
  }
  
  return card;
}

// ✅ 修復 12: 統一 OVR 計算
function calculateBatterOVR(stats) {
  const weights = { power: 0.3, hitRate: 0.3, contact: 0.2, speed: 0.2 };
  const weightedAverage = (
    stats.power * weights.power + 
    stats.hitRate * weights.hitRate + 
    stats.contact * weights.contact + 
    stats.speed * weights.speed
  ) / (weights.power + weights.hitRate + weights.contact + weights.speed);
  
  const ovr = Math.round(weightedAverage);
  return Math.max(40, Math.min(99, ovr));
}

function calculatePitcherOVR(stats) {
  const weights = { power: 0.3, velocity: 0.3, control: 0.2, technique: 0.2 };
  const weightedAverage = (
    stats.power * weights.power + 
    stats.velocity * weights.velocity + 
    stats.control * weights.control + 
    stats.technique * weights.technique
  ) / (weights.power + weights.velocity + weights.control + weights.technique);
  
  const ovr = Math.round(weightedAverage);
  return Math.max(40, Math.min(99, ovr));
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function updateOutcomeText(message) {
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = message;
    outcomeText.style.color = '#f39c12';
  }
}

function showErrorMessage(message) {
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = `❌ 錯誤: ${message}`;
    outcomeText.style.color = '#e74c3c';
  }
  console.error('🚨 顯示錯誤訊息:', message);
}

// 目標選擇相關函數 (簡化版)
function needsTargetSelection(card) {
  const targetRequiredCards = ['一輩子...', '想成為人類', '滿腦子想著自己'];
  return targetRequiredCards.includes(card.name);
}

function startTargetSelection(card, state, handlers) {
  awaitingTargetSelection = true;
  pendingActionCard = card;
  window.awaitingTargetSelection = true;
  window.pendingActionCard = card;
  
  updateOutcomeText(`選擇 ${card.name} 的目標... (右鍵取消)`);
  highlightValidTargets(card, state);
  render(state, handlers);
}

function highlightValidTargets(card, state) {
  // 簡化的高亮邏輯
  if (card.name === '一輩子...') {
    state.bases.forEach((baseCard, index) => {
      if (baseCard) {
        const baseIds = ['first-base', 'second-base', 'third-base'];
        const baseElement = document.getElementById(baseIds[index]);
        if (baseElement) {
          baseElement.classList.add('selectable-target');
        }
      }
    });
  }
}

function handleTargetSelection(baseIndex, state, handlers) {
  if (!pendingActionCard) return;
  
  const targetCard = state.bases[baseIndex];
  if (!targetCard) return;
  
  executeActionCard(pendingActionCard, state, targetCard, baseIndex);
  
  const cardIndex = state.player.hand.findIndex(card => card === pendingActionCard);
  if (cardIndex !== -1) {
    removeCardFromHand(state, cardIndex);
  }
  
  resetTargetSelection(state);
  render(state, handlers);
}

function handleHandCardSelection(cardIndex, state, handlers) {
  // 處理手牌目標選擇
  if (!pendingActionCard) return;
  
  const targetCard = state.player.hand[cardIndex];
  if (!targetCard || targetCard.type !== 'batter') return;
  
  executeActionCard(pendingActionCard, state, targetCard, -1);
  
  const actionCardIndex = state.player.hand.findIndex(card => card === pendingActionCard);
  if (actionCardIndex !== -1) {
    removeCardFromHand(state, actionCardIndex);
  }
  
  resetTargetSelection(state);
  render(state, handlers);
}

function cancelTargetSelection(state, handlers) {
  updateOutcomeText(`已取消 ${pendingActionCard?.name || '戰術卡'} 的使用`);
  resetTargetSelection(state);
  render(state, handlers);
}

function resetTargetSelection(state) {
  awaitingTargetSelection = false;
  pendingActionCard = null;
  state.selected = -1;
  
  window.awaitingTargetSelection = false;
  window.pendingActionCard = null;
  
  document.querySelectorAll('.base, .hand-card').forEach(element => {
    element.classList.remove('selectable-target');
  });
}

// CPU 和遊戲流程函數
function runCpuTurn(state, handlers) {
  console.log('🤖 CPU回合開始');
  
  let cpuOuts = 0;
  const cpuResults = [];
  
  while (cpuOuts < 3) {
    const random = Math.random();
    let result;
    
    if (random < 0.25) {
      result = { type: 'K', description: 'CPU 三振出局', points: 0 };
      cpuOuts++;
    } else if (random < 0.35) {
      result = { type: 'OUT', description: 'CPU 出局', points: 0 };
      cpuOuts++;
    } else {
      result = { type: '1B', description: 'CPU 一壘安打', points: 1 };
      state.score.away += 1;
    }
    
    cpuResults.push(result);
  }
  
  const totalRuns = cpuResults.reduce((sum, r) => sum + r.points, 0);
  updateOutcomeText(`CPU回合結束：${totalRuns}分`);
  
  render(state, handlers);
  setTimeout(() => changeHalfInning(state, handlers), 800);
}

function changeHalfInning(state, handlers) {
  state.outs = 0;
  
  if (state.half === 'top') {
    state.half = 'bottom';
    state.playerTurn = true;
    updateOutcomeText('🎵 輪到MyGO!!!!!攻擊！');
  } else {
    state.half = 'top';
    state.currentInning++;
    
    if (state.currentInning > GAME_CONFIG.FLOW.INNINGS) {
      handleGameOver(state);
      return;
    }
    
    state.playerTurn = false;
    updateOutcomeText('⚾ 客隊攻擊中...');
    setTimeout(() => runCpuTurn(state, handlers), 1000);
  }
  
  render(state, handlers);
}

function handleGameOver(state) {
  state.over = true;
  
  const winner = state.score.home > state.score.away ? "MyGO!!!!!獲勝！" : 
                state.score.away > state.score.home ? "Yankees獲勝！" : "平手！";
  
  updateOutcomeText(`🎉 比賽結束！${winner} 比數 ${state.score.away}:${state.score.home}`);
  
  const restartButton = document.getElementById('restart-button');
  if (restartButton) {
    restartButton.style.display = 'block';
    restartButton.onclick = () => location.reload();
  }
}

console.log('🎮 準備啟動 MyGO!!!!! TCG Enhanced Edition...');
initializeGame();