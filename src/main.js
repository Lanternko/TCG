// src/main.js - 增強版主遊戲邏輯
console.log('🎮 MyGO!!!!! TCG 主檔案載入中...');

let CONFIG, TEAMS, createGameState, render;
let gameInitialized = false;
let draggedCard = null;
let draggedCardIndex = -1;

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
        if (state.playerTurn) {
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
      
      // 新增：拖拽處理
      dragStart: (idx, card) => {
        console.log('🎯 開始拖拽:', idx, card.name);
        draggedCard = card;
        draggedCardIndex = idx;
        
        // 添加拖拽中的視覺效果
        const cardElement = document.querySelector(`[data-card-index="${idx}"]`);
        if (cardElement) {
          cardElement.classList.add('dragging');
        }
      },
      
      dragEnd: (target) => {
        console.log('🎯 結束拖拽:', target);
        if (draggedCard && draggedCardIndex !== -1) {
          // 檢查是否拖拽到有效位置
          if (target === 'field' || target === 'pitcher-area') {
            // 執行卡牌效果
            state.selected = draggedCardIndex;
            runPlayerTurn(state);
          }
          
          // 清理拖拽狀態
          const cardElement = document.querySelector(`[data-card-index="${draggedCardIndex}"]`);
          if (cardElement) {
            cardElement.classList.remove('dragging');
          }
          
          draggedCard = null;
          draggedCardIndex = -1;
        }
        
        render(state, handlers);
      }
    };
    
    // 設置拖拽區域
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
  // 設置投手區域作為拖拽目標
  const pitcherArea = document.getElementById('player-pitcher-area');
  if (pitcherArea) {
    pitcherArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      pitcherArea.classList.add('drag-over');
    });
    
    pitcherArea.addEventListener('dragleave', () => {
      pitcherArea.classList.remove('drag-over');
    });
    
    pitcherArea.addEventListener('drop', (e) => {
      e.preventDefault();
      pitcherArea.classList.remove('drag-over');
      handlers.dragEnd('pitcher-area');
    });
  }
  
  // 設置中央區域作為拖拽目標
  const centerField = document.querySelector('.center-field');
  if (centerField) {
    centerField.addEventListener('dragover', (e) => {
      e.preventDefault();
      centerField.classList.add('drag-over');
    });
    
    centerField.addEventListener('dragleave', () => {
      centerField.classList.remove('drag-over');
    });
    
    centerField.addEventListener('drop', (e) => {
      e.preventDefault();
      centerField.classList.remove('drag-over');
      handlers.dragEnd('field');
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
    
    // 修改：每回合抽兩張卡片
    draw(state.player, Math.min(CONFIG.handSize, 2));
    
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

function runPlayerTurn(state) {
  try {
    const card = state.player.hand[state.selected];
    if (!card) {
      console.warn('⚠️ 沒有選中的卡牌');
      return;
    }
    
    console.log('🎯 玩家回合:', card.name);
    
    if (card.type === 'batter') {
      const result = simulateSimpleAtBat(card, state.cpu.activePitcher);
      processSimpleOutcome(result, state);
      
      const outcomeText = document.getElementById('outcome-text');
      if (outcomeText) {
        outcomeText.textContent = result.description;
      }
      
    } else if (card.type === 'action') {
      const outcomeText = document.getElementById('outcome-text');
      if (outcomeText) {
        outcomeText.textContent = `${card.name} 戰術卡使用！效果已發動！`;
      }
    }
    
    // 移除卡牌
    state.player.hand.splice(state.selected, 1);
    state.player.discard.push(card);
    
    // 修改：每回合抽兩張卡片
    draw(state.player, 2);
    
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
      
      // 使用簡化的渲染參數
      const simpleHandlers = {
        select: () => {},
        button: () => {},
        dragStart: () => {},
        dragEnd: () => {}
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
      dragStart: () => {},
      dragEnd: () => {}
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

function processSimpleOutcome(result, state) {
  if (result.type === 'K' || result.type === 'OUT') {
    state.outs++;
  } else {
    state.score.home += result.points || 1;
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
    // 修改：手牌上限檢查
    if (player.hand.length < 7 && player.deck.length > 0) {
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