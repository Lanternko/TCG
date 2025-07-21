// src/ui/ui.js - 增強的UI系統

// 🔧 修改：render 函數 - 添加記錄面板渲染和光環描述
export function render(state, handlers) {
  try {
    console.log('🎨 開始渲染UI...', {
      playerTurn: state.playerTurn,
      selected: state.selected,
      handSize: state.player.hand.length,
      outs: state.outs,
      awaitingTarget: window.awaitingTargetSelection,
      bases: state.bases.map(b => b ? b.name : null)
    });
    
    // 更新全域狀態引用
    window.gameState = state;
    window.currentHandlers = handlers;
    
    renderScore(state.score);
    renderOuts(state.outs);
    renderInning(state.currentInning, state.half);
    renderBases(state.bases, handlers.baseClick);
    renderPitchers(state.cpu.activePitcher, state.player.pitcher);
    renderAuraDescription(state); // 🆕 新增：渲染光環描述
    renderHand(state.player.hand, state.selected, handlers);
    renderDeckInfo(state.player);
    renderMainButton(state, handlers.button);
    renderActiveEffects(state.activeEffects);
    renderSpecialStates(state);
    renderGameLog(state);
    updateDropHint(state); // 🆕 新增：更新拖拽提示
    updateContextualHints(state);
    
    console.log('✅ UI渲染完成');
    
  } catch (error) {
    console.error('❌ UI渲染失敗:', error);
  }
}

function renderScore(score) {
  const awayScore = document.getElementById('away-score');
  const homeScore = document.getElementById('home-score');
  
  if (awayScore) awayScore.textContent = score.away;
  if (homeScore) homeScore.textContent = score.home;
}

function renderOuts(outs) {
  const outLights = document.querySelectorAll('.out-light');
  outLights.forEach((light, index) => {
    light.classList.toggle('active', index < outs);
  });
}

function renderInning(inning, half) {
  const inningDisplay = document.getElementById('inning-display');
  if (!inningDisplay) return;
  
  const inningSuffix = ['st', 'nd', 'rd'][inning - 1] || 'th';
  const halfText = half === 'top' ? '上' : '下';
  inningDisplay.textContent = `${inning}${inningSuffix} ${halfText}`;
}

// 🔧 修改：renderBases 函數 - 顯示動態 OVR 和詳細資訊
function renderBases(bases, baseClickHandler) {
  const baseNames = ['first-base', 'second-base', 'third-base'];
  const baseLabels = ['1B', '2B', '3B'];
  
  bases.forEach((card, index) => {
    const baseElement = document.getElementById(baseNames[index]);
    if (!baseElement) {
      console.warn(`⚠️ 找不到壘包元素: ${baseNames[index]}`);
      return;
    }
    
    // 設置正確的壘包順序
    const displayOrder = [3, 2, 1]; // 1B=3, 2B=2, 3B=1
    baseElement.style.order = displayOrder[index];
    
    // 更新壘包狀態
    baseElement.classList.toggle('occupied', !!card);
    baseElement.classList.toggle('locked', card && card.locked);
    
    if (card) {
      // 計算動態 OVR
      const dynamicOVR = calculateDynamicOVR(card);
      
      baseElement.innerHTML = `
        <div class="base-player-info">
          <div class="player-name">${card.name}</div>
          <div class="player-band">${card.band || ''}</div>
          <div class="player-ovr">OVR: ${dynamicOVR}</div>
          ${card.locked ? '<div class="locked-indicator">🔒</div>' : ''}
        </div>
      `;
      
      // 綁定點擊事件
      baseElement.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎯 壘包點擊:', baseNames[index], '索引:', index, '角色:', card.name);
        
        if (window.awaitingTargetSelection) {
          console.log('🎯 目標選擇模式 - 壘包點擊');
        }
        
        if (baseClickHandler) {
          baseClickHandler(index);
        }
      };
      
      // 右鍵取消
      baseElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (window.awaitingTargetSelection && window.cancelTargetSelection) {
          window.cancelTargetSelection(window.gameState, { baseClick: baseClickHandler });
        }
      });
      
      // 顯示光環效果
      if (card.effects && card.effects.aura) {
        baseElement.classList.add('has-aura');
        baseElement.title = `${card.name} - 光環: ${card.effects.aura.description}`;
      } else {
        baseElement.classList.remove('has-aura');
      }
      
    } else {
      baseElement.innerHTML = baseLabels[index];
      baseElement.onclick = null;
      baseElement.oncontextmenu = null;
      baseElement.title = '';
      baseElement.classList.remove('has-aura', 'selectable-target');
    }
  });
}

function renderBatterZone(state) {
  let batterZone = document.getElementById('batter-zone');
  if (!batterZone) {
    // 創建打擊區域
    batterZone = document.createElement('div');
    batterZone.id = 'batter-zone';
    batterZone.className = 'batter-zone';
    
    const centerField = document.querySelector('.center-field');
    if (centerField) {
      centerField.appendChild(batterZone);
    }
  }
  
  batterZone.innerHTML = `
    <div class="zone-label">打擊區</div>
    <div class="zone-instruction">拖拽打者到這裡</div>
  `;
}

function renderPitchers(cpuPitcher, playerPitcher) {
  const cpuPitcherArea = document.getElementById('cpu-pitcher-area');
  const playerPitcherArea = document.getElementById('player-pitcher-area');
  
  if (cpuPitcherArea) {
    cpuPitcherArea.innerHTML = cpuPitcher ? `
      <div class="team-indicator away">客隊投手</div>
      <div class="card pitcher-card">
        <div class="card-name">${cpuPitcher.name}</div>
        <div class="card-ovr">${cpuPitcher.ovr}</div>
        <div class="card-stats">
          POW: ${cpuPitcher.stats.power}<br>
          VEL: ${cpuPitcher.stats.velocity}<br>
          CTL: ${cpuPitcher.stats.control}<br>
          TEC: ${cpuPitcher.stats.technique}
        </div>
      </div>
    ` : '';
  }
  
  if (playerPitcherArea) {
    playerPitcherArea.innerHTML = playerPitcher ? `
      <div class="team-indicator home">主隊投手</div>
      <div class="card pitcher-card">
        <div class="card-name">${playerPitcher.name}</div>
        <div class="card-ovr">${playerPitcher.ovr}</div>
        <div class="card-stats">
          POW: ${playerPitcher.stats.power}<br>
          VEL: ${playerPitcher.stats.velocity}<br>
          CTL: ${playerPitcher.stats.control}<br>
          TEC: ${playerPitcher.stats.technique}
        </div>
        <div class="card-description">${playerPitcher.band || 'CRYCHIC'}</div>
      </div>
    ` : '';
  }
}

function renderHand(hand, selectedIndex, handlers) {
  const handContainer = document.getElementById('player-hand');
  if (!handContainer) {
    console.warn('⚠️ 找不到手牌容器');
    return;
  }
  
  console.log('🎯 渲染手牌:', {
    handSize: hand.length,
    selected: selectedIndex,
    hasSelectHandler: !!handlers.select
  });
  
  handContainer.innerHTML = '';
  
  hand.forEach((card, index) => {
    const cardEl = createCardElement(card, index, selectedIndex, handlers);
    handContainer.appendChild(cardEl);
  });
}

// 🔧 修改：createCardElement 函數 - 顯示動態 OVR
function createCardElement(card, index, selectedIndex, handlers) {
  const cardEl = document.createElement('div');
  cardEl.className = 'card hand-card';
  cardEl.setAttribute('data-card-index', index);
  cardEl.draggable = true;
  
  if (index === selectedIndex) {
    cardEl.classList.add('selected');
  }
  
  if (card.type === 'action') {
    cardEl.classList.add('action-card');
  } else if (card.type === 'batter') {
    cardEl.classList.add('batter-card');
  }
  
  // 計算動態數值和 OVR
  const dynamicStats = calculateDynamicStats(card);
  const dynamicOVR = calculateDynamicOVR(card);
  
  let cardStats = '';
  if (card.type === 'batter') {
    const hasBonus = hasTempBonus(card);
    const statsClass = hasBonus ? 'card-stats buffed' : 'card-stats';
    
    cardStats = `
      <div class="${statsClass}">
        POW: ${dynamicStats.power} HIT: ${dynamicStats.hitRate}<br>
        CON: ${dynamicStats.contact} SPD: ${dynamicStats.speed}
      </div>
    `;
  }
  
  const description = getCardDescription(card);
  const instrument = card.instrument ? `<div class="card-instrument">🎵 ${card.instrument}</div>` : '';
  const band = card.band ? `<div class="card-band">${card.band}</div>` : '';
  const bonusIndicator = hasTempBonus(card) ? '<div class="bonus-indicator">✨</div>' : '';
  
  // 🔧 修復：顯示動態 OVR，如果有變化則特別標示
  const ovrClass = dynamicOVR !== card.ovr ? 'card-ovr dynamic' : 'card-ovr';
  
  cardEl.innerHTML = `
    <div class="card-name">${card.name}</div>
    <div class="${ovrClass}">${dynamicOVR}</div>
    ${cardStats}
    ${instrument}
    ${band}
    <div class="card-description">${description}</div>
    ${bonusIndicator}
  `;
  
  // 設置事件處理
  setupCardEvents(cardEl, card, index, handlers);
  
  return cardEl;
}

function setupCardEvents(cardEl, card, index, handlers) {
  // 點擊選擇事件
  cardEl.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 卡牌點擊:', index, card.name);
    
    // 🔧 修復：目標選擇模式的處理
    if (window.awaitingTargetSelection && window.pendingActionCard) {
      if (window.pendingActionCard.name === '滿腦子想著自己' && card.type === 'batter') {
        console.log('🎯 手牌目標選擇:', card.name);
        if (window.handleHandCardSelection) {
          window.handleHandCardSelection(index, window.gameState, handlers);
        }
        return;
      }
    }
    
    // 正常選擇邏輯
    if (handlers && handlers.select) {
      handlers.select(index);
    }
  });
  
  // 右鍵點擊取消選擇
  cardEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (window.awaitingTargetSelection) {
      console.log('❌ 右鍵取消目標選擇');
      if (window.cancelTargetSelection) {
        window.cancelTargetSelection(window.gameState, handlers);
      }
    }
  });
  
  // 拖拽事件
  cardEl.addEventListener('dragstart', (e) => {
    console.log('🎯 開始拖拽:', index, card.name);
    cardEl.classList.add('dragging');
    e.dataTransfer.setData('text/plain', index.toString());
  });
  
  cardEl.addEventListener('dragend', (e) => {
    console.log('🎯 拖拽結束:', index);
    cardEl.classList.remove('dragging');
  });
  
  // 懸停工具提示
  cardEl.addEventListener('mouseenter', (e) => {
    showCardTooltip(card, e.pageX, e.pageY);
  });
  
  cardEl.addEventListener('mouseleave', () => {
    hideCardTooltip();
  });
}

let currentTooltip = null;

function showCardTooltip(card, x, y) {
  hideCardTooltip(); // 移除現有工具提示
  
  currentTooltip = document.createElement('div');
  currentTooltip.className = 'card-tooltip';
  currentTooltip.style.cssText = `
    position: fixed !important;
    left: ${Math.min(x + 15, window.innerWidth - 350)}px;
    top: ${Math.max(y - 100, 10)}px;
    background: rgba(0,0,0,0.95) !important;
    color: #fff !important;
    padding: 1.5rem 2rem !important;
    border-radius: 12px !important;
    border: 2px solid #4a5a6a !important;
    font-size: 1rem !important;
    max-width: 400px !important;
    word-wrap: break-word !important;
    z-index: 10000 !important;
    box-shadow: 0 8px 25px rgba(0,0,0,0.8) !important;
    backdrop-filter: blur(8px) !important;
    pointer-events: none !important;
    transition: opacity 0.2s ease !important;
    font-family: 'Inter', sans-serif !important;
  `;
  
  let tooltipContent = `<strong style="color: #f1c40f; font-size: 1rem;">${card.name}</strong><br>`;
  
  // 顯示動態 OVR
  const dynamicOVR = calculateDynamicOVR(card);
  if (card.ovr) {
    tooltipContent += `<span style="color: ${dynamicOVR !== card.ovr ? '#27ae60' : '#ffd700'}; font-weight: bold;">OVR: ${dynamicOVR}</span><br>`;
  }
  
  // 顯示數值
  if (card.type === 'batter' && card.stats) {
    const stats = calculateDynamicStats(card);
    tooltipContent += `<div style="color: #3498db; margin: 0.5rem 0; font-family: 'Roboto Mono', monospace;">`;
    tooltipContent += `力量: ${stats.power} | 安打: ${stats.hitRate}<br>`;
    tooltipContent += `專注: ${stats.contact} | 速度: ${stats.speed}`;
    tooltipContent += `</div>`;
    
    // 顯示臨時加成
    if (card.tempBonus) {
      tooltipContent += `<div style="color: #27ae60; font-size: 0.8rem;">`;
      tooltipContent += `臨時效果: `;
      const bonuses = Object.entries(card.tempBonus).map(([stat, value]) => 
        `${stat}${value > 0 ? '+' : ''}${value}`
      );
      tooltipContent += bonuses.join(', ');
      tooltipContent += `</div>`;
    }
  }
  
  // 樂隊和樂器
  if (card.band) {
    tooltipContent += `<em style="color: #9b59b6;">${card.band}</em>`;
    if (card.instrument) {
      tooltipContent += ` - <span style="color: #e67e22;">${card.instrument}</span>`;
    }
    tooltipContent += `<br>`;
  }
  
  // 效果描述
  if (card.description) {
    tooltipContent += `<br><div style="color: #bdc3c7; line-height: 1.4; font-style: italic;">${card.description}</div>`;
  }
  
  // 目標選擇提示
  if (window.awaitingTargetSelection && window.pendingActionCard) {
    if (window.pendingActionCard.name === '滿腦子想著自己' && card.type === 'batter') {
      tooltipContent += `<br><div style="color: #e74c3c; font-weight: bold;">👆 點擊選擇為目標</div>`;
    }
  }
  
  currentTooltip.innerHTML = tooltipContent;
  document.body.appendChild(currentTooltip);
}

function hideCardTooltip() {
  if (currentTooltip && currentTooltip.parentNode) {
    currentTooltip.parentNode.removeChild(currentTooltip);
    currentTooltip = null;
  }
}

// 🔧 修改：calculateDynamicStats 函數 - 添加動態 OVR 計算
function calculateDynamicStats(card) {
  if (!card.stats) return {};
  
  const baseStats = { ...card.stats };
  
  // 應用臨時加成
  if (card.tempBonus) {
    Object.keys(card.tempBonus).forEach(stat => {
      if (baseStats[stat] !== undefined) {
        baseStats[stat] += card.tempBonus[stat];
      }
    });
  }
  
  // 確保數值在合理範圍內
  Object.keys(baseStats).forEach(stat => {
    baseStats[stat] = Math.max(0, Math.min(200, baseStats[stat]));
  });
  
  return baseStats;
}

// 🆕 新增：動態 OVR 計算函數
function calculateDynamicOVR(card) {
  if (card.type !== 'batter') return card.ovr;
  
  const dynamicStats = calculateDynamicStats(card);
  
  // 使用與 main.js 相同的 OVR 計算邏輯
  const weights = { power: 0.3, hitRate: 0.3, contact: 0.2, speed: 0.2 };
  const weightedAverage = (
    dynamicStats.power * weights.power + 
    dynamicStats.hitRate * weights.hitRate + 
    dynamicStats.contact * weights.contact + 
    dynamicStats.speed * weights.speed
  ) / (weights.power + weights.hitRate + weights.contact + weights.speed);
  
  const dynamicOVR = Math.round(weightedAverage);
  return Math.max(40, Math.min(99, dynamicOVR));
}

function hasTempBonus(card) {
  return card.tempBonus && Object.keys(card.tempBonus).length > 0;
}

// 🔧 修改：遊戲記錄系統 - 記錄最近3回合
let gameHistory = [];

// 🆕 新增：添加遊戲記錄
function addGameHistory(type, data) {
  const timestamp = Date.now();
  gameHistory.unshift({ type, data, timestamp });
  
  // 只保留最近10條記錄
  if (gameHistory.length > 10) {
    gameHistory = gameHistory.slice(0, 10);
  }
}


// 修復問題3：修復遊戲記錄面板的滾動功能
function renderGameLog(state) {
  let logPanel = document.getElementById('game-log-panel');
  
  if (!logPanel) {
    logPanel = document.createElement('div');
    logPanel.id = 'game-log-panel';
    logPanel.className = 'game-log-panel';
    
    // 🔧 修復：添加滾動樣式
    logPanel.style.cssText = `
      position: absolute !important;
      top: 120px !important;
      right: 20px !important;
      width: 320px !important;
      max-height: 480px !important;
      background: rgba(0,0,0,0.92) !important;
      border: 2px solid #4a5a6a !important;
      border-radius: 15px !important;
      padding: 1.5rem !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      z-index: 30 !important;
      backdrop-filter: blur(10px) !important;
      box-shadow: 0 8px 30px rgba(0,0,0,0.7) !important;
      scrollbar-width: thin !important;
      scrollbar-color: #4a5a6a #2c3e50 !important;
    `;
    
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.appendChild(logPanel);
    }
  }
  
  // 獲取最近10條記錄（增加記錄數量）
  const recentHistory = gameHistory.slice(0, 10);
  
  logPanel.innerHTML = `
    <div class="log-header">
      遊戲記錄
    </div>
    
    <div class="log-section">
      <div class="log-title" style="color: #3498db;">
        🏟️ 當前狀況
      </div>
      <div style="font-size: 0.8rem; color: #bdc3c7; line-height: 1.4;">
        ${state.currentInning}局${state.half === 'top' ? '上' : '下'} - ${state.outs}出局<br>
        比分：客隊 ${state.score.away} - 主隊 ${state.score.home}<br>
        手牌：${state.player.hand.length}/7 張
      </div>
    </div>
    
    <div class="log-section" style="max-height: 200px; overflow-y: auto;">
      <div class="log-title" style="color: #e67e22;">
        📝 操作記錄
      </div>
      <div style="font-size: 0.75rem; color: #95a5a6; line-height: 1.3;">
        ${recentHistory.length > 0 ? recentHistory.map(entry => `
          <div class="history-entry ${entry.type}" style="margin-bottom: 0.3rem; padding: 0.2rem 0.4rem; border-radius: 3px;">
            ${formatHistoryEntry(entry)}
          </div>
        `).join('') : '還沒有記錄'}
      </div>
    </div>
    
    <div class="log-section">
      <div class="log-title" style="color: #9b59b6;">
        ✨ 全域效果
      </div>
      <div style="font-size: 0.75rem; color: #95a5a6; line-height: 1.3;">
        ${getGlobalEffectsText(state)}
      </div>
    </div>
    
    ${window.awaitingTargetSelection ? `
    <div class="log-section" style="border-color: #e74c3c;">
      <div class="log-title" style="color: #e74c3c;">
        🎯 目標選擇中
      </div>
      <div style="font-size: 0.75rem; color: #e74c3c; line-height: 1.3;">
        正在選擇 ${window.pendingActionCard?.name || '戰術卡'} 的目標<br>
        <em>右鍵或ESC取消</em>
      </div>
    </div>
    ` : ''}
  `;
  
  // 🔧 修復：添加滾動條樣式
  const style = document.createElement('style');
  style.textContent = `
    .game-log-panel::-webkit-scrollbar {
      width: 6px !important;
    }
    
    .game-log-panel::-webkit-scrollbar-track {
      background: rgba(44, 62, 80, 0.3) !important;
      border-radius: 3px !important;
    }
    
    .game-log-panel::-webkit-scrollbar-thumb {
      background: #4a5a6a !important;
      border-radius: 3px !important;
    }
    
    .game-log-panel::-webkit-scrollbar-thumb:hover {
      background: #5a6a7a !important;
    }
    
    .log-section {
      scrollbar-width: thin !important;
      scrollbar-color: #4a5a6a transparent !important;
    }
    
    .log-section::-webkit-scrollbar {
      width: 4px !important;
    }
    
    .log-section::-webkit-scrollbar-thumb {
      background: #4a5a6a !important;
      border-radius: 2px !important;
    }
  `;
  
  if (!document.getElementById('log-panel-scroll-styles')) {
    style.id = 'log-panel-scroll-styles';
    document.head.appendChild(style);
  }
}

function renderMainButton(state, buttonHandler) {
  const button = document.getElementById('main-button');
  if (!button) return;
  
  const gameStarted = !!state.cpu.activePitcher;
  
  const newButton = button.cloneNode(true);
  button.parentNode.replaceChild(newButton, button);
  
  newButton.style.position = 'relative';
  newButton.style.zIndex = '100';
  
  if (state.over) {
    newButton.textContent = "比賽結束";
    newButton.disabled = true;
  } else if (!gameStarted) {
    newButton.textContent = "Play Ball";
    newButton.disabled = false;
  } else if (state.playerTurn) {
    newButton.disabled = state.selected === -1;
    newButton.textContent = state.selected === -1 ? "選擇卡牌" : "確認出牌";
  } else {
    newButton.textContent = "客隊回合";
    newButton.disabled = true;
  }
  
  if (buttonHandler) {
    newButton.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🎯 主按鈕點擊');
      buttonHandler();
    });
  }
}

function renderDeckInfo(player) {
  const deckCount = document.getElementById('player-deck-count');
  const discardCount = document.getElementById('player-discard-count');
  
  if (deckCount) deckCount.textContent = player.deck.length;
  if (discardCount) discardCount.textContent = player.discard.length;
}

function renderActiveEffects(activeEffects) {
  const display = document.getElementById('active-effects-display');
  if (!display) return;
  
  display.innerHTML = '';
  
  if (activeEffects && activeEffects.length > 0) {
    const title = document.createElement('div');
    title.textContent = '場上效果：';
    title.style.marginBottom = '0.5rem';
    display.appendChild(title);
    
    activeEffects.forEach(effect => {
      const effectEl = document.createElement('div');
      effectEl.className = 'effect';
      effectEl.textContent = `[${effect.source || effect.cardName}] ${effect.description || effect.stat}`;
      display.appendChild(effectEl);
    });
  } else {
    display.textContent = '無活躍效果';
  }
}

// 🆕 新增：渲染光環效果描述區域
function renderAuraDescription(state) {
  let auraArea = document.getElementById('aura-description-area');
  
  if (!auraArea) {
    // 創建光環描述區域
    auraArea = document.createElement('div');
    auraArea.id = 'aura-description-area';
    auraArea.className = 'aura-description-area';
    
    // 插入到中央場地
    const centerField = document.querySelector('.center-field');
    if (centerField) {
      centerField.appendChild(auraArea);
    }
  }
  
  // 收集所有光環效果
  const auraEffects = [];
  
  // 檢查壘上角色的光環
  state.bases.forEach((card, index) => {
    if (card && card.effects && card.effects.aura) {
      const baseName = ['一壘', '二壘', '三壘'][index];
      auraEffects.push({
        source: `${card.name} (${baseName})`,
        description: card.effects.aura.description,
        locked: card.locked
      });
    }
  });
  
  // 檢查全域效果
  const mygoOnBase = state.bases.filter(card => card && card.band === 'MyGO!!!!!').length;
  const mujicaOnBase = state.bases.filter(card => card && card.band === 'Mujica').length;
  
  if (mygoOnBase >= 3) {
    auraEffects.push({
      source: `MyGO!!!!! 協同效果 (${mygoOnBase}人)`,
      description: '燈的力量+20，團隊士氣高漲！',
      global: true
    });
  }
  
  if (mujicaOnBase >= 3) {
    auraEffects.push({
      source: `Ave Mujica 威壓效果 (${mujicaOnBase}人)`,
      description: '對手下回合抽卡-1，黑暗力量籠罩全場！',
      global: true
    });
  }
  
  // 更新內容
  if (auraEffects.length > 0) {
    auraArea.innerHTML = `
      <div class="aura-title">🌟 場上光環效果</div>
      <div class="aura-content">
        ${auraEffects.map(effect => `
          <div class="aura-effect ${effect.global ? 'global' : ''} ${effect.locked ? 'locked' : ''}">
            <strong>${effect.source}</strong>: ${effect.description}
          </div>
        `).join('')}
      </div>
    `;
  } else {
    auraArea.innerHTML = `
      <div class="aura-title">🌟 場上光環效果</div>
      <div class="aura-content">
        <em style="color: #7f8c8d;">目前沒有活躍的光環效果</em>
      </div>
    `;
  }
}

function renderSpecialStates(state) {
  const container = document.getElementById('special-states');
  if (!container) return;
  
  container.innerHTML = '';
  
  // 檢查 MyGO 協同
  if (state.player && state.player.team && state.player.team.id === 'MGO') {
    const mygoOnBase = state.bases.filter(card => 
      card && card.band === 'MyGO!!!!!'
    ).length;
    
    const mujicaOnBase = state.bases.filter(card => 
      card && card.band === 'Mujica'
    ).length;
    
    if (mygoOnBase >= 3) {
      const stateEl = createSpecialStateElement('🎵 MyGO協同', mygoOnBase, 'mygo-synergy');
      container.appendChild(stateEl);
    }
    
    if (mujicaOnBase >= 3) {
      const stateEl = createSpecialStateElement('🖤 Mujica威壓', mujicaOnBase, 'mujica-synergy');
      container.appendChild(stateEl);
    }
  }
  
  // 檢查鎖定角色
  const lockedCount = state.bases.filter(card => card && card.locked).length;
  if (lockedCount > 0) {
    const stateEl = createSpecialStateElement('🔒 鎖定', lockedCount, 'locked');
    container.appendChild(stateEl);
  }
}

function createSpecialStateElement(text, count, type) {
  const stateEl = document.createElement('div');
  stateEl.className = `special-state ${type}`;
  stateEl.textContent = `${text} (${count}人)`;
  return stateEl;
}

function getCardDescription(card) {
  if (!card) return "";
  
  // 優先顯示效果描述
  if (card.effects) {
    const effects = ['play', 'synergy', 'aura', 'death', 'passive'];
    for (const effectType of effects) {
      if (card.effects[effectType] && card.effects[effectType].description) {
        return card.effects[effectType].description;
      }
    }
  }
  
  // 戰術卡顯示稀有度
  if (card.type === 'action') {
    return card.rarity ? `${card.rarity} 戰術卡` : '戰術卡';
  }
  
  // 樂器信息
  if (card.instrument) {
    return `${card.instrument} 演奏者`;
  }
  
  return card.description || '';
}

// 🆕 新增：格式化歷史記錄
function formatHistoryEntry(entry) {
  switch (entry.type) {
    case 'playerTurn':
      return `🎵 ${entry.data.player}: ${entry.data.result}`;
    case 'cpuInning':
      return `🤖 客隊: ${entry.data.hits}安打 ${entry.data.runs}分`;
    case 'actionCard':
      return `🎭 ${entry.data.player}: ${entry.data.card}`;
    case 'endInning':
      return `⚾ ${entry.data.inning}局結束`;
    default:
      return `📊 ${entry.data}`;
  }
}

// 🆕 新增：獲取全域效果文字
function getGlobalEffectsText(state) {
  const effects = [];
  
  // 檢查樂隊協同
  const mygoCount = state.bases.filter(card => card && card.band === 'MyGO!!!!!').length;
  const mujicaCount = state.bases.filter(card => card && card.band === 'Mujica').length;
  
  if (mygoCount >= 3) {
    effects.push(`🎵 MyGO協同 (${mygoCount}人) - 燈的力量+20`);
  }
  if (mujicaCount >= 3) {
    effects.push(`🖤 Mujica威壓 (${mujicaCount}人) - 對手下回合抽卡-1`);
  }
  
  // 檢查鎖定角色
  const lockedCount = state.bases.filter(card => card && card.locked).length;
  if (lockedCount > 0) {
    effects.push(`🔒 鎖定角色 (${lockedCount}人) - 無法推進但不會被移除`);
  }
  
  // 檢查永久增強
  const enhancedCards = [...state.player.deck, ...state.player.hand, ...state.player.discard]
    .filter(card => card.stats && card.stats.power > 100); // 假設原始力量不超過100
  
  if (enhancedCards.length > 0) {
    effects.push(`💪 永久強化 (${enhancedCards.length}張卡) - 解散樂隊效果`);
  }
  
  return effects.length > 0 ? effects.join('<br>') : '目前無全域效果';
}

function getActiveEffectsText(state) {
  const effects = [];
  
  // 檢查壘上角色的狀態和效果
  state.bases.forEach((card, index) => {
    if (card) {
      const baseName = ['一壘', '二壘', '三壘'][index];
      
      if (card.locked) {
        effects.push(`🔒 ${card.name} (${baseName}) - 已鎖定`);
      }
      
      if (card.tempBonus) {
        const bonuses = Object.entries(card.tempBonus)
          .filter(([stat, value]) => value !== 0)
          .map(([stat, value]) => {
            const statNames = {
              power: '力量',
              hitRate: '安打',
              contact: '專注',
              speed: '速度'
            };
            return `${statNames[stat] || stat}${value > 0 ? '+' : ''}${value}`;
          });
        
        if (bonuses.length > 0) {
          effects.push(`✨ ${card.name} (${baseName}) - ${bonuses.join(', ')}`);
        }
      }
      
      if (card.effects && card.effects.aura) {
        effects.push(`🌟 ${card.name} (${baseName}) - 光環效果`);
      }
    }
  });
  
  // 檢查手牌中的臨時效果
  state.player.hand.forEach(card => {
    if (card.tempBonus) {
      const bonuses = Object.entries(card.tempBonus)
        .filter(([stat, value]) => value !== 0)
        .map(([stat, value]) => {
          const statNames = {
            power: '力量',
            hitRate: '安打',
            contact: '專注',
            speed: '速度'
          };
          return `${statNames[stat] || stat}${value > 0 ? '+' : ''}${value}`;
        });
      
      if (bonuses.length > 0) {
        effects.push(`🎭 ${card.name} (手牌) - ${bonuses.join(', ')}`);
      }
    }
  });
  
  // 檢查樂隊協同
  const mygoCount = state.bases.filter(card => card && card.band === 'MyGO!!!!!').length;
  const mujicaCount = state.bases.filter(card => card && card.band === 'Mujica').length;
  
  if (mygoCount >= 3) {
    effects.push(`🎵 MyGO協同效果 (${mygoCount}人) - 燈的力量+20`);
  }
  if (mujicaCount >= 3) {
    effects.push(`🖤 Mujica威壓效果 (${mujicaCount}人) - 對手下回合抽卡-1`);
  }
  
  return effects.length > 0 ? effects.join('<br>') : '目前無活躍效果';
}

function getBasesStatusText(state) {
  const baseNames = ['一壘', '二壘', '三壘'];
  const baseStatus = [];
  
  state.bases.forEach((card, index) => {
    if (card) {
      let status = `${baseNames[index]}: ${card.name}`;
      
      if (card.locked) {
        status += ' 🔒';
      }
      
      if (card.tempBonus) {
        const hasPositiveBonus = Object.values(card.tempBonus).some(v => v > 0);
        const hasNegativeBonus = Object.values(card.tempBonus).some(v => v < 0);
        
        if (hasPositiveBonus && hasNegativeBonus) {
          status += ' ⚡';
        } else if (hasPositiveBonus) {
          status += ' ✨';
        } else if (hasNegativeBonus) {
          status += ' 💔';
        }
      }
      
      if (card.effects && card.effects.aura) {
        status += ' 🌟';
      }
      
      baseStatus.push(status);
    } else {
      baseStatus.push(`${baseNames[index]}: 空`);
    }
  });
  
  return baseStatus.join('<br>');
}

export function initializeUIEnhancements() {
  console.log('🎨 初始化UI增強...');
  
  // 移除載入中文字
  const loadingElements = document.querySelectorAll('.loading, [class*="loading"]');
  loadingElements.forEach(el => {
    if (el.textContent.includes('載入中')) {
      el.style.display = 'none';
    }
  });
  
  // 添加增強樣式
  const style = document.createElement('style');
  style.textContent = `
    /* 記錄面板樣式 */
    .game-log-panel {
      background: rgba(0,0,0,0.9) !important;
      border: 2px solid #4a5a6a !important;
      border-radius: 10px !important;
      padding: 1rem !important;
      font-family: 'Inter', sans-serif !important;
      backdrop-filter: blur(5px) !important;
    }
    
    .log-header {
      color: #f1c40f !important;
      font-weight: bold !important;
      margin-bottom: 1rem !important;
      text-align: center !important;
      font-size: 1.1rem !important;
    }
    
    .log-section {
      margin-bottom: 1rem !important;
      padding: 0.5rem !important;
      border-radius: 6px !important;
      background: rgba(255,255,255,0.05) !important;
    }
    
    .log-title {
      font-weight: bold !important;
      margin-bottom: 0.5rem !important;
    }
    
    /* 手牌目標選擇樣式 */
    .hand-card.selectable-target {
      border-color: #e74c3c !important;
      box-shadow: 0 0 20px rgba(231, 76, 60, 0.8) !important;
      cursor: pointer !important;
      animation: targetPulse 1s infinite !important;
    }
    
    /* 確保壘包正確排列 */
    .bases-container {
      display: flex !important;
      gap: 2rem !important;
      align-items: center !important;
      justify-content: center !important;
      flex-direction: row !important;
    }
    
    /* 壘包順序：3B-2B-1B */
    #third-base { order: 1 !important; }
    #second-base { order: 2 !important; }
    #first-base { order: 3 !important; }
    
    /* 增強拖拽區域 */
    .batter-zone {
      min-height: 200px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      border: 3px dashed #95a5a6 !important;
      border-radius: 15px !important;
      background: rgba(149, 165, 166, 0.1) !important;
      transition: all 0.3s ease !important;
    }
    
    .batter-zone.drag-over {
      border-color: #f1c40f !important;
      background: rgba(241, 196, 15, 0.3) !important;
      transform: scale(1.05) !important;
      box-shadow: 0 0 20px rgba(241, 196, 15, 0.6) !important;
    }
    
    /* 光環區域樣式 */
    .aura-description-area {
      background: rgba(0,0,0,0.8);
      border: 2px solid #3498db;
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem;
      font-family: 'Inter', sans-serif;
    }
    
    .aura-title {
      color: #f1c40f;
      font-weight: bold;
      margin-bottom: 0.8rem;
      font-size: 1rem;
    }
    
    .aura-content {
      color: #bdc3c7;
      font-size: 0.85rem;
      line-height: 1.4;
    }
    
    .aura-effect.global {
      color: #27ae60;
      font-weight: bold;
    }
    
    .aura-effect.locked {
      color: #e74c3c;
    }
    
    /* 拖拽提示 */
    .drop-hint {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.7);
      color: #f1c40f;
      padding: 0.5rem 1rem;
      border-radius: 5px;
      font-size: 0.9rem;
      z-index: 1000;
    }
  `;
  document.head.appendChild(style);
  
  console.log('✅ UI增強初始化完成');
}

export function updateOutcomeText(message) {
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = message;
    outcomeText.style.color = '#f39c12';
  }
}

export function updateErrorText(message) {
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = message;
    outcomeText.style.color = '#e74c3c';
  }
}

export function addVisualEffect(type, target) {
  console.log(`✨ 視覺效果: ${type} -> ${target}`);
  
  if (type === 'cardPlayed') {
    const targetElement = document.querySelector(target);
    if (targetElement) {
      targetElement.classList.add('card-played-effect');
      setTimeout(() => {
        targetElement.classList.remove('card-played-effect');
      }, 1000);
    }
  }
  
  if (type === 'score') {
    const scoreElement = document.getElementById('home-score');
    if (scoreElement) {
      scoreElement.classList.add('score-increase');
      setTimeout(() => {
        scoreElement.classList.remove('score-increase');
      }, 1000);
    }
  }
}

export function initializeUI() {
  console.log('🎨 初始化UI系統...');
  
  // 添加UI樣式
  const style = document.createElement('style');
  style.textContent = `
    /* 壘包球員資訊 */
    .base-player-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 0.6rem;
      line-height: 1.1;
    }
    
    .player-name {
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 2px;
    }
    
    .player-band {
      color: #34495e;
      font-size: 0.5rem;
    }
    
    .player-ovr {
      color: #3498db;
      font-size: 0.55rem;
      margin-top: 2px;
    }
    
    .locked-indicator {
      color: #fff;
      font-size: 0.8rem;
      margin-top: 2px;
    }
    
    .base.has-aura {
      border-color: #f39c12 !important;
      box-shadow: 0 0 20px rgba(243, 156, 18, 0.7) !important;
    }
    
    .base.selectable-target {
      border-color: #e74c3c !important;
      box-shadow: 0 0 20px rgba(231, 76, 60, 0.7) !important;
      cursor: pointer;
      animation: targetPulse 1s infinite;
    }
    
    @keyframes targetPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    
    /* 打擊區域 */
    .batter-zone {
      width: 120px;
      height: 170px;
      border: 3px dashed #95a5a6;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(149, 165, 166, 0.1);
      transition: all 0.3s ease;
      margin: 1rem;
    }
    
    .batter-zone.drag-over {
      border-color: #f1c40f;
      background: rgba(241, 196, 15, 0.2);
      transform: scale(1.05);
    }
    
    .zone-label {
      font-size: 0.8rem;
      font-weight: bold;
      color: #7f8c8d;
      margin-bottom: 0.5rem;
    }
    
    .zone-instruction {
      font-size: 0.6rem;
      color: #95a5a6;
      text-align: center;
      line-height: 1.2;
    }
    
    /* 卡牌臨時加成指示器 */
    .bonus-indicator {
      position: absolute;
      top: 5px;
      left: 5px;
      font-size: 0.8rem;
      color: #f1c40f;
      animation: sparkle 2s infinite;
    }
    
    @keyframes sparkle {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.2); }
    }
    
    /* 動態數值顯示 */
    .card-stats.buffed {
      color: #27ae60;
      font-weight: bold;
    }
    
    .card-stats.debuffed {
      color: #e74c3c;
    }
    
    /* 動態 OVR 顯示 */
    .card-ovr.dynamic {
      color: #27ae60;
      font-weight: bold;
    }
    
    /* 拖拽相關 */
    .card.dragging {
      opacity: 0.7;
      transform: rotate(5deg);
      z-index: 1000;
    }
    
    .drag-over {
      border: 3px dashed #f1c40f !important;
      background-color: rgba(241, 196, 15, 0.1) !important;
    }
    
    /* 手牌單行布局 */
    .hand {
      display: flex !important;
      flex-wrap: nowrap !important;
      overflow-x: auto !important;
      gap: 0.8rem !important;
      padding: 0 1rem !important;
      max-width: 100% !important;
    }
    
    .hand .card {
      flex-shrink: 0 !important;
      min-width: 120px !important;
    }
    
    /* 修復按鈕層級 */
    .action-area {
      position: relative !important;
      z-index: 50 !important;
    }
    
    .main-button {
      position: relative !important;
      z-index: 100 !important;
    }
    
    /* 視覺效果 */
    .card-played-effect {
      animation: cardPlayedPulse 1s ease-out;
    }
    
    @keyframes cardPlayedPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); box-shadow: 0 0 30px #f1c40f; }
      100% { transform: scale(1); }
    }
    
    .score-increase {
      animation: scoreIncrease 1s ease-out;
    }
    
    @keyframes scoreIncrease {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); color: #f1c40f; }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
  
  console.log('✅ UI系統初始化完成');
}

export function cleanup() {
  const elements = [
    document.getElementById('batter-zone'),
    ...document.querySelectorAll('.base'),
    ...document.querySelectorAll('.card')
  ];
  
  elements.forEach(el => {
    if (el) {
      el.onclick = null;
      el.ondragstart = null;
      el.ondragend = null;
    }
  });
}

export function initializeCancelFunctionality() {
  // 暴露取消功能到 window
  window.cancelTargetSelection = function(state, handlers) {
    console.log('❌ 執行取消目標選擇');
    
    const outcomeText = document.getElementById('outcome-text');
    if (outcomeText) {
      outcomeText.textContent = `已取消 ${window.pendingActionCard?.name || '戰術卡'} 的使用`;
    }
    
    // 重置狀態
    window.awaitingTargetSelection = false;
    window.pendingActionCard = null;
    
    // 清除高亮
    document.querySelectorAll('.base, .hand-card').forEach(element => {
      element.classList.remove('selectable-target');
    });
    
    // 重新渲染
    if (handlers && typeof handlers === 'object') {
      const { render } = handlers;
      if (render) {
        render(state, handlers);
      }
    }
  };
  
  // 設置全域按鍵監聽
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.awaitingTargetSelection) {
      e.preventDefault();
      window.cancelTargetSelection(window.gameState, window.currentHandlers);
    }
  });
  
  console.log('✅ 取消功能已初始化');
}

function updateContextualHints(state) {
  const outcomeElement = document.getElementById('outcome-text');
  if (!outcomeElement) return;
  
  // 如果在目標選擇模式，確保顯示取消提示
  if (window.awaitingTargetSelection && window.pendingActionCard) {
    if (!outcomeElement.textContent.includes('右鍵取消')) {
      const currentText = outcomeElement.textContent;
      outcomeElement.textContent = currentText + ' (右鍵或ESC取消)';
    }
  }
}

// 🆕 新增：更新拖拽提示
function updateDropHint(state) {
  let dropHint = document.getElementById('drop-hint');
  
  if (!dropHint) {
    dropHint = document.createElement('div');
    dropHint.id = 'drop-hint';
    dropHint.className = 'drop-hint';
    
    const centerField = document.querySelector('.center-field');
    if (centerField) {
      centerField.appendChild(dropHint);
    }
  }
  
  if (state.playerTurn && state.selected === -1 && !window.awaitingTargetSelection) {
    dropHint.textContent = '拖拽卡片到此區域進行打擊';
    dropHint.style.display = 'block';
  } else {
    dropHint.style.display = 'none';
  }
}

// 🆕 新增：暴露遊戲記錄函數
window.addGameHistory = addGameHistory;

console.log('✅ UI模組載入完成');

if (typeof window !== 'undefined') {
  // 確保在模組載入後初始化
  setTimeout(initializeUIEnhancements, 100);
  setTimeout(initializeCancelFunctionality, 100);
}

console.log('✅ 動態 OVR 和 UI 改進模組載入完成');