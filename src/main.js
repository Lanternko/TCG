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
    
    // 載入新的管理器
    const gameConfigModule = await import('./data/game_config.js');
    const GAME_CONFIG = gameConfigModule.GAME_CONFIG;
    console.log('✅ Game Config 載入成功');
    
    const cardEffectsModule = await import('./engine/card_specific_effects.js');
    const CardSpecificEffects = cardEffectsModule.CardSpecificEffects;
    console.log('✅ Card Specific Effects 載入成功');
    
    const turnManagerModule = await import('./engine/turn_manager.js');
    const TurnManager = turnManagerModule.TurnManager;
    console.log('✅ Turn Manager 載入成功');
    
    const scoringManagerModule = await import('./engine/scoring_manager.js');
    const ScoringManager = scoringManagerModule.ScoringManager;
    console.log('✅ Scoring Manager 載入成功');
    
    // 將管理器掛載到 window 供全域使用
    window.GAME_CONFIG = GAME_CONFIG;
    window.managers = {};
    
    startGame();
    
  } catch (error) {
    console.error('❌ 模組載入失敗:', error);
    showErrorMessage(`載入失敗: ${error.message}`);
  }
}

/**
 * 遊戲初始化的主函式 (合併主管改動後的最終版)
 */
function startGame() {
  try {
    console.log('🎯 開始初始化增強版遊戲...');
    
    // --- 第 1 步：創建核心遊戲狀態 ---
    const state = createGameState();
    currentGameState = state;
    window.gameState = state;
    console.log('✅ 遊戲狀態創建成功');

    // --- 第 2 步：初始化所有核心管理器 (主管的新改動) ---
    // 首先，初始化最基礎的效果處理器，因為其他管理器都依賴它。
    const effectProcessor = new EffectProcessor(state);
    window.effectProcessor = effectProcessor;
    console.log('✅ 效果處理器 (EffectProcessor) 初始化完成');

    // (假設您未來會創建這些檔案與類別)
    // 接下來，初始化其他依賴效果處理器的管理器。
    // const cardEffects = new CardSpecificEffects(state, effectProcessor);
    // const turnManager = new TurnManager(state, effectProcessor);
    // const scoringManager = new ScoringManager(state, effectProcessor, cardEffects);
    
    // 將所有管理器儲存在 window 物件上，方便全域調用與偵錯。
    // window.managers = {
    //   cardEffects,
    //   turnManager,
    //   scoringManager
    // };
    // console.log('✅ 所有遊戲管理器初始化完成');

    // --- 第 3 步：準備隊伍資料與 UI 互動 ---
    const mygoTeam = TEAMS.find(team => team.id === "MGO");
    if (!mygoTeam) {
      throw new Error('找不到MyGO隊伍資料');
    }
    console.log('✅ MyGO隊伍確認:', mygoTeam.name);
    
    // 創建一個 handlers 物件，專門用來處理所有來自 UI 的事件
    // 例如：點擊、拖拽等。
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
      render: render // 將 render 函式也放入 handlers，方便跨模組呼叫
    };
    
    // --- 第 4 步：設定全域變數與啟動 UI ---
    currentHandlers = handlers;
    window.currentHandlers = handlers;
    window.handleHandCardSelection = handleHandCardSelection;
    window.cancelTargetSelection = cancelTargetSelection;
    
    // 設定拖拽區域的事件監聽
    setupDragDropZones(handlers);
    
    // 綁定主按鈕的點擊事件
    const mainButton = document.getElementById('main-button');
    if (mainButton) {
      mainButton.onclick = handlers.button;
    }
    
    // 執行第一次的畫面渲染
    render(state, handlers);
    
    // --- 第 5 步：完成初始化 ---
    gameInitialized = true;
    console.log('🎉 增強版遊戲初始化完成！');
    
    const outcomeText = document.getElementById('outcome-text');
    if (outcomeText) {
      outcomeText.textContent = '🎸 MyGO!!!!! Enhanced Edition 準備就緒！點擊 Play Ball 開始遊戲！';
    }
    
  } catch (error) {
    // 錯誤處理
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

// 修改：initDecks 函數 - 使用新的配置
function initDecks(state, handlers) {
 try {
   console.log('🎯 初始化牌組...');
   
   const playerTeam = TEAMS.find(team => team.id === "MGO");
   state.player.team = playerTeam;
   state.player.deck = [...playerTeam.batters, ...playerTeam.actionCards].map(prepareCard);
   shuffle(state.player.deck);
   state.player.hand = [];
   state.player.pitcher = prepareCard(playerTeam.pitchers[0]);
   
   // 使用配置的起始手牌數
   draw(state.player, window.GAME_CONFIG.HAND.STARTING_DRAW);
   
   const cpuTeam = TEAMS.find(team => team.id === "NYY");
   state.cpu.team = cpuTeam;
   state.cpu.deck = [...cpuTeam.batters].map(prepareCard);
   state.cpu.activePitcher = prepareCard(cpuTeam.pitchers[0]);
   
   console.log('✅ 牌組初始化完成');
   
   const outcomeText = document.getElementById('outcome-text');
   if (outcomeText) {
     outcomeText.textContent = '🎵 MyGO!!!!! vs Yankees - 客隊先攻！';
   }
   
   // 使用回合管理器開始CPU回合
   window.managers.turnManager.startTurn(false);
   setTimeout(() => runCpuTurn(state, handlers), 1000);
   
 } catch (error) {
   console.error('❌ 牌組初始化失敗:', error);
   showErrorMessage(`牌組初始化失敗: ${error.message}`);
 }
}

/**
 * 執行玩家回合的主要函式 (完整重寫版)
 * @param {object} state - 當前的遊戲狀態物件
 * @param {object} handlers - 包含所有UI互動處理器的物件
 */
// 修改：runPlayerTurn 函數 - 使用新的管理器
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
     // 處理戰吼效果
     handleBattlecry(card);
     
     // 進行打擊
     const result = simulateAtBat(card, state.cpu.activePitcher, state);
     
     // 使用新的得分管理器處理結果
     const scoreResult = window.managers.scoringManager.processAtBatResult(result, card);
     
     // 更新UI
     updateOutcomeText(scoreResult.description);
     
     // 移除卡牌
     removeCardFromHand(state, cardIndex);
     
     // 使用回合管理器處理打牌後邏輯
     window.managers.turnManager.afterCardPlayed('batter');
     
   } else if (card.type === 'action') {
     // 處理戰術卡
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
   if (state.outs >= window.GAME_CONFIG.FLOW.OUTS_PER_INNING) {
     setTimeout(() => changeHalfInning(state, handlers), 1500);
   }
   
 } catch (error) {
   console.error('❌ 玩家回合執行失敗:', error);
   showErrorMessage(`玩家回合出錯: ${error.message}`);
 }
}

// 新增：處理戰吼效果
function handleBattlecry(card) {
 if (!card.effects || !card.effects.play) return;
 
 const cardEffects = window.managers.cardEffects;
 let result;
 
 // 使用個別卡牌效果處理器
 switch (card.name) {
   case '愛音':
     result = cardEffects.playAnon(card);
     break;
   case '樂奈':
     result = cardEffects.playRana(card);
     break;
   case '立希':
     result = cardEffects.playTaki(card);
     if (result.needsTarget) {
       // 需要目標選擇
       startTargetSelection(card, currentGameState, currentHandlers);
       return;
     }
     break;
   case '喵夢':
     result = cardEffects.playNyamu(card);
     break;
   case '海鈴':
     result = cardEffects.playUmirin(card);
     break;
   case '祥子':
     result = cardEffects.playSaki(card);
     break;
   case '初華':
     result = cardEffects.playUika(card);
     break;
   default:
     // 使用通用效果處理器
     if (effectProcessor.processBattlecry) {
       result = effectProcessor.processBattlecry(card);
     }
 }
 
 if (result && result.success) {
   console.log('✅ 戰吼效果:', result.description);
 }
}

// 修復問題1：確保卡牌移除後正確抽牌和渲染
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
  
  // 🔧 修復：確保在手牌移除後立即抽牌和渲染
  setTimeout(() => {
    // 檢查手牌上限再抽牌
    const currentHandSize = state.player.hand.length;
    const maxHandSize = 7;
    
    if (currentHandSize < maxHandSize) {
      const drawCount = Math.min(2, maxHandSize - currentHandSize);
      console.log('🎴 抽取新牌:', drawCount, '張');
      draw(state.player, drawCount);
    } else {
      console.log('⚠️ 手牌已達上限，不抽牌');
    }
    
    // 🔧 修復：強制重新渲染確保UI更新
    if (handlers && handlers.render) {
      handlers.render(state, handlers);
    }
  }, 100); // 延遲100ms確保狀態更新完成
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
  if (r < c) {
    console.log('  結果: 三振');
    return { 
      type: 'K', 
      description: `${batter.name} 三振出局`,
      points: 0,
      advancement: 0  // 新增
    };
  }
  
  c += pBB;
  if (r < c) {
    console.log('  結果: 保送');
    return { 
      type: 'BB', 
      description: `${batter.name} 獲得保送`,
      points: 1,
      advancement: 1  // 新增
    };
  }
  
  c += pHR;
  if (r < c) {
    console.log('  結果: 全壘打');
    return { 
      type: 'HR', 
      description: `全壘打！${batter.name}！`,
      points: 4,
      advancement: 4  // 新增
    };
  }
  
  c += pH;
  if (r < c) {
    console.log('  結果: 安打，檢查速度');
    return hitBySpeed(modifiedBatter.stats.speed, state, batter);
  }
  
  console.log('  結果: 出局');
  return { 
    type: 'OUT', 
    description: `${batter.name} 出局`,
    points: 0,
    advancement: 0  // 新增
  };
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

// 修改：removeCardFromHand 函數 - 強制觸發死聲效果
function removeCardFromHand(state, cardIndex) {
  if (cardIndex < 0 || cardIndex >= state.player.hand.length) {
    console.warn('⚠️ 無效的卡牌索引:', cardIndex, '手牌數量:', state.player.hand.length);
    return null;
  }
  
  const removedCard = state.player.hand.splice(cardIndex, 1)[0];
  
  // 修改：強制檢查死聲效果
  if (removedCard.effects?.death && effectProcessor) {
    console.log('💀 強制處理死聲效果:', removedCard.name);
    const deathResult = effectProcessor.processDeathrattle(removedCard);
    if (deathResult.success) {
      console.log('✅ 死聲效果成功:', deathResult.description);
      updateOutcomeText(`${removedCard.name} 的死聲: ${deathResult.description}`);
    } else {
      console.log('❌ 死聲效果失敗:', deathResult.reason);
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
  if (effectProcessor && card.effects?.play) {
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

// 修改：changeHalfInning 函數 - 使用回合管理器
function changeHalfInning(state, handlers) {
 try {
   const turnManager = window.managers.turnManager;
   const result = turnManager.changeHalfInning();
   
   const outcomeText = document.getElementById('outcome-text');
   
   switch (result) {
     case 'player_turn':
       // 開始玩家回合
       turnManager.startTurn(true);
       if (outcomeText) {
         outcomeText.textContent = '🎵 輪到MyGO!!!!!攻擊！';
       }
       break;
       
     case 'cpu_turn':
       // 開始CPU回合
       turnManager.startTurn(false);
       if (outcomeText) {
         outcomeText.textContent = '⚾ 客隊攻擊中...';
       }
       setTimeout(() => runCpuTurn(state, handlers), 1000);
       break;
       
     case 'game_over':
       // 遊戲結束
       handleGameOver(state);
       break;
   }
   
   render(state, handlers);
   
 } catch (error) {
   console.error('❌ 半局更換失敗:', error);
   showErrorMessage(`半局更換失敗: ${error.message}`);
 }
}

// 新增：處理遊戲結束
function handleGameOver(state) {
 state.over = true;
 
 const winner = state.score.home > state.score.away ? "MyGO!!!!!獲勝！" : 
               state.score.away > state.score.home ? "Yankees獲勝！" : "平手！";
 
 const outcomeText = document.getElementById('outcome-text');
 if (outcomeText) {
   outcomeText.textContent = `🎉 比賽結束！${winner} 比數 ${state.score.away}:${state.score.home}`;
 }
 
 // 顯示重新開始按鈕
 const restartButton = document.getElementById('restart-button');
 if (restartButton) {
   restartButton.style.display = 'block';
   restartButton.onclick = () => location.reload();
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

// 修改：processSimpleOutcome 函數 - 修復得分計算
function processSimpleOutcome(result, state, batterCard) {
  console.log('⚾ 處理打擊結果:', result.type);
  
  if (result.type === 'K' || result.type === 'OUT') {
    state.outs++;
    console.log('❌ 出局，出局數:', state.outs);
    
    // 🆕 新增：處理死聲效果
    if (batterCard.effects && batterCard.effects.death && effectProcessor) {
      console.log('💀 觸發死聲效果:', batterCard.name);
      const deathResult = effectProcessor.processDeathrattle(batterCard);
      if (deathResult.success) {
        console.log('✅ 死聲效果成功:', deathResult.description);
        updateOutcomeText(`${batterCard.name} 的死聲: ${deathResult.description}`);
      }
    }
  } else {
    // 🔧 修復：確保使用 result 中的 adv 或計算正確的推進距離
    let advancement = result.adv || 1;
    
    // 根據結果類型確定推進距離
    switch (result.type) {
      case 'HR':
        advancement = 4;
        break;
      case '3B':
        advancement = 3;
        break;
      case '2B':
        advancement = 2;
        break;
      case '1B':
      case 'BB':
        advancement = 1;
        break;
    }
    
    console.log(`🏃 ${result.type} - 推進距離: ${advancement}`);
    
    // 🔧 修復：正確計算並更新得分
    const pointsScored = advanceRunners(state, batterCard, advancement);
    state.score.home += pointsScored;
    
    // 🆕 新增：根據打擊結果類型添加額外得分
    if (result.type === 'HR') {
      // 全壘打：打者本身也得分
      state.score.home += 1;
      console.log('🏠 全壘打！額外得1分');
    }
    
    console.log('📊 得分更新 - 本次得分:', pointsScored, '總分:', state.score.home);
  }
}

// 修改：advanceRunners 函數 - 修正壘包推進和得分邏輯
function advanceRunners(state, newBatter, advancement = 1) {
  let pointsScored = 0;
  
  console.log('🏃 開始壘包推進...');
  console.log('📊 推進前:', state.bases.map(b => b ? b.name : '空'));
  console.log('🎯 推進距離:', advancement);
  
  // 從三壘開始處理（從後往前）
  for (let i = 2; i >= 0; i--) {
    const runner = state.bases[i];
    if (runner) {
      const newPosition = i + advancement;
      
      if (newPosition >= 3) {
        // 得分
        if (!runner.locked) {
          console.log(`🏠 ${runner.name} 從 ${i + 1} 壘得分！`);
          
          // 🆕 新增：處理得分時的死聲效果
          if (runner.effects && runner.effects.death && effectProcessor) {
            console.log('💀 得分時觸發死聲效果:', runner.name);
            effectProcessor.processDeathrattle(runner);
          }
          
          state.player.discard.push(runner);
          pointsScored++;
          state.bases[i] = null;
        } else {
          console.log(`🔒 ${runner.name} 被鎖定，無法得分`);
        }
      } else {
        // 推進到新壘包
        if (!runner.locked) {
          if (!state.bases[newPosition]) {
            console.log(`🏃 ${runner.name} 從 ${i + 1} 壘推進到 ${newPosition + 1} 壘`);
            state.bases[newPosition] = runner;
            state.bases[i] = null;
          } else {
            // 壘包擁擠，檢查是否可以繼續推進
            if (newPosition + 1 <= 2 && !state.bases[newPosition + 1]) {
              console.log(`🏃 ${runner.name} 因壘包擁擠，推進到 ${newPosition + 2} 壘`);
              state.bases[newPosition + 1] = runner;
              state.bases[i] = null;
            } else {
              // 無法推進，得分
              console.log(`🏠 ${runner.name} 因壘包擁擠得分！`);
              
              // 🆕 新增：處理得分時的死聲效果
              if (runner.effects && runner.effects.death && effectProcessor) {
                effectProcessor.processDeathrattle(runner);
              }
              
              state.player.discard.push(runner);
              pointsScored++;
              state.bases[i] = null;
            }
          }
        } else {
          console.log(`🔒 ${runner.name} 被鎖定，無法推進`);
        }
      }
    }
  }
  
  // 放置新打者
  if (advancement === 4) {
    // 全壘打：新打者不上壘，直接計入棄牌堆
    console.log(`🏠 ${newBatter.name} 全壘打，直接得分！`);
    state.player.discard.push(newBatter);
    // 注意：全壘打得分已在 processSimpleOutcome 中處理
  } else {
    // 其他情況：嘗試將新打者放到對應壘包
    const targetBase = advancement - 1; // 0=1B, 1=2B, 2=3B
    if (targetBase >= 0 && targetBase <= 2 && !state.bases[targetBase]) {
      console.log(`🏃 ${newBatter.name} 上 ${targetBase + 1} 壘`);
      state.bases[targetBase] = newBatter;
    } else {
      // 目標壘包被佔用，嘗試下一個壘包
      let placed = false;
      for (let i = targetBase + 1; i <= 2; i++) {
        if (!state.bases[i]) {
          console.log(`🏃 ${newBatter.name} 因壘包擁擠，上 ${i + 1} 壘`);
          state.bases[i] = newBatter;
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        // 所有壘包都滿了，新打者得分
        console.log(`🏠 ${newBatter.name} 因壘包滿而直接得分！`);
        state.player.discard.push(newBatter);
        pointsScored++;
      }
    }
  }
  
  console.log('📊 推進後:', state.bases.map(b => b ? b.name : '空'));
  console.log('⚾ 本次得分:', pointsScored);
  
  return pointsScored;
}

// 修改：prepareCard 函數 - 確保永久加成被正確應用
function prepareCard(cardData) {
  const card = { ...cardData };
  
  // 🆕 新增：初始化加成欄位
  card.permanentBonus = card.permanentBonus || {};
  card.tempBonus = card.tempBonus || {};
  
  // 計算基礎 OVR
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
    
    // 🔧 修復：確保永久加成被應用到計算後的數值
    if (card.permanentBonus && Object.keys(card.permanentBonus).length > 0) {
      console.log(`📊 ${card.name} 的永久加成:`, card.permanentBonus);
    }
  }
  
  return card;
}

// 修改：draw 函數 - 確保抽牌時應用永久效果
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
        
        // 🔧 修復：確保永久加成被保留
        if (drawnCard.permanentBonus && Object.keys(drawnCard.permanentBonus).length > 0) {
          console.log(`✨ ${drawnCard.name} 保留永久加成:`, drawnCard.permanentBonus);
        }
      }
      
      player.hand.push(drawnCard);
      console.log('🎴 抽到:', drawnCard.name);
    }
  }
  
  console.log('📊 抽牌後 - 牌庫:', player.deck.length, '手牌:', player.hand.length, '棄牌:', player.discard.length);
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
  const dynamicEffects = state.activeEffects?.filter(effect => 
    effect.value === 'dynamicByScore' && effect.stat === 'speed'
  ) ?? [];
  
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