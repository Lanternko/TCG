// src/main.js - Enhanced with new card effects system
console.log('🎸 MyGO!!!!! TCG Enhanced Edition 載入中...');

let CONFIG, TEAMS, createGameState, render, EffectProcessor, effectRegistry;
let gameInitialized = false;
let draggedCard = null;
let draggedCardIndex = -1;
let awaitingTargetSelection = false;
let pendingActionCard = null;
let currentGameState = null;
let currentHandlers = null;
let effectProcessor = null; // 🆕 新增：效果處理器實例

// 🆕 新增：暴露到 window 物件供跨模組使用
window.awaitingTargetSelection = false;
window.pendingActionCard = null;
window.gameState = null;
window.handleHandCardSelection = null;
window.effectProcessor = null;

async function initializeGame() {
  try {
    console.log('📦 開始載入增強版遊戲模組...');
    
    const configModule = await import('./data/config.js');
    CONFIG = configModule.CONFIG;
    console.log('✅ Config 載入成功');
    
    const teamsModule = await import('./data/teams.js');
    TEAMS = teamsModule.TEAMS;
    console.log('✅ Enhanced Teams 載入成功:', TEAMS.length, '個隊伍');
    
    const gameStateModule = await import('./engine/game_state.js');
    createGameState = gameStateModule.createGameState;
    console.log('✅ Game State 載入成功');
    
    // 🆕 新增：載入增強效果系統
    const effectsModule = await import('./engine/effects.js');
    EffectProcessor = effectsModule.EffectProcessor;
    effectRegistry = effectsModule.effectRegistry;
    console.log('✅ Enhanced Effects System 載入成功');
    
    const uiModule = await import('./ui/ui.js');
    render = uiModule.render;
    console.log('✅ UI 載入成功');
    
    if (uiModule.initializeCancelFunctionality) {
      uiModule.initializeCancelFunctionality();
    }
    
    startGame();
    
  } catch (error) {
    console.error('❌ 模組載入失敗:', error);
    showErrorMessage(`載入失敗: ${error.message}`);
  }
}

function startGame() {
  try {
    console.log('🎯 開始初始化增強版遊戲...');
    
    const state = createGameState();
    currentGameState = state;
    window.gameState = state;
    
    // 🆕 新增：初始化效果處理器
    effectProcessor = new EffectProcessor(state);
    window.effectProcessor = effectProcessor;
    console.log('✅ 效果處理器初始化完成');
    
    console.log('✅ 遊戲狀態創建成功');
    
    const mygoTeam = TEAMS.find(team => team.id === "MGO");
    if (!mygoTeam) {
      throw new Error('找不到MyGO隊伍資料');
    }
    
    console.log('✅ MyGO隊伍確認:', mygoTeam.name);
    
    const handlers = {
      select: (idx) => {
        console.log('🎯 選擇卡牌:', idx);
        if (state.playerTurn && !awaitingTargetSelection) {
          state.selected = (state.selected === idx) ? -1 : idx;
          render(state, handlers);
        }
      },
      
      button: () => {
        console.log('🎯 按鈕點擊');
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
    
    window.handleHandCardSelection = handleHandCardSelection;
    window.cancelTargetSelection = cancelTargetSelection;
    window.currentHandlers = handlers;
    
    setupDragDropZones(handlers);
    render(state, handlers);
    
    const mainButton = document.getElementById('main-button');
    if (mainButton) {
      mainButton.onclick = handlers.button;
    }
    
    console.log('🎉 增強版遊戲初始化完成！');
    gameInitialized = true;
    
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

function initDecks(state, handlers) {
  try {
    console.log('🎯 初始化增強版牌組...');
    
    const playerTeam = TEAMS.find(team => team.id === "MGO");
    state.player.team = playerTeam;
    state.player.deck = [...playerTeam.batters, ...playerTeam.actionCards].map(prepareCard);
    shuffle(state.player.deck);
    state.player.hand = [];
    state.player.pitcher = prepareCard(playerTeam.pitchers[0]);
    
    draw(state.player, 5);
    
    const cpuTeam = TEAMS.find(team => team.id === "NYY");
    state.cpu.team = cpuTeam;
    state.cpu.deck = [...cpuTeam.batters].map(prepareCard);
    state.cpu.activePitcher = prepareCard(cpuTeam.pitchers[0]);
    
    console.log('✅ 增強版牌組初始化完成');
    console.log('  - 玩家手牌:', state.player.hand.length, '張');
    console.log('  - 玩家牌組:', state.player.deck.length, '張');
    console.log('  - CPU牌組:', state.cpu.deck.length, '張');
    
    const outcomeText = document.getElementById('outcome-text');
    if (outcomeText) {
      outcomeText.textContent = '🎵 MyGO!!!!! vs Yankees - 客隊先攻！準備感受新效果的威力！';
    }
    
    setTimeout(() => {
      runCpuTurn(state, handlers);
    }, 1000);
    
  } catch (error) {
    console.error('❌ 牌組初始化失敗:', error);
    showErrorMessage(`牌組初始化失敗: ${error.message}`);
  }
}

// 🔧 修改：runPlayerTurn 函數 - 整合新效果系統
function runPlayerTurn(state, handlers) {
  try {
    const card = state.player.hand[state.selected];
    if (!card) {
      console.warn('⚠️ 沒有選中的卡牌');
      return;
    }
    
    console.log('🎯 增強版玩家回合:', card.name, '類型:', card.type, '位置:', card.position);
    
    if (card.type === 'batter') {
      // 🆕 新增：應用預設加成和永久效果
      if (effectProcessor) {
        effectProcessor.applyNextCardBuffs(card);
        effectProcessor.applyPermanentEffects(card);
      }
      
      // 🆕 新增：處理戰吼效果
      if (card.effects && card.effects.play && effectProcessor) {
        console.log('🎭 處理戰吼效果:', card.name);
        const battlecryResult = effectProcessor.processBattlecry(card);
        if (battlecryResult.success) {
          console.log('✅ 戰吼效果成功:', battlecryResult.description);
          updateOutcomeText(`${card.name}: ${battlecryResult.description}`);
          
          // 給玩家時間看效果
          setTimeout(() => {
            // 然後進行打擊
            proceedWithAtBat(card, state, handlers);
          }, 1500);
          return;
        } else {
          console.log('❌ 戰吼效果失敗:', battlecryResult.reason);
        }
      }
      
      // 直接進行打擊
      proceedWithAtBat(card, state, handlers);
      
    } else if (card.type === 'action') {
      // 戰術卡：檢查是否需要選擇目標
      if (needsTargetSelection(card)) {
        startTargetSelection(card, state, handlers);
        return;
      } else {
        console.log('🎭 執行戰術卡:', card.name);
        executeActionCard(card, state);
        
        if (window.addGameHistory) {
          window.addGameHistory('actionCard', {
            player: '玩家',
            card: card.name
          });
        }
        
        console.log('🗑️ 移除戰術卡:', card.name);
        removeCardFromHand(state, state.selected);
      }
    }
    
    // 重置選擇狀態
    state.selected = -1;
    console.log('✅ 玩家回合完成，手牌數量:', state.player.hand.length);
    
    // 🆕 新增：處理羈絆效果
    if (effectProcessor) {
      processAllSynergyEffects(state);
    }
    
    render(state, handlers);
    
    if (state.outs >= 3) {
      if (window.addGameHistory) {
        window.addGameHistory('endInning', {
          inning: `${state.currentInning}局${state.half}`,
          score: `${state.score.away}-${state.score.home}`
        });
      }
      
      setTimeout(() => changeHalfInning(state, handlers), 1500);
    }
    
  } catch (error) {
    console.error('❌ 玩家回合失敗:', error);
    showErrorMessage(`玩家回合失敗: ${error.message}`);
  }
}

// 🆕 新增：分離的打擊處理函數
function proceedWithAtBat(card, state, handlers) {
  // 進行打擊模擬
  const result = simulateEnhancedAtBat(card, state.cpu.activePitcher, state);
  processSimpleOutcome(result, state, card);
  
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = result.description;
  }
  
  if (window.addGameHistory) {
    window.addGameHistory('playerTurn', {
      player: card.name,
      result: result.description,
      points: result.points || 0,
      type: result.type
    });
  }
  
  console.log('🗑️ 移除打者卡:', card.name);
  removeCardFromHand(state, state.selected);
  
  // 檢查手牌上限再抽牌
  if (state.player.hand.length < 7) {
    const drawCount = Math.min(2, 7 - state.player.hand.length);
    console.log('🎴 抽取新牌:', drawCount, '張');
    draw(state.player, drawCount);
  } else {
    console.log('⚠️ 手牌已達上限，不抽牌');
  }
}

// 🆕 新增：增強版打擊模擬
function simulateEnhancedAtBat(batter, pitcher, state) {
  // 計算最終數值（包含所有加成）
  const finalBatterStats = calculateFinalStats(batter);
  const finalPitcherStats = calculateFinalStats(pitcher);
  
  console.log('⚾ 增強版打擊模擬:');
  console.log('  打者:', batter.name, finalBatterStats);
  console.log('  投手:', pitcher.name, finalPitcherStats);
  
  // 使用最終數值進行模擬
  const { norm } = CONFIG;
  const base = { K: 0.2, BB: 0.08, HR: 0.05, H: 0.25 };

  let pK = base.K + (finalPitcherStats.power - 75) * norm.pitcherPowerSO
                 - (finalBatterStats.contact - 75) * norm.batterContactSO;
  let pBB = base.BB - (finalPitcherStats.control - 75) * norm.controlBB;
  let pHR = base.HR + (finalBatterStats.power - 75) * norm.batterPowerHR
                  - (finalPitcherStats.power - 75) * norm.pitcherPowerHR;
  let pH = base.H + (finalBatterStats.hitRate - 75) * norm.batterHitRate
                 - (finalPitcherStats.velocity - 75) * norm.velocityHit;

  const r = Math.random();
  let c = pK;
  if (r < c) return { type: 'K', description: `${batter.name} 三振出局`, points: 0 };
  c += pBB;
  if (r < c) return { type: 'BB', description: `${batter.name} 獲得保送`, points: 1 };
  c += pHR;
  if (r < c) return { type: 'HR', description: `全壘打！${batter.name}！`, points: 4 };
  c += pH;
  if (r < c) return hitBySpeed(finalBatterStats.speed, state);
  return { type: 'OUT', description: `${batter.name} 出局`, points: 0 };
}

// 🆕 新增：計算最終數值
function calculateFinalStats(card) {
  const baseStats = { ...card.stats };
  const permanentBonus = card.permanentBonus || {};
  const tempBonus = card.tempBonus || {};
  
  const finalStats = {};
  Object.keys(baseStats).forEach(stat => {
    finalStats[stat] = baseStats[stat] + (permanentBonus[stat] || 0) + (tempBonus[stat] || 0);
    // 確保數值在合理範圍內
    finalStats[stat] = Math.max(0, Math.min(200, finalStats[stat]));
  });
  
  return finalStats;
}

// 🆕 新增：處理所有羈絆效果
function processAllSynergyEffects(state) {
  // 檢查壘上角色的羈絆效果
  state.bases.forEach((card, index) => {
    if (card && card.effects && card.effects.synergy && effectProcessor) {
      console.log(`🔗 處理羈絆效果: ${card.name} (${index + 1}壘)`);
      const synergyResult = effectProcessor.processSynergy(card);
      if (synergyResult.success) {
        console.log('✅ 羈絆效果成功:', synergyResult.description);
      }
    }
  });
  
  // 檢查特殊協同效果
  checkSpecialSynergies(state);
}

// 🆕 新增：檢查特殊協同效果
function checkSpecialSynergies(state) {
  const mygoCount = state.bases.filter(base => base && base.band === 'MyGO!!!!!').length;
  const mujicaCount = state.bases.filter(base => base && base.band === 'Mujica').length;
  
  // MyGO!!!!! 3人協同
  if (mygoCount >= 3) {
    console.log('🎵 MyGO!!!!! 協同效果觸發！');
    const tomori = [...state.player.hand, ...state.bases.filter(Boolean)]
      .find(card => card && card.name.includes('燈'));
    
    if (tomori && effectProcessor) {
      // 為燈增加協同加成
      tomori.tempBonus = tomori.tempBonus || {};
      tomori.tempBonus.power = (tomori.tempBonus.power || 0) + 20;
      console.log('✨ 燈獲得MyGO協同加成: 力量+20');
    }
  }
  
  // Ave Mujica 3人威壓
  if (mujicaCount >= 3) {
    console.log('🖤 Ave Mujica 威壓效果觸發！');
    // 對手下回合抽卡-1 的效果（需要在CPU回合實作）
    state.mujicaPressure = true;
  }
}

function removeCardFromHand(state, cardIndex) {
  if (cardIndex < 0 || cardIndex >= state.player.hand.length) {
    console.warn('⚠️ 無效的卡牌索引:', cardIndex, '手牌數量:', state.player.hand.length);
    return null;
  }
  
  const removedCard = state.player.hand.splice(cardIndex, 1)[0];
  
  // 🆕 新增：處理死聲效果
  if (removedCard.effects && removedCard.effects.death && effectProcessor) {
    console.log('💀 處理死聲效果:', removedCard.name);
    const deathResult = effectProcessor.processDeathrattle(removedCard);
    if (deathResult.success) {
      console.log('✅ 死聲效果成功:', deathResult.description);
      updateOutcomeText(`${removedCard.name} 的死聲: ${deathResult.description}`);
    }
  }
  
  state.player.discard.push(removedCard);
  
  console.log('🗑️ 成功移除卡牌:', removedCard.name, '→ 棄牌堆');
  console.log('📊 當前狀態 - 手牌:', state.player.hand.length, '棄牌:', state.player.discard.length);
  
  return removedCard;
}

// 🔧 修改：executeActionCard 函數 - 使用新效果系統
function executeActionCard(card, state, targetCard = null, targetIndex = -1) {
  let description = "";
  
  // 🆕 新增：使用效果處理器執行戰術卡
  if (effectProcessor && card.effects && card.effects.play) {
    console.log('🎭 使用效果處理器執行戰術卡:', card.name);
    
    // 如果是需要目標的卡牌，設置目標
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
    // 舊版本兼容性處理
    description = executeActionCardLegacy(card, state, targetCard, targetIndex);
  }
  
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = description;
  }
  
  return description;
}

// 🔧 修改：舊版本戰術卡執行邏輯
function executeActionCardLegacy(card, state, targetCard = null, targetIndex = -1) {
  let description = "";
  
  switch (card.name) {
    case '解散樂隊':
      let destroyedCount = 0;
      let powerBoost = 0;
      
      state.bases.forEach((baseCard, index) => {
        if (baseCard) {
          console.log('💥 解散樂隊：移除', baseCard.name);
          state.player.discard.push(baseCard);
          destroyedCount++;
        }
      });
      
      state.bases = [null, null, null];
      
      powerBoost = destroyedCount * 5; // 調整為+5 (新設計)
      
      if (powerBoost > 0) {
        [state.player.deck, state.player.hand, state.player.discard].forEach(pile => {
          pile.forEach(deckCard => {
            if (deckCard.type === 'batter') {
              deckCard.permanentBonus = deckCard.permanentBonus || {};
              ['power', 'hitRate', 'contact', 'speed'].forEach(stat => {
                deckCard.permanentBonus[stat] = (deckCard.permanentBonus[stat] || 0) + 5;
              });
            }
          });
        });
      }
      
      description = `解散樂隊！摧毀了 ${destroyedCount} 名角色，所有打者全數值永久+${powerBoost}！`;
      break;
      
    case '一輩子...':
      if (targetCard) {
        targetCard.locked = true;
        description = `${targetCard.name} 被鎖定在 ${targetIndex + 1} 壘上！一輩子...`;
        console.log('🔒 角色被鎖定:', targetCard.name, '在', targetIndex + 1, '壘');
      } else {
        description = `${card.name}: 需要選擇壘上的目標！`;
      }
      break;
      
    default:
      description = `${card.name} 戰術卡發動！`;
  }
  
  return description;
}

function startTargetSelection(card, state, handlers) {
  awaitingTargetSelection = true;
  pendingActionCard = card;
  
  window.awaitingTargetSelection = true;
  window.pendingActionCard = card;
  
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    if (card.name === '滿腦子想著自己') {
      outcomeText.textContent = `選擇手牌中的角色作為 ${card.name} 的目標... (右鍵取消)`;
    } else {
      outcomeText.textContent = `選擇壘上的角色作為 ${card.name} 的目標... (右鍵取消)`;
    }
  }
  
  highlightValidTargets(card, state);
  setupCancelTargetSelection(state, handlers);
  
  if (handlers && typeof handlers === 'object') {
    render(state, handlers);
  }
  
  console.log('🎯 開始目標選擇模式:', card.name);
}

function setupCancelTargetSelection(state, handlers) {
  const cancelHandler = (e) => {
    if (e.button === 2 || e.key === 'Escape') { 
      e.preventDefault();
      cancelTargetSelection(state, handlers);
    }
  };
  
  document.addEventListener('contextmenu', cancelHandler, { once: true });
  document.addEventListener('keydown', cancelHandler, { once: true });
  
  const clickHandler = (e) => {
    if (e.target.classList.contains('field') || e.target.classList.contains('center-field')) {
      cancelTargetSelection(state, handlers);
    }
  };
  
  document.addEventListener('click', clickHandler, { once: true });
}

function cancelTargetSelection(state, handlers) {
  console.log('❌ 主函數取消目標選擇');
  
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = `已取消 ${pendingActionCard?.name || '戰術卡'} 的使用`;
  }
  
  awaitingTargetSelection = false;
  pendingActionCard = null;
  window.awaitingTargetSelection = false;
  window.pendingActionCard = null;
  
  if (state) {
    state.selected = -1;
  }
  
  document.querySelectorAll('.base, .hand-card').forEach(element => {
    element.classList.remove('selectable-target');
  });
  
  document.removeEventListener('contextmenu', cancelTargetSelection);
  document.removeEventListener('keydown', cancelTargetSelection);
  document.removeEventListener('click', cancelTargetSelection);
  
  if (handlers && handlers.render) {
    handlers.render(state, handlers);
  } else if (render && state) {
    render(state, handlers);
  }
}

function handleHandCardSelection(cardIndex, state, handlers) {
  if (!pendingActionCard) {
    console.warn('⚠️ 沒有待處理的戰術卡');
    return;
  }
  
  const targetCard = state.player.hand[cardIndex];
  if (!targetCard || targetCard.type !== 'batter') {
    console.warn('⚠️ 選擇的手牌不是有效的打者卡');
    return;
  }
  
  console.log('🎯 手牌目標選擇確認:', targetCard.name);
  
  executeActionCard(pendingActionCard, state, targetCard, -1);
  
  if (window.addGameHistory) {
    window.addGameHistory('actionCard', {
      player: '玩家',
      card: `${pendingActionCard.name} → ${targetCard.name} (手牌)`
    });
  }
  
  const actionCardIndex = state.player.hand.findIndex(card => card === pendingActionCard);
  if (actionCardIndex !== -1) {
    console.log('🗑️ 移除戰術卡:', pendingActionCard.name);
    removeCardFromHand(state, actionCardIndex);
  }
  
  resetTargetSelection(state);
  
  if (handlers) {
    render(state, handlers);
  }
}

function handleTargetSelection(baseIndex, state, handlers) {
  if (!pendingActionCard) {
    console.warn('⚠️ 沒有待處理的戰術卡');
    return;
  }
  
  const targetCard = state.bases[baseIndex];
  if (!targetCard) {
    console.warn('⚠️ 選擇的壘包沒有角色');
    return;
  }
  
  console.log('🎯 目標選擇確認:', targetCard.name, '在', baseIndex + 1, '壘');
  
  executeActionCard(pendingActionCard, state, targetCard, baseIndex);
  
  if (window.addGameHistory) {
    window.addGameHistory('actionCard', {
      player: '玩家',
      card: `${pendingActionCard.name} → ${targetCard.name}`
    });
  }
  
  const cardIndex = state.player.hand.findIndex(card => card === pendingActionCard);
  if (cardIndex !== -1) {
    console.log('🗑️ 移除已使用的戰術卡:', pendingActionCard.name);
    removeCardFromHand(state, cardIndex);
  } else {
    console.warn('⚠️ 在手牌中找不到待處理的戰術卡');
  }
  
  resetTargetSelection(state);
  
  if (handlers && typeof handlers === 'object') {
    render(state, handlers);
  }
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
  
  document.removeEventListener('contextmenu', cancelTargetSelection);
  document.removeEventListener('keydown', cancelTargetSelection);
  document.removeEventListener('click', cancelTargetSelection);
  
  console.log('🔄 目標選擇狀態已重置');
}

function needsTargetSelection(card) {
  const targetRequiredCards = [
    '一輩子...', 
    '想成為人類',
    '滿腦子想著自己'
  ];
  
  return targetRequiredCards.includes(card.name);
}

function highlightValidTargets(card, state) {
  document.querySelectorAll('.base, .hand-card').forEach(element => {
    element.classList.remove('selectable-target');
  });
  
  console.log('💡 開始高亮目標:', card.name);
  
  if (card.name === '滿腦子想著自己') {
    state.player.hand.forEach((handCard, index) => {
      if (handCard.type === 'batter') {
        setTimeout(() => {
          const cardElement = document.querySelector(`[data-card-index="${index}"].hand-card`);
          if (cardElement) {
            cardElement.classList.add('selectable-target');
            console.log('💡 已高亮手牌:', handCard.name, 'index:', index);
          } else {
            console.warn('⚠️ 找不到手牌元素:', index);
          }
        }, 100); 
      }
    });
  } else if (card.name === '一輩子...' || card.name === '想成為人類') {
    state.bases.forEach((baseCard, index) => {
      if (baseCard) {
        const baseIds = ['first-base', 'second-base', 'third-base'];
        setTimeout(() => {
          const baseElement = document.getElementById(baseIds[index]);
          if (baseElement) {
            baseElement.classList.add('selectable-target');
            console.log('💡 已高亮壘包:', baseIds[index], baseCard.name);
          } else {
            console.warn('⚠️ 找不到壘包元素:', baseIds[index]);
          }
        }, 100);
      }
    });
  }
}

function runCpuTurn(state, handlers) {
  try {
    console.log('🤖 CPU回合開始');
    
    let cpuOuts = 0;
    let cpuBatterIndex = 0;
    const cpuResults = [];
    
    // 🆕 新增：檢查Mujica威壓效果
    let cpuDrawPenalty = 0;
    if (state.mujicaPressure) {
      cpuDrawPenalty = 1;
      console.log('🖤 Ave Mujica威壓效果：CPU本回合少抽1張牌');
      state.mujicaPressure = false; // 清除效果
    }
    
    while (cpuOuts < 3 && cpuBatterIndex < 20) {
      const batter = state.cpu.deck[cpuBatterIndex % state.cpu.deck.length];
      const result = simulateSimpleAtBat(batter, state.player.pitcher);
      
      cpuResults.push({
        batter: batter.name,
        result: result.description,
        points: result.points || 0,
        type: result.type
      });
      
      if (result.type === 'K' || result.type === 'OUT') {
        cpuOuts++;
      } else {
        state.score.away += Math.max(0, (result.points || 1) - cpuDrawPenalty);
      }
      
      cpuBatterIndex++;
    }
    
    const totalRuns = cpuResults.reduce((sum, r) => sum + r.points, 0);
    const hits = cpuResults.filter(r => r.points > 0);
    
    const outcomeText = document.getElementById('outcome-text');
    if (outcomeText) {
      let cpuResultText = `CPU回合結束：${totalRuns}分，${hits.length}支安打，${cpuOuts}個出局`;
      if (cpuDrawPenalty > 0) {
        cpuResultText += ` (受Mujica威壓影響)`;
      }
      outcomeText.textContent = cpuResultText;
    }
    
    if (window.addGameHistory) {
      window.addGameHistory('cpuInning', {
        hits: hits.length,
        runs: totalRuns,
        outs: cpuOuts,
        details: hits.map(h => h.batter).join(', ')
      });
    }
    
    console.log('✅ CPU回合完成：', { totalRuns, hits: hits.length, outs: cpuOuts });
    
    render(state, handlers);
    
    setTimeout(() => changeHalfInning(state, handlers), 800);
    
  } catch (error) {
    console.error('❌ CPU回合失敗:', error);
    showErrorMessage(`CPU回合失敗: ${error.message}`);
  }
}

function changeHalfInning(state, handlers) {
  try {
    // 🆕 新增：清除臨時效果
    // 修改：正確調用效果處理器的清理方法
    if (effectProcessor && effectProcessor.cleanupExpiredEffects) {
      effectProcessor.cleanupExpiredEffects(state, 'inning');
    }
    
    if (state.half === 'bottom') {
      applyEndOfInningPenalty(state);
    }
    
    // 清除臨時加成
    state.bases.forEach(baseCard => {
      if (baseCard && baseCard.tempBonus) {
        delete baseCard.tempBonus;
      }
    });
    
    state.player.hand.forEach(card => {
      if (card.tempBonus) {
        delete card.tempBonus;
      }
    });
    
    state.outs = 0;
    
    if (state.half === 'top') {
      state.half = 'bottom';
      state.playerTurn = true;
      
      const outcomeText = document.getElementById('outcome-text');
      if (outcomeText) {
        outcomeText.textContent = '🎵 輪到MyGO!!!!!攻擊！感受新效果的力量！';
      }
      
    } else {
      state.half = 'top';
      state.currentInning++;
      state.playerTurn = false;
      
      if (state.currentInning > CONFIG.innings) {
        const winner = state.score.home > state.score.away ? "MyGO!!!!!獲勝！" : 
                      state.score.away > state.score.home ? "Yankees獲勝！" : "平手！";
        
        const outcomeText = document.getElementById('outcome-text');
        if (outcomeText) {
          outcomeText.textContent = `🎉 比賽結束！${winner} 比數 ${state.score.away}:${state.score.home}`;
        }
        
        state.over = true;
        return;
      }
      
      const outcomeText = document.getElementById('outcome-text');
      if (outcomeText) {
        outcomeText.textContent = '⚾ 客隊攻擊中...';
      }
      
      setTimeout(() => {
        runCpuTurn(state, handlers);
      }, 1000);
    }
    
    render(state, handlers);
    
  } catch (error) {
    console.error('❌ 半局更換失敗:', error);
    showErrorMessage(`半局更換失敗: ${error.message}`);
  }
}

function simulateSimpleAtBat(batter, pitcher) {
  const random = Math.random();
  
  if (random < 0.25) { 
    return { type: 'K', description: `${batter.name} 三振出局`, points: 0 };
  } else if (random < 0.35) {
    return { type: 'OUT', description: `${batter.name} 出局`, points: 0 };
  } else if (random < 0.45) {
    return { type: 'BB', description: `${batter.name} 保送`, points: 1 };
  } else if (random < 0.52) {
    return { type: 'HR', description: `${batter.name} 全壘打！`, points: 4 };
  } else if (random < 0.65) {
    return { type: '2B', description: `${batter.name} 二壘安打`, points: 2 };
  } else if (random < 0.75) {
    return { type: '3B', description: `${batter.name} 三壘安打`, points: 3 };
  } else {
    return { type: '1B', description: `${batter.name} 一壘安打`, points: 1 };
  }
}

function processSimpleOutcome(result, state, batterCard) {
  if (result.type === 'K' || result.type === 'OUT') {
    state.outs++;
    console.log('⚾ 出局，出局數:', state.outs);
  } else {
    const pointsScored = advanceRunners(state, batterCard);
    state.score.home += pointsScored;
    
    console.log('🏃 壘包推進完成，得分:', pointsScored);
  }
}

function prepareCard(cardData) {
  const card = { ...cardData };
  
  // 🆕 新增：初始化加成欄位
  card.permanentBonus = card.permanentBonus || {};
  card.tempBonus = card.tempBonus || {};
  
  if (card.type === 'batter') {
    card.ovr = calculateBatterOVR(card.stats);
  } else if (card.type === 'pitcher') {
    card.ovr = calculatePitcherOVR(card.stats);
  } else if (card.type === 'action') {
    card.ovr = card.rarity || "戰術";
  }
  
  // 🆕 新增：應用永久效果（如果有的話）
  if (effectProcessor) {
    effectProcessor.applyPermanentEffects(card);
  }
  
  return card;
}

function calculateBatterOVR(stats) {
  const w = CONFIG.ovrWeights.batter;
  const power = stats.power ?? 50;
  const hitRate = stats.hitRate ?? 50;
  const contact = stats.contact ?? 50;
  const speed = stats.speed ?? 50;
  
  const normalizedPower = Math.max(0, Math.min(100, power));
  const normalizedHitRate = Math.max(0, Math.min(100, hitRate));
  const normalizedContact = Math.max(0, Math.min(100, contact));
  const normalizedSpeed = Math.max(0, Math.min(100, speed));
  
  const weightedAverage = (normalizedPower * w.power + normalizedHitRate * w.hitRate + 
                          normalizedContact * w.contact + normalizedSpeed * w.speed) / 
                         (w.power + w.hitRate + w.contact + w.speed);
  
  const ovr = Math.round(weightedAverage);
  return Math.max(40, Math.min(99, ovr));
}

function calculatePitcherOVR(stats) {
  const w = CONFIG.ovrWeights.pitcher;
  const power = stats.power ?? 50;
  const velocity = stats.velocity ?? 50;
  const control = stats.control ?? 50;
  const technique = stats.technique ?? 50;
  
  const normalizedPower = Math.max(0, Math.min(100, power));
  const normalizedVelocity = Math.max(0, Math.min(100, velocity));
  const normalizedControl = Math.max(0, Math.min(100, control));
  const normalizedTechnique = Math.max(0, Math.min(100, technique));
  
  const weightedAverage = (normalizedPower * w.power + normalizedVelocity * w.velocity + 
                          normalizedControl * w.control + normalizedTechnique * w.technique) / 
                         (w.power + w.velocity + w.control + w.technique);
  
  const ovr = Math.round(weightedAverage);
  return Math.max(40, Math.min(99, ovr));
}

function draw(player, numToDraw) {
  console.log('🎴 開始抽牌:', numToDraw, '張');
  console.log('📊 抽牌前 - 牌庫:', player.deck.length, '手牌:', player.hand.length, '棄牌:', player.discard.length);
  
  if (player.hand.length >= 7) {
    console.log('⚠️ 手牌已達上限 (7張)，停止抽牌');
    return;
  }
  
  const actualDrawCount = Math.min(numToDraw, 7 - player.hand.length);
  console.log('🎴 實際抽牌數量:', actualDrawCount);
  
  for (let i = 0; i < actualDrawCount; i++) {
    if (player.deck.length === 0) {
      if (player.discard.length === 0) {
        console.warn('⚠️ 牌庫和棄牌堆都是空的，無法抽牌');
        break;
      }
      
      console.log('🔄 牌庫空了，從棄牌堆重新洗牌');
      player.deck = [...player.discard];
      player.discard = [];
      shuffle(player.deck);
      console.log('🔀 重新洗牌完成，牌庫數量:', player.deck.length);
    }
    
    if (player.deck.length > 0) {
      const drawnCard = player.deck.pop();
      
      // 🆕 新增：應用永久效果到新抽的卡牌
      if (effectProcessor) {
        effectProcessor.applyPermanentEffects(drawnCard);
      }
      
      player.hand.push(drawnCard);
      console.log('🎴 抽到:', drawnCard.name);
    }
  }
  
  console.log('📊 抽牌後 - 牌庫:', player.deck.length, '手牌:', player.hand.length, '棄牌:', player.discard.length);
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
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

function advanceRunners(state, newBatter) {
  let pointsScored = 0;
  
  console.log('🏃 開始壘包推進...');
  console.log('📊 推進前:', state.bases.map(b => b ? b.name : '空'));
  
  if (state.bases[2]) {
    const thirdBaseRunner = state.bases[2];
    if (!thirdBaseRunner.locked) {
      console.log('🏠 三壘跑者回到本壘:', thirdBaseRunner.name);
      
      // 🆕 新增：處理得分角色的死聲效果
      if (thirdBaseRunner.effects && thirdBaseRunner.effects.death && effectProcessor) {
        console.log('💀 得分時觸發死聲效果:', thirdBaseRunner.name);
        const deathResult = effectProcessor.processDeathrattle(thirdBaseRunner);
        if (deathResult.success) {
          console.log('✅ 得分死聲效果成功:', deathResult.description);
        }
      }
      
      state.player.discard.push(thirdBaseRunner);
      pointsScored += 1;
      state.bases[2] = null;
    } else {
      console.log('🔒 三壘跑者被鎖定，無法得分:', thirdBaseRunner.name);
    }
  }
  
  if (state.bases[1] && !state.bases[2]) { 
    const secondBaseRunner = state.bases[1];
    if (!secondBaseRunner.locked) {
      console.log('🏃 二壘跑者推進到三壘:', secondBaseRunner.name);
      state.bases[2] = secondBaseRunner;
      state.bases[1] = null;
    } else {
      console.log('🔒 二壘跑者被鎖定，無法推進:', secondBaseRunner.name);
    }
  }
  
  if (state.bases[0] && !state.bases[1]) { 
    const firstBaseRunner = state.bases[0];
    if (!firstBaseRunner.locked) {
      console.log('🏃 一壘跑者推進到二壘:', firstBaseRunner.name);
      state.bases[1] = firstBaseRunner;
      state.bases[0] = null;
    } else {
      console.log('🔒 一壘跑者被鎖定，無法推進:', firstBaseRunner.name);
    }
  }
  
  if (!state.bases[0]) {
    console.log('🏃 新打者上一壘:', newBatter.name);
    state.bases[0] = newBatter;
    
    // 🆕 新增：處理上壘時的光環效果
    if (newBatter.effects && newBatter.effects.aura && effectProcessor) {
      console.log('🌟 上壘時觸發光環效果:', newBatter.name);
      const auraResult = effectProcessor.processAura(newBatter);
      if (auraResult.success) {
        console.log('✅ 光環效果成功:', auraResult.description);
      }
    }
  } else {
    console.log('🏠 一壘被佔，新打者直接得分:', newBatter.name);
    
    // 🆕 新增：處理直接得分的死聲效果
    if (newBatter.effects && newBatter.effects.death && effectProcessor) {
      console.log('💀 直接得分時觸發死聲效果:', newBatter.name);
      const deathResult = effectProcessor.processDeathrattle(newBatter);
      if (deathResult.success) {
        console.log('✅ 直接得分死聲效果成功:', deathResult.description);
      }
    }
    
    state.player.discard.push(newBatter);
    pointsScored += 1;
  }
  
  console.log('📊 推進後:', state.bases.map(b => b ? b.name : '空'));
  console.log('⚾ 本次得分:', pointsScored);
  
  return pointsScored;
}

function applyEndOfInningPenalty(state) {
  console.log('⚖️ 執行局末懲罰規則...');
  
  for (let i = 2; i >= 0; i--) {
    const runner = state.bases[i];
    if (runner && !runner.locked) {
      console.log(`💔 局末懲罰：移除 ${i + 1} 壘的 ${runner.name}`);
      
      // 🆕 新增：處理局末移除的死聲效果
      if (runner.effects && runner.effects.death && effectProcessor) {
        console.log('💀 局末移除時觸發死聲效果:', runner.name);
        const deathResult = effectProcessor.processDeathrattle(runner);
        if (deathResult.success) {
          console.log('✅ 局末死聲效果成功:', deathResult.description);
        }
      }
      
      state.player.discard.push(runner);
      state.bases[i] = null;
      return; 
    }
  }
  
  console.log('🔒 所有壘上跑者都被鎖定，無人被移除');
}

function hitBySpeed(speed, state) {
  let doubleChance = 0.20 + (speed - 75) * 0.002;
  let tripleChance = 0.05 + (speed - 75) * 0.001;

  // 🆕 新增：檢查動態數值修改（如喵夢的效果）
  const dynamicEffects = state.activeEffects.filter(effect => 
    effect.value === 'dynamicByScore' && effect.stat === 'speed'
  );
  
  dynamicEffects.forEach(effect => {
    if (effect.calculation) {
      const dynamicValue = effect.calculation(state);
      speed += dynamicValue;
      console.log(`${effect.source} 的動態效果: 速度+${dynamicValue}`);
    }
  });

  // 重新計算機率
  doubleChance = 0.20 + (speed - 75) * 0.002;
  tripleChance = 0.05 + (speed - 75) * 0.001;

  if (Math.random() < tripleChance) return { type: '3B', description: `三壘安打！`, points: 3 };
  if (Math.random() < doubleChance) return { type: '2B', description: `二壘安打！`, points: 2 };
  return { type: '1B', description: `一壘安打！`, points: 1 };
}

// 🆕 新增：更新結果文字的輔助函數
function updateOutcomeText(message) {
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = message;
    outcomeText.style.color = '#f39c12';
  }
}

console.log('🎮 準備啟動 MyGO!!!!! TCG Enhanced Edition...');
console.log('🆕 新功能預覽:');
console.log('  - 戰吼效果 (進場時觸發)');
console.log('  - 死聲效果 (離場時觸發)');
console.log('  - 羈絆效果 (條件觸發)');
console.log('  - 光環效果 (持續效果)');
console.log('  - 永久增強 (跨遊戲保持)');
console.log('  - 動態OVR (實時計算)');
console.log('  - 新戰術卡 (更多策略選擇)');

initializeGame();