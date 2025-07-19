// src/main.js - 綜合修復版本
console.log('🎮 MyGO!!!!! TCG 主檔案載入中...');

let CONFIG, TEAMS, createGameState, render;
let gameInitialized = false;
let draggedCard = null;
let draggedCardIndex = -1;
let awaitingTargetSelection = false;
let pendingActionCard = null;

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
    
    startGame();
    
  } catch (error) {
    console.error('❌ 模組載入失敗:', error);
    showErrorMessage(`載入失敗: ${error.message}`);
  }
}

function startGame() {
  try {
    console.log('🎯 開始初始化遊戲...');
    
    const state = createGameState();
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
          initDecks(state);
        } else if (state.playerTurn && state.selected !== -1) {
          runPlayerTurn(state);
        }
        
        render(state, handlers);
      },
      
      // 壘包點擊處理（用於選擇目標）
      baseClick: (baseIndex) => {
        console.log('🎯 壘包點擊:', baseIndex);
        if (awaitingTargetSelection && state.bases[baseIndex]) {
          handleTargetSelection(baseIndex, state);
        }
      },
      
      // 拖拽到打擊位置
      dragToBatter: (cardIndex) => {
        console.log('🎯 拖拽到打擊位置:', cardIndex);
        if (state.playerTurn && !awaitingTargetSelection) {
          state.selected = cardIndex;
          runPlayerTurn(state);
        }
      }
    };
    
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
    batterZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      batterZone.classList.add('drag-over');
    });
    
    batterZone.addEventListener('dragleave', () => {
      batterZone.classList.remove('drag-over');
    });
    
    batterZone.addEventListener('drop', (e) => {
      e.preventDefault();
      batterZone.classList.remove('drag-over');
      
      const cardIndex = parseInt(e.dataTransfer.getData('text/plain'));
      if (cardIndex !== -1) {
        handlers.dragToBatter(cardIndex);
      }
    });
  }
}

function initDecks(state) {
  try {
    console.log('🎯 初始化牌組...');
    
    const playerTeam = TEAMS.find(team => team.id === "MGO");
    state.player.team = playerTeam;
    state.player.deck = [...playerTeam.batters, ...playerTeam.actionCards].map(prepareCard);
    shuffle(state.player.deck);
    state.player.hand = [];
    state.player.pitcher = prepareCard(playerTeam.pitchers[0]);
    
    // 修復：起手 5 張卡
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
      runCpuTurn(state);
    }, 1000);
    
  } catch (error) {
    console.error('❌ 牌組初始化失敗:', error);
    showErrorMessage(`牌組初始化失敗: ${error.message}`);
  }
}

// 🔧 修復：runPlayerTurn 函數 - 解決 strict mode 錯誤和卡牌移除問題
function runPlayerTurn(state) {
  try {
    const card = state.player.hand[state.selected];
    if (!card) {
      console.warn('⚠️ 沒有選中的卡牌');
      return;
    }
    
    console.log('🎯 玩家回合:', card.name);
    
    if (card.type === 'batter') {
      // 打者卡：進行打擊
      const result = simulateSimpleAtBat(card, state.cpu.activePitcher);
      processSimpleOutcome(result, state, card);
      
      const outcomeText = document.getElementById('outcome-text');
      if (outcomeText) {
        outcomeText.textContent = result.description;
      }
      
      // 🔧 修復：正確移除卡牌並抽新牌
      removeCardFromHand(state, state.selected);
      draw(state.player, 2);
      
    } else if (card.type === 'action') {
      // 戰術卡：檢查是否需要選擇目標
      if (needsTargetSelection(card)) {
        startTargetSelection(card, state);
        return; // 🔧 修復：等待目標選擇，不繼續執行
      } else {
        // 直接執行戰術卡
        executeActionCard(card, state);
        removeCardFromHand(state, state.selected);
      }
    }
    
    // 🔧 修復：重置選擇狀態
    state.selected = -1;
    console.log('✅ 玩家回合完成，手牌數量:', state.player.hand.length);
    
    if (state.outs >= 3) {
      setTimeout(() => changeHalfInning(state), 1500);
    }
    
  } catch (error) {
    console.error('❌ 玩家回合失敗:', error);
    showErrorMessage(`玩家回合失敗: ${error.message}`);
  }
}

// 🆕 新增：正確的卡牌移除函數
function removeCardFromHand(state, cardIndex) {
  if (cardIndex >= 0 && cardIndex < state.player.hand.length) {
    const removedCard = state.player.hand.splice(cardIndex, 1)[0];
    state.player.discard.push(removedCard);
    console.log('🗑️ 移除卡牌:', removedCard.name);
    return removedCard;
  }
  return null;
}

// 🆕 新增：目標選擇開始函數
function startTargetSelection(card, state) {
  awaitingTargetSelection = true;
  pendingActionCard = card;
  
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = `選擇 ${card.name} 的目標...`;
  }
  
  highlightValidTargets(card, state);
  
  // 🔧 修復：重新渲染以顯示高亮效果
  const handlers = getCurrentHandlers(); // 需要定義這個函數
  render(state, handlers);
}

// 🆕 新增：目標選擇處理函數
function handleTargetSelection(baseIndex, state) {
  if (!pendingActionCard) return;
  
  const targetCard = state.bases[baseIndex];
  if (!targetCard) return;
  
  console.log('🎯 目標選擇:', targetCard.name);
  
  // 執行戰術卡效果
  executeActionCard(pendingActionCard, state, targetCard, baseIndex);
  
  // 移除卡牌
  const cardIndex = state.player.hand.indexOf(pendingActionCard);
  if (cardIndex !== -1) {
    removeCardFromHand(state, cardIndex);
  }
  
  // 重置選擇狀態
  resetTargetSelection(state);
}

// 🆕 新增：重置目標選擇狀態
function resetTargetSelection(state) {
  awaitingTargetSelection = false;
  pendingActionCard = null;
  state.selected = -1;
  
  // 移除高亮
  document.querySelectorAll('.base').forEach(base => {
    base.classList.remove('selectable-target');
  });
}

function needsTargetSelection(card) {
  // 檢查卡牌是否需要選擇目標
  const needsTarget = [
    '一輩子',
    '想成為人類',
    '滿腦子想著自己'
  ];
  
  return needsTarget.includes(card.name);
}

function highlightValidTargets(card, state) {
  // 移除舊的高亮
  document.querySelectorAll('.base').forEach(base => {
    base.classList.remove('selectable-target');
  });
  
  // 根據卡牌類型高亮目標
  if (card.name === '一輩子') {
    // 可以選擇任何壘上的我方角色
    state.bases.forEach((baseCard, index) => {
      if (baseCard) {
        const baseElement = document.getElementById(`base-${index}`);
        if (baseElement) {
          baseElement.classList.add('selectable-target');
        }
      }
    });
  }
}

function handleTargetSelection(baseIndex, state) {
  if (!pendingActionCard) return;
  
  const targetCard = state.bases[baseIndex];
  if (!targetCard) return;
  
  console.log('🎯 目標選擇:', targetCard.name);
  
  // 執行戰術卡效果
  executeActionCard(pendingActionCard, state, targetCard, baseIndex);
  
  // 移除卡牌
  const cardIndex = state.player.hand.indexOf(pendingActionCard);
  if (cardIndex !== -1) {
    state.player.hand.splice(cardIndex, 1);
    state.player.discard.push(pendingActionCard);
  }
  
  // 重置選擇狀態
  awaitingTargetSelection = false;
  pendingActionCard = null;
  state.selected = -1;
  
  // 移除高亮
  document.querySelectorAll('.base').forEach(base => {
    base.classList.remove('selectable-target');
  });
  
  render(state, arguments.callee.caller.arguments[0]);
}

// 🔧 修復：executeActionCard 函數 - 增強一輩子效果
function executeActionCard(card, state, targetCard = null, targetIndex = -1) {
  let description = "";
  
  switch (card.name) {
    case '一輩子':
      if (targetCard) {
        targetCard.locked = true;
        description = `${targetCard.name} 被鎖定在 ${targetIndex + 1} 壘上！一輩子...`;
        console.log('🔒 角色被鎖定:', targetCard.name);
      } else {
        description = `${card.name}: 需要選擇壘上的目標！`;
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
        targetCard.tempBonus = targetCard.tempBonus || {};
        targetCard.tempBonus.speed = 99;
        description = `${targetCard.name} 想成為人類！速度設為 99！`;
      } else {
        description = `${card.name}: 需要選擇目標！`;
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

function runCpuTurn(state) {
  try {
    console.log('🤖 CPU回合開始');
    
    let cpuOuts = 0;
    let cpuBatterIndex = 0;
    
    const turnInterval = setInterval(() => {
      if (cpuOuts >= 3) {
        clearInterval(turnInterval);
        changeHalfInning(state);
        return;
      }
      
      const batter = state.cpu.deck[cpuBatterIndex % state.cpu.deck.length];
      const result = simulateSimpleAtBat(batter, state.player.pitcher);
      
      if (result.type === 'K' || result.type === 'OUT') {
        cpuOuts++;
      } else {
        state.score.away += result.points || 1;
      }
      
      const outcomeText = document.getElementById('outcome-text');
      if (outcomeText) {
        outcomeText.textContent = `CPU: ${result.description}`;
      }
      
      cpuBatterIndex++;
      
      const simpleHandlers = {
        select: () => {},
        button: () => {},
        baseClick: () => {},
        dragToBatter: () => {}
      };
      render(state, simpleHandlers);
    }, 1500);
    
  } catch (error) {
    console.error('❌ CPU回合失敗:', error);
    showErrorMessage(`CPU回合失敗: ${error.message}`);
  }
}

function changeHalfInning(state) {
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
        runCpuTurn(state);
      }, 1000);
    }
    
    const simpleHandlers = {
      select: () => {},
      button: () => {},
      baseClick: () => {},
      dragToBatter: () => {}
    };
    render(state, simpleHandlers);
    
  } catch (error) {
    console.error('❌ 半局更換失敗:', error);
    showErrorMessage(`半局更換失敗: ${error.message}`);
  }
}

function simulateSimpleAtBat(batter, pitcher) {
  const random = Math.random();
  
  if (random < 0.2) {
    return { type: 'K', description: `${batter.name} 三振出局`, points: 0 };
  } else if (random < 0.3) {
    return { type: 'OUT', description: `${batter.name} 出局`, points: 0 };
  } else if (random < 0.4) {
    return { type: 'BB', description: `${batter.name} 保送`, points: 1 };
  } else if (random < 0.5) {
    return { type: 'HR', description: `${batter.name} 全壘打！`, points: 4 };
  } else if (random < 0.7) {
    return { type: '2B', description: `${batter.name} 二壘安打`, points: 2 };
  } else {
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

function draw(player, numToDraw) {
  for (let i = 0; i < numToDraw; i++) {
    if (player.deck.length === 0) {
      if (player.discard.length === 0) return;
      player.deck = [...player.discard];
      player.discard = [];
      shuffle(player.deck);
    }
    if (player.hand.length < 10 && player.deck.length > 0) {
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