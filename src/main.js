// src/main.js - 簡化版本，專門用於測試和除錯
console.log('🎮 MyGO!!!!! TCG 主檔案載入中...');

// 嘗試載入所有必要的模組
let CONFIG, TEAMS, createGameState, render;
let gameInitialized = false;

async function initializeGame() {
  try {
    console.log('📦 開始載入遊戲模組...');
    
    // 載入配置
    const configModule = await import('./data/config.js');
    CONFIG = configModule.CONFIG;
    console.log('✅ Config 載入成功');
    
    // 載入隊伍資料
    const teamsModule = await import('./data/teams.js');
    TEAMS = teamsModule.TEAMS;
    console.log('✅ Teams 載入成功:', TEAMS.length, '個隊伍');
    
    // 載入遊戲狀態
    const gameStateModule = await import('./engine/game_state.js');
    createGameState = gameStateModule.createGameState;
    console.log('✅ Game State 載入成功');
    
    // 載入UI
    const uiModule = await import('./ui/ui.js');
    render = uiModule.render;
    console.log('✅ UI 載入成功');
    
    // 初始化遊戲
    startGame();
    
  } catch (error) {
    console.error('❌ 模組載入失敗:', error);
    showErrorMessage(`載入失敗: ${error.message}`);
  }
}

function startGame() {
  try {
    console.log('🎯 開始初始化遊戲...');
    
    // 創建遊戲狀態
    const state = createGameState();
    console.log('✅ 遊戲狀態創建成功');
    
    // 確保MyGO隊伍存在
    const mygoTeam = TEAMS.find(team => team.id === "MGO");
    if (!mygoTeam) {
      throw new Error('找不到MyGO隊伍資料');
    }
    
    console.log('✅ MyGO隊伍確認:', mygoTeam.name);
    console.log('  - 打者:', mygoTeam.batters.length, '名');
    console.log('  - 投手:', mygoTeam.pitchers.length, '名'); 
    console.log('  - 戰術卡:', mygoTeam.actionCards.length, '張');
    
    // 設置事件處理器
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
      }
    };
    
    // 執行初始渲染
    render(state, handlers);
    
    // 更新按鈕事件
    const mainButton = document.getElementById('main-button');
    if (mainButton) {
      mainButton.onclick = handlers.button;
    }
    
    console.log('🎉 遊戲初始化完成！');
    gameInitialized = true;
    
    // 顯示成功訊息
    const outcomeText = document.getElementById('outcome-text');
    if (outcomeText) {
      outcomeText.textContent = '🎸 MyGO!!!!! 準備就緒！點擊 Play Ball 開始遊戲！';
    }
    
  } catch (error) {
    console.error('❌ 遊戲初始化失敗:', error);
    showErrorMessage(`初始化失敗: ${error.message}`);
  }
}

function initDecks(state) {
  try {
    console.log('🎯 初始化牌組...');
    
    // 準備玩家牌組 (MyGO)
    const playerTeam = TEAMS.find(team => team.id === "MGO");
    state.player.team = playerTeam;
    state.player.deck = [...playerTeam.batters, ...playerTeam.actionCards].map(prepareCard);
    shuffle(state.player.deck);
    state.player.hand = [];
    state.player.pitcher = prepareCard(playerTeam.pitchers[0]);
    
    // 抽手牌
    draw(state.player, CONFIG.handSize);
    
    // 準備CPU牌組 (Yankees)
    const cpuTeam = TEAMS.find(team => team.id === "NYY");
    state.cpu.team = cpuTeam;
    state.cpu.deck = [...cpuTeam.batters].map(prepareCard);
    state.cpu.activePitcher = prepareCard(cpuTeam.pitchers[0]);
    
    console.log('✅ 牌組初始化完成');
    console.log('  - 玩家手牌:', state.player.hand.length, '張');
    console.log('  - 玩家牌組:', state.player.deck.length, '張');
    console.log('  - CPU牌組:', state.cpu.deck.length, '張');
    
    // 開始CPU回合
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
    if (!card) return;
    
    console.log('🎯 玩家回合:', card.name);
    
    if (card.type === 'batter') {
      // 簡化的打擊模擬
      const result = simulateSimpleAtBat(card, state.cpu.activePitcher);
      processSimpleOutcome(result, state);
      
      const outcomeText = document.getElementById('outcome-text');
      if (outcomeText) {
        outcomeText.textContent = result.description;
      }
      
    } else if (card.type === 'action') {
      const outcomeText = document.getElementById('outcome-text');
      if (outcomeText) {
        outcomeText.textContent = `${card.name} 戰術卡使用！`;
      }
    }
    
    // 移除卡牌
    state.player.hand.splice(state.selected, 1);
    state.player.discard.push(card);
    draw(state.player, 1);
    state.selected = -1;
    
    // 檢查三出局
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
      render(state, { select: () => {}, button: () => {} });
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
        // 遊戲結束
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
    
    render(state, { select: () => {}, button: () => {} });
    
  } catch (error) {
    console.error('❌ 半局更換失敗:', error);
    showErrorMessage(`半局更換失敗: ${error.message}`);
  }
}

// 簡化的打擊模擬
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
    // 簡化的壘包邏輯
    if (result.points && result.points < 4) {
      // 假設有跑者上壘
    }
  }
}

// 工具函數
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
    if (player.hand.length < CONFIG.handSize && player.deck.length > 0) {
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

// 啟動遊戲
console.log('🎮 準備啟動 MyGO!!!!! TCG...');
initializeGame();