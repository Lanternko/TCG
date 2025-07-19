// src/main.js - 綜合修復版本
console.log('🎮 MyGO!!!!! TCG 主檔案載入中...');

let CONFIG, TEAMS, createGameState, render;
let gameInitialized = false;
let draggedCard = null;
let draggedCardIndex = -1;
let awaitingTargetSelection = false;
let pendingActionCard = null;
// 🆕 新增：全域遊戲狀態引用，供 UI 模組使用
let currentGameState = null;
let currentHandlers = null;
// 🆕 新增：暴露到 window 物件供跨模組使用
window.awaitingTargetSelection = false;
window.pendingActionCard = null;
window.gameState = null;
window.handleHandCardSelection = null;

async function initializeGame() {
  try {
    console.log('📦 開始載入遊戲模組...');
    
    const configModule = await import('./data/config.js');
    CONFIG = configModule.CONFIG;
    console.log('✅ Config 載入成功');
    
    const teamsModule = await import('./data/teams.js');
    TEAMS = teamsModule.TEAMS;
    console.log('✅ Teams 載入成功:', TEAMS.length, '個隊伍');
    
    const gameStateModule = await import('./engine/game_state.js');
    createGameState = gameStateModule.createGameState;
    console.log('✅ Game State 載入成功');
    
    const uiModule = await import('./ui/ui.js');
    render = uiModule.render;
    console.log('✅ UI 載入成功');
    
    // 🆕 新增：初始化UI增強功能
    if (uiModule.initializeCancelFunctionality) {
      uiModule.initializeCancelFunctionality();
    }
    
    startGame();
    
  } catch (error) {
    console.error('❌ 模組載入失敗:', error);
    showErrorMessage(`載入失敗: ${error.message}`);
  }
}

// 🔧 修改：startGame 函數 - 正確暴露所有必要函數
function startGame() {
  try {
    console.log('🎯 開始初始化遊戲...');
    
    const state = createGameState();
    currentGameState = state;
    window.gameState = state;
    
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
      
      // 🆕 新增：添加 render 到 handlers 中
      render: render
    };
    
    currentHandlers = handlers;
    
    // 🔧 修復：暴露所有必要函數到 window
    window.handleHandCardSelection = handleHandCardSelection;
    window.cancelTargetSelection = cancelTargetSelection;
    window.currentHandlers = handlers;
    
    setupDragDropZones(handlers);
    render(state, handlers);
    
    const mainButton = document.getElementById('main-button');
    if (mainButton) {
      mainButton.onclick = handlers.button;
    }
    
    console.log('🎉 遊戲初始化完成！');
    gameInitialized = true;
    
    const outcomeText = document.getElementById('outcome-text');
    if (outcomeText) {
      outcomeText.textContent = '🎸 MyGO!!!!! 準備就緒！點擊 Play Ball 開始遊戲！';
    }
    
  } catch (error) {
    console.error('❌ 遊戲初始化失敗:', error);
    showErrorMessage(`初始化失敗: ${error.message}`);
  }
}

function setupDragDropZones(handlers) {
  // 設置打擊位置作為拖拽目標
  const batterZone = document.getElementById('batter-zone');
  if (batterZone) {
    // 清除舊的事件監聽器
    batterZone.replaceWith(batterZone.cloneNode(true));
    const newBatterZone = document.getElementById('batter-zone');
    
    newBatterZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      newBatterZone.classList.add('drag-over');
    });
    
    newBatterZone.addEventListener('dragleave', (e) => {
      // 只有當滑鼠真正離開區域時才移除樣式
      if (!newBatterZone.contains(e.relatedTarget)) {
        newBatterZone.classList.remove('drag-over');
      }
    });
    
    newBatterZone.addEventListener('drop', (e) => {
      e.preventDefault();
      newBatterZone.classList.remove('drag-over');
      
      const cardIndex = parseInt(e.dataTransfer.getData('text/plain'));
      if (cardIndex !== -1 && !isNaN(cardIndex)) {
        console.log('🎯 拖拽到打擊區:', cardIndex);
        handlers.dragToBatter(cardIndex);
      }
    });
    
    // 右鍵取消
    newBatterZone.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (window.awaitingTargetSelection) {
        window.cancelTargetSelection(window.gameState, handlers);
      }
    });
  }
  
  // 設置中央場地的右鍵取消
  const centerField = document.querySelector('.center-field');
  if (centerField) {
    centerField.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (window.awaitingTargetSelection) {
        window.cancelTargetSelection(window.gameState, handlers);
      }
    });
  }
}

// 🔧 修改：initDecks 函數 - 傳遞 handlers
function initDecks(state, handlers) {
  try {
    console.log('🎯 初始化牌組...');
    
    const playerTeam = TEAMS.find(team => team.id === "MGO");
    state.player.team = playerTeam;
    state.player.deck = [...playerTeam.batters, ...playerTeam.actionCards].map(prepareCard);
    shuffle(state.player.deck);
    state.player.hand = [];
    state.player.pitcher = prepareCard(playerTeam.pitchers[0]);
    
    // 🔧 修復：起手 5 張卡
    draw(state.player, 5);
    
    const cpuTeam = TEAMS.find(team => team.id === "NYY");
    state.cpu.team = cpuTeam;
    state.cpu.deck = [...cpuTeam.batters].map(prepareCard);
    state.cpu.activePitcher = prepareCard(cpuTeam.pitchers[0]);
    
    console.log('✅ 牌組初始化完成');
    console.log('  - 玩家手牌:', state.player.hand.length, '張');
    console.log('  - 玩家牌組:', state.player.deck.length, '張');
    console.log('  - CPU牌組:', state.cpu.deck.length, '張');
    
    const outcomeText = document.getElementById('outcome-text');
    if (outcomeText) {
      outcomeText.textContent = '🎵 MyGO!!!!! vs Yankees - 客隊先攻！';
    }
    
    setTimeout(() => {
      runCpuTurn(state, handlers);
    }, 1000);
    
  } catch (error) {
    console.error('❌ 牌組初始化失敗:', error);
    showErrorMessage(`牌組初始化失敗: ${error.message}`);
  }
}

// 🔧 修改：runPlayerTurn 函數 - 確保手牌上限檢查
function runPlayerTurn(state, handlers) {
  try {
    const card = state.player.hand[state.selected];
    if (!card) {
      console.warn('⚠️ 沒有選中的卡牌');
      return;
    }
    
    console.log('🎯 玩家回合:', card.name, '類型:', card.type);
    
    if (card.type === 'batter') {
      // 打者卡：進行打擊
      const result = simulateSimpleAtBat(card, state.cpu.activePitcher);
      processSimpleOutcome(result, state, card);
      
      const outcomeText = document.getElementById('outcome-text');
      if (outcomeText) {
        outcomeText.textContent = result.description;
      }
      
      // 移除卡牌
      console.log('🗑️ 移除打者卡:', card.name);
      removeCardFromHand(state, state.selected);
      
      // 🔧 修復：檢查手牌上限再抽牌
      if (state.player.hand.length < 7) {
        const drawCount = Math.min(2, 7 - state.player.hand.length);
        console.log('🎴 抽取新牌:', drawCount, '張');
        draw(state.player, drawCount);
      } else {
        console.log('⚠️ 手牌已達上限，不抽牌');
      }
      
    } else if (card.type === 'action') {
      // 戰術卡：檢查是否需要選擇目標
      if (needsTargetSelection(card)) {
        startTargetSelection(card, state, handlers);
        return; // 等待目標選擇，不移除卡牌
      } else {
        // 直接執行戰術卡
        console.log('🎭 執行戰術卡:', card.name);
        executeActionCard(card, state);
        
        // 移除戰術卡（戰術卡不抽牌）
        console.log('🗑️ 移除戰術卡:', card.name);
        removeCardFromHand(state, state.selected);
      }
    }
    
    // 重置選擇狀態
    state.selected = -1;
    console.log('✅ 玩家回合完成，手牌數量:', state.player.hand.length);
    
    // 重新渲染以更新UI
    render(state, handlers);
    
    if (state.outs >= 3) {
      setTimeout(() => changeHalfInning(state, handlers), 1500);
    }
    
  } catch (error) {
    console.error('❌ 玩家回合失敗:', error);
    showErrorMessage(`玩家回合失敗: ${error.message}`);
  }
}

// 🔧 修改：removeCardFromHand 函數 - 確保正確移除
function removeCardFromHand(state, cardIndex) {
  if (cardIndex < 0 || cardIndex >= state.player.hand.length) {
    console.warn('⚠️ 無效的卡牌索引:', cardIndex, '手牌數量:', state.player.hand.length);
    return null;
  }
  
  const removedCard = state.player.hand.splice(cardIndex, 1)[0];
  state.player.discard.push(removedCard);
  
  console.log('🗑️ 成功移除卡牌:', removedCard.name, '→ 棄牌堆');
  console.log('📊 當前狀態 - 手牌:', state.player.hand.length, '棄牌:', state.player.discard.length);
  
  return removedCard;
}


// 🔧 修改：startTargetSelection 函數 - 添加取消功能
function startTargetSelection(card, state, handlers) {
  awaitingTargetSelection = true;
  pendingActionCard = card;
  
  // 同步更新 window 物件
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
  
  // 🆕 新增：添加取消選擇的監聽器
  setupCancelTargetSelection(state, handlers);
  
  if (handlers && typeof handlers === 'object') {
    render(state, handlers);
  }
  
  console.log('🎯 開始目標選擇模式:', card.name);
}

// 🆕 新增：取消目標選擇功能
function setupCancelTargetSelection(state, handlers) {
  const cancelHandler = (e) => {
    if (e.button === 2 || e.key === 'Escape') { // 右鍵或 ESC 鍵
      e.preventDefault();
      cancelTargetSelection(state, handlers);
    }
  };
  
  document.addEventListener('contextmenu', cancelHandler, { once: true });
  document.addEventListener('keydown', cancelHandler, { once: true });
  
  // 點擊空白區域也可以取消
  const clickHandler = (e) => {
    if (e.target.classList.contains('field') || e.target.classList.contains('center-field')) {
      cancelTargetSelection(state, handlers);
    }
  };
  
  document.addEventListener('click', clickHandler, { once: true });
}

// 🆕 新增：cancelTargetSelection 函數 - 暴露到 main.js
function cancelTargetSelection(state, handlers) {
  console.log('❌ 主函數取消目標選擇');
  
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = `已取消 ${pendingActionCard?.name || '戰術卡'} 的使用`;
  }
  
  // 重置狀態
  awaitingTargetSelection = false;
  pendingActionCard = null;
  window.awaitingTargetSelection = false;
  window.pendingActionCard = null;
  
  if (state) {
    state.selected = -1;
  }
  
  // 清除高亮
  document.querySelectorAll('.base, .hand-card').forEach(element => {
    element.classList.remove('selectable-target');
  });
  
  // 移除事件監聽器
  document.removeEventListener('contextmenu', cancelTargetSelection);
  document.removeEventListener('keydown', cancelTargetSelection);
  document.removeEventListener('click', cancelTargetSelection);
  
  // 重新渲染
  if (handlers && handlers.render) {
    handlers.render(state, handlers);
  } else if (render && state) {
    render(state, handlers);
  }
}

// 🔧 修改：handleHandCardSelection 函數 - 確保正確選擇
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
  
  // 執行戰術卡效果
  executeActionCard(pendingActionCard, state, targetCard, -1);
  
  // 移除戰術卡（不是目標卡）
  const actionCardIndex = state.player.hand.findIndex(card => card === pendingActionCard);
  if (actionCardIndex !== -1) {
    console.log('🗑️ 移除戰術卡:', pendingActionCard.name);
    removeCardFromHand(state, actionCardIndex);
  }
  
  // 重置選擇狀態
  resetTargetSelection(state);
  
  // 重新渲染
  if (handlers) {
    render(state, handlers);
  }
}

// 🔧 修改：handleTargetSelection 函數 - 修復目標選擇後的卡牌移除
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
  
  console.log('🎯 目標選擇:', targetCard.name, '在', baseIndex + 1, '壘');
  
  // 執行戰術卡效果
  executeActionCard(pendingActionCard, state, targetCard, baseIndex);
  
  // 🔧 修復：找到並移除手牌中的戰術卡
  const cardIndex = state.player.hand.findIndex(card => card === pendingActionCard);
  if (cardIndex !== -1) {
    console.log('🗑️ 移除已使用的戰術卡:', pendingActionCard.name);
    removeCardFromHand(state, cardIndex);
  } else {
    console.warn('⚠️ 在手牌中找不到待處理的戰術卡');
  }
  
  // 重置選擇狀態
  resetTargetSelection(state);
  
  // 重新渲染UI
  if (handlers && typeof handlers === 'object') {
    render(state, handlers);
  }
}

// 🔧 修改：resetTargetSelection 函數 - 清理所有監聽器
function resetTargetSelection(state) {
  awaitingTargetSelection = false;
  pendingActionCard = null;
  state.selected = -1;
  
  // 同步更新 window 物件
  window.awaitingTargetSelection = false;
  window.pendingActionCard = null;
  
  // 清除目標高亮
  document.querySelectorAll('.base, .hand-card').forEach(element => {
    element.classList.remove('selectable-target');
  });
  
  // 移除所有臨時事件監聽器
  document.removeEventListener('contextmenu', cancelTargetSelection);
  document.removeEventListener('keydown', cancelTargetSelection);
  document.removeEventListener('click', cancelTargetSelection);
  
  console.log('🔄 目標選擇狀態已重置');
}

// 🔧 修改：needsTargetSelection 函數 - 支援手牌目標選擇
function needsTargetSelection(card) {
  const targetRequiredCards = [
    '一輩子',        // 需要選擇壘上目標
    '想成為人類',    // 需要選擇壘上目標
    '滿腦子想著自己' // 需要選擇手牌目標
  ];
  
  return targetRequiredCards.includes(card.name);
}

// 🔧 修改：highlightValidTargets 函數 - 確保高亮生效
function highlightValidTargets(card, state) {
  // 清除舊的高亮
  document.querySelectorAll('.base, .hand-card').forEach(element => {
    element.classList.remove('selectable-target');
  });
  
  console.log('💡 開始高亮目標:', card.name);
  
  if (card.name === '滿腦子想著自己') {
    // 高亮手牌中的打者卡
    state.player.hand.forEach((handCard, index) => {
      if (handCard.type === 'batter') {
        // 使用更可靠的選擇器
        setTimeout(() => {
          const cardElement = document.querySelector(`[data-card-index="${index}"].hand-card`);
          if (cardElement) {
            cardElement.classList.add('selectable-target');
            console.log('💡 已高亮手牌:', handCard.name, 'index:', index);
          } else {
            console.warn('⚠️ 找不到手牌元素:', index);
          }
        }, 100); // 延遲確保 DOM 已更新
      }
    });
  } else if (card.name === '一輩子' || card.name === '想成為人類') {
    // 高亮壘上的角色
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




// 🔧 修改：executeActionCard 函數 - 支援「滿腦子想著自己」
function executeActionCard(card, state, targetCard = null, targetIndex = -1) {
  let description = "";
  
  switch (card.name) {
    case '一輩子':
      if (targetCard) {
        targetCard.locked = true;
        description = `${targetCard.name} 被鎖定在 ${targetIndex + 1} 壘上！一輩子...`;
        console.log('🔒 角色被鎖定:', targetCard.name, '在', targetIndex + 1, '壘');
      } else {
        description = `${card.name}: 需要選擇壘上的目標！`;
      }
      break;
      
    case '滿腦子想著自己':
      if (targetCard) {
        // 目標角色獲得巨大力量加成
        targetCard.tempBonus = targetCard.tempBonus || {};
        targetCard.tempBonus.power = (targetCard.tempBonus.power || 0) + 40;
        
        // 手牌中其他角色專注-20
        state.player.hand.forEach(handCard => {
          if (handCard.type === 'batter' && handCard !== targetCard) {
            handCard.tempBonus = handCard.tempBonus || {};
            handCard.tempBonus.contact = (handCard.tempBonus.contact || 0) - 20;
          }
        });
        
        description = `${targetCard.name} 成為獨奏者(力量+40)，其他角色專注-20`;
        console.log('🎭 滿腦子想著自己:', targetCard.name, '力量+40');
      } else {
        description = `${card.name}: 需要選擇手牌中的角色！`;
      }
      break;
      
    case "It's MyGO!!!!!":
      let affectedCount = 0;
      state.bases.forEach(baseCard => {
        if (baseCard && baseCard.band === 'MyGO!!!!!') {
          baseCard.tempBonus = baseCard.tempBonus || {};
          baseCard.tempBonus.power = (baseCard.tempBonus.power || 0) + 15;
          baseCard.tempBonus.hitRate = (baseCard.tempBonus.hitRate || 0) + 15;
          baseCard.tempBonus.contact = (baseCard.tempBonus.contact || 0) + 15;
          baseCard.tempBonus.speed = (baseCard.tempBonus.speed || 0) + 15;
          affectedCount++;
        }
      });
      description = `It's MyGO!!!!! - ${affectedCount}名成員全數值+15！`;
      break;
      
    case '想成為人類':
      if (targetCard) {
        // 清除負面效果並設置速度
        if (targetCard.tempBonus) {
          Object.keys(targetCard.tempBonus).forEach(stat => {
            if (targetCard.tempBonus[stat] < 0) {
              delete targetCard.tempBonus[stat];
            }
          });
        }
        targetCard.tempBonus = targetCard.tempBonus || {};
        targetCard.tempBonus.speed = 99;
        description = `${targetCard.name} 想成為人類！移除負面狀態，速度設為 99！`;
      } else {
        description = `${card.name}: 需要選擇目標！`;
      }
      break;
      
    case '小祥小祥小祥':
      const sakiCard = state.player.deck.find(deckCard => 
        deckCard.name && deckCard.name.includes('祥子')
      );
      
      if (sakiCard) {
        const sakiIndex = state.player.deck.indexOf(sakiCard);
        state.player.deck.splice(sakiIndex, 1);
        state.player.hand.push(sakiCard);
        description = `${card.name}: 找到了祥子！加入手牌。`;
      } else {
        draw(state.player, 2);
        description = `${card.name}: 祥子不在牌庫中，改為抽兩張卡。`;
      }
      break;
      
    default:
      description = `${card.name} 戰術卡發動！`;
  }
  
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = description;
  }
}


// 🔧 修改：runCpuTurn 函數 - 加速 CPU 回合
function runCpuTurn(state, handlers) {
  try {
    console.log('🤖 CPU回合開始');
    
    let cpuOuts = 0;
    let cpuBatterIndex = 0;
    const cpuResults = []; // 記錄所有結果
    
    // 🔧 修復：立即執行所有 CPU 打擊，不使用間隔
    while (cpuOuts < 3 && cpuBatterIndex < 20) { // 限制最多 20 次打擊避免無限循環
      const batter = state.cpu.deck[cpuBatterIndex % state.cpu.deck.length];
      const result = simulateSimpleAtBat(batter, state.player.pitcher);
      
      cpuResults.push({
        batter: batter.name,
        result: result.description,
        points: result.points || 0
      });
      
      if (result.type === 'K' || result.type === 'OUT') {
        cpuOuts++;
      } else {
        state.score.away += result.points || 1;
      }
      
      cpuBatterIndex++;
    }
    
    // 🔧 修復：一次性顯示結果摘要
    const totalRuns = cpuResults.reduce((sum, r) => sum + r.points, 0);
    const hits = cpuResults.filter(r => r.points > 0);
    
    const outcomeText = document.getElementById('outcome-text');
    if (outcomeText) {
      outcomeText.textContent = `CPU回合結束：${totalRuns}分，${hits.length}支安打，${cpuOuts}個出局`;
    }
    
    // 🆕 新增：更新右側面板記錄
    updateGameLog('cpu', cpuResults);
    
    console.log('✅ CPU回合完成：', { totalRuns, hits: hits.length, outs: cpuOuts });
    
    render(state, handlers);
    
    // 立即切換到下半局
    setTimeout(() => changeHalfInning(state, handlers), 800);
    
  } catch (error) {
    console.error('❌ CPU回合失敗:', error);
    showErrorMessage(`CPU回合失敗: ${error.message}`);
  }
}

// 🆕 新增：更新遊戲記錄面板
function updateGameLog(team, results) {
  let logContainer = document.getElementById('game-log-panel');
  
  if (!logContainer) {
    // 創建記錄面板
    logContainer = document.createElement('div');
    logContainer.id = 'game-log-panel';
    logContainer.className = 'game-log-panel';
    logContainer.innerHTML = `
      <div class="log-header">遊戲記錄</div>
      <div class="log-content" id="log-content"></div>
    `;
    
    // 添加到右側或適當位置
    const rightPanel = document.querySelector('.game-container');
    if (rightPanel) {
      rightPanel.appendChild(logContainer);
    }
  }
  
  const logContent = document.getElementById('log-content');
  if (!logContent) return;
  
  // 添加新記錄
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry ${team}-log`;
  
  if (team === 'cpu') {
    const hits = results.filter(r => r.points > 0);
    const totalRuns = results.reduce((sum, r) => sum + r.points, 0);
    
    logEntry.innerHTML = `
      <div class="log-title">客隊攻擊</div>
      <div class="log-detail">${totalRuns}分 ${hits.length}安打</div>
      ${hits.length > 0 ? `<div class="log-hits">${hits.map(h => h.batter).join(', ')} 安打</div>` : ''}
    `;
  }
  
  // 保持最新的 5 條記錄
  logContent.insertBefore(logEntry, logContent.firstChild);
  while (logContent.children.length > 5) {
    logContent.removeChild(logContent.lastChild);
  }
}


// 🔧 修改：changeHalfInning 函數 - 傳遞 handlers
function changeHalfInning(state, handlers) {
  try {
    // 清除臨時加成
    state.bases.forEach(baseCard => {
      if (baseCard && baseCard.tempBonus) {
        delete baseCard.tempBonus;
      }
    });
    
    state.outs = 0;
    
    if (state.half === 'top') {
      state.half = 'bottom';
      state.playerTurn = true;
      
      const outcomeText = document.getElementById('outcome-text');
      if (outcomeText) {
        outcomeText.textContent = '🎵 輪到MyGO!!!!!攻擊！';
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

// 🔧 修改：simulateSimpleAtBat 函數 - 平衡得分
function simulateSimpleAtBat(batter, pitcher) {
  const random = Math.random();
  
  // 🔧 修復：更平衡的機率分佈
  if (random < 0.25) {  // 25% 出局機率
    return { type: 'K', description: `${batter.name} 三振出局`, points: 0 };
  } else if (random < 0.35) {  // 10% 其他出局
    return { type: 'OUT', description: `${batter.name} 出局`, points: 0 };
  } else if (random < 0.45) {  // 10% 保送
    return { type: 'BB', description: `${batter.name} 保送`, points: 1 };
  } else if (random < 0.52) {  // 7% 全壘打
    return { type: 'HR', description: `${batter.name} 全壘打！`, points: 4 };
  } else if (random < 0.65) {  // 13% 二壘安打
    return { type: '2B', description: `${batter.name} 二壘安打`, points: 2 };
  } else if (random < 0.75) {  // 10% 三壘安打
    return { type: '3B', description: `${batter.name} 三壘安打`, points: 3 };
  } else {  // 25% 一壘安打
    return { type: '1B', description: `${batter.name} 一壘安打`, points: 1 };
  }
}

function processSimpleOutcome(result, state, batterCard) {
  if (result.type === 'K' || result.type === 'OUT') {
    state.outs++;
  } else {
    state.score.home += result.points || 1;
    
    // 簡化的壘包邏輯：將打者放到相應壘包
    if (result.type === '1B' || result.type === 'BB') {
      state.bases[0] = batterCard;
    } else if (result.type === '2B') {
      state.bases[1] = batterCard;
    } else if (result.type === '3B') {
      state.bases[2] = batterCard;
    }
    // HR 不上壘
  }
}

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

// 修復 OVR 計算
function calculateBatterOVR(stats) {
  const w = CONFIG.ovrWeights.batter;
  const power = stats.power ?? 50;
  const hitRate = stats.hitRate ?? 50;
  const contact = stats.contact ?? 50;
  const speed = stats.speed ?? 50;
  
  // 修復：正規化到 0-100 範圍
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
  
  // 修復：正規化到 0-100 範圍
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

// 🔧 修改：draw 函數 - 限制手牌上限為 7 張
function draw(player, numToDraw) {
  console.log('🎴 開始抽牌:', numToDraw, '張');
  console.log('📊 抽牌前 - 牌庫:', player.deck.length, '手牌:', player.hand.length, '棄牌:', player.discard.length);
  
  // 🔧 修復：檢查手牌上限 7 張
  if (player.hand.length >= 7) {
    console.log('⚠️ 手牌已達上限 (7張)，停止抽牌');
    return;
  }
  
  const actualDrawCount = Math.min(numToDraw, 7 - player.hand.length);
  console.log('🎴 實際抽牌數量:', actualDrawCount);
  
  for (let i = 0; i < actualDrawCount; i++) {
    // 如果牌庫空了，從棄牌堆重新洗牌
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

console.log('🎮 準備啟動 MyGO!!!!! TCG...');
initializeGame();