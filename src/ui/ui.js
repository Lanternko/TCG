// src/ui/ui.js - 增強的UI渲染系統

export function render(state, handlers) {
  try {
    console.log('🎨 開始渲染UI...', {
      playerTurn: state.playerTurn,
      selected: state.selected,
      handSize: state.player.hand.length,
      outs: state.outs
    });
    
    renderScore(state.score);
    renderOuts(state.outs);
    renderInning(state.currentInning, state.half);
    renderBases(state.bases);
    renderPitchers(state.cpu.activePitcher, state.player.pitcher);
    renderHand(state.player.hand, state.selected, handlers);
    renderDeckInfo(state.player);
    renderMainButton(state, handlers.button);
    renderActiveEffects(state.activeEffects);
    renderSpecialStates(state);
    
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

function renderBases(bases) {
  const baseElements = [
    document.getElementById('first-base'),
    document.getElementById('second-base'),
    document.getElementById('third-base')
  ];
  
  baseElements.forEach((element, index) => {
    if (!element) return;
    
    const card = bases[index];
    const isOccupied = !!card;
    const isLocked = card && card.locked;
    
    element.classList.toggle('occupied', isOccupied);
    element.classList.toggle('locked', isLocked);
    
    if (isOccupied) {
      element.title = `${card.name} (${card.band || 'Unknown'})`;
    } else {
      element.title = '';
    }
  });
}

function renderPitchers(cpuPitcher, playerPitcher) {
  const cpuPitcherArea = document.getElementById('cpu-pitcher-area');
  const playerPitcherArea = document.getElementById('player-pitcher-area');
  
  // 渲染CPU投手（左側）
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
  
  // 渲染玩家投手（右側）
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
  if (!handContainer) return;
  
  console.log('🎯 渲染手牌:', {
    handSize: hand.length,
    selected: selectedIndex,
    hasSelectHandler: !!handlers.select
  });
  
  handContainer.innerHTML = '';
  
  // 確保手牌容器使用單行布局
  handContainer.style.flexWrap = 'nowrap';
  handContainer.style.overflowX = 'auto';
  handContainer.style.maxWidth = '100%';
  
  hand.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card hand-card';
    cardEl.setAttribute('data-card-index', index);
    cardEl.draggable = true;
    
    // 添加選中狀態
    if (index === selectedIndex) {
      cardEl.classList.add('selected');
    }
    
    // 添加卡牌類型樣式
    if (card.type === 'action') {
      cardEl.classList.add('action-card');
    } else if (card.type === 'batter') {
      cardEl.classList.add('batter-card');
    }
    
    // 構建卡牌內容
    let cardStats = '';
    if (card.type === 'batter') {
      cardStats = `
        <div class="card-stats">
          POW: ${card.stats.power} HIT: ${card.stats.hitRate}<br>
          CON: ${card.stats.contact} SPD: ${card.stats.speed}
        </div>
      `;
    }
    
    const description = getCardDescription(card);
    const instrument = card.instrument ? `<div class="card-instrument">🎵 ${card.instrument}</div>` : '';
    const band = card.band ? `<div class="card-band">${card.band}</div>` : '';
    
    cardEl.innerHTML = `
      <div class="card-name">${card.name}</div>
      <div class="card-ovr">${card.ovr}</div>
      ${cardStats}
      ${instrument}
      ${band}
      <div class="card-description">${description}</div>
    `;
    
    // 點擊事件
    cardEl.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🎯 卡牌點擊:', index, card.name);
      if (handlers.select) {
        handlers.select(index);
      }
    });
    
    // 拖拽事件
    cardEl.addEventListener('dragstart', (e) => {
      console.log('🎯 開始拖拽:', index, card.name);
      cardEl.classList.add('dragging');
      e.dataTransfer.setData('text/plain', index.toString());
      
      if (handlers.dragStart) {
        handlers.dragStart(index, card);
      }
    });
    
    cardEl.addEventListener('dragend', (e) => {
      console.log('🎯 拖拽結束:', index);
      cardEl.classList.remove('dragging');
    });
    
    // 鍵盤支援
    cardEl.tabIndex = 0;
    cardEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (handlers.select) {
          handlers.select(index);
        }
      }
    });
    
    handContainer.appendChild(cardEl);
  });
}

function renderMainButton(state, buttonHandler) {
  const button = document.getElementById('main-button');
  if (!button) return;
  
  const gameStarted = !!state.cpu.activePitcher;
  
  // 移除舊的事件監聽器
  const newButton = button.cloneNode(true);
  button.parentNode.replaceChild(newButton, button);
  
  // 調整按鈕位置，避免遮擋投手卡
  newButton.style.position = 'relative';
  newButton.style.zIndex = '5';
  
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
  
  // 重新綁定事件
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

function renderSpecialStates(state) {
  const container = document.getElementById('special-states');
  if (!container) return;
  
  container.innerHTML = '';
  
  // 檢查MyGO協同
  if (state.mygoInitialized) {
    const mygoOnBase = state.bases.filter(card => card && card.band === 'MyGO!!!!!').length;
    const mujicaOnBase = state.bases.filter(card => card && card.band === 'Mujica').length;
    
    if (mygoOnBase >= 3) {
      const stateEl = document.createElement('div');
      stateEl.className = 'special-state mygo-synergy';
      stateEl.textContent = `🎵 MyGO協同 (${mygoOnBase}人)`;
      container.appendChild(stateEl);
    }
    
    if (mujicaOnBase >= 3) {
      const stateEl = document.createElement('div');
      stateEl.className = 'special-state mujica-synergy';
      stateEl.textContent = `🖤 Mujica威壓 (${mujicaOnBase}人)`;
      container.appendChild(stateEl);
    }
  }
  
  // 檢查鎖定角色
  if (state.lockedCharacters && state.lockedCharacters.length > 0) {
    const stateEl = document.createElement('div');
    stateEl.className = 'special-state locked';
    stateEl.textContent = `🔒 鎖定 (${state.lockedCharacters.length}人)`;
    container.appendChild(stateEl);
  }
}

function getCardDescription(card) {
  if (!card) return "";
  
  // 優先使用effects中的描述
  if (card.effects) {
    const effects = ['play', 'synergy', 'aura', 'death', 'passive'];
    for (const effectType of effects) {
      if (card.effects[effectType] && card.effects[effectType].description) {
        return card.effects[effectType].description;
      }
    }
  }
  
  // 戰術卡的預設描述
  if (card.type === 'action') {
    return card.rarity ? `${card.rarity} 戰術卡` : '戰術卡';
  }
  
  // 根據稀有度或樂器顯示
  if (card.instrument) {
    return `${card.instrument} 演奏者`;
  }
  
  return '';
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
  
  // 卡牌打出效果
  if (type === 'cardPlayed') {
    const targetElement = document.querySelector(target);
    if (targetElement) {
      targetElement.classList.add('card-played-effect');
      setTimeout(() => {
        targetElement.classList.remove('card-played-effect');
      }, 1000);
    }
  }
  
  // 得分效果
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

// 設置拖拽區域
export function setupDragDropZones() {
  // 投手區域作為拖拽目標
  const pitcherArea = document.getElementById('player-pitcher-area');
  if (pitcherArea) {
    pitcherArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      pitcherArea.classList.add('drag-over');
    });
    
    pitcherArea.addEventListener('dragleave', (e) => {
      if (!pitcherArea.contains(e.relatedTarget)) {
        pitcherArea.classList.remove('drag-over');
      }
    });
    
    pitcherArea.addEventListener('drop', (e) => {
      e.preventDefault();
      pitcherArea.classList.remove('drag-over');
      
      const cardIndex = parseInt(e.dataTransfer.getData('text/plain'));
      console.log('🎯 卡牌拖拽到投手區域:', cardIndex);
      
      // 觸發自定義事件
      const dropEvent = new CustomEvent('cardDropped', {
        detail: { cardIndex, target: 'pitcher-area' }
      });
      document.dispatchEvent(dropEvent);
    });
  }
  
  // 中央區域作為拖拽目標
  const centerField = document.querySelector('.center-field');
  if (centerField) {
    centerField.addEventListener('dragover', (e) => {
      e.preventDefault();
      centerField.classList.add('drag-over');
    });
    
    centerField.addEventListener('dragleave', (e) => {
      if (!centerField.contains(e.relatedTarget)) {
        centerField.classList.remove('drag-over');
      }
    });
    
    centerField.addEventListener('drop', (e) => {
      e.preventDefault();
      centerField.classList.remove('drag-over');
      
      const cardIndex = parseInt(e.dataTransfer.getData('text/plain'));
      console.log('🎯 卡牌拖拽到中央區域:', cardIndex);
      
      // 觸發自定義事件
      const dropEvent = new CustomEvent('cardDropped', {
        detail: { cardIndex, target: 'center-field' }
      });
      document.dispatchEvent(dropEvent);
    });
  }
}

// 初始化UI
export function initializeUI() {
  console.log('🎨 初始化UI系統...');
  
  // 設置拖拽區域
  setupDragDropZones();
  
  // 添加全域樣式
  const style = document.createElement('style');
  style.textContent = `
    /* 拖拽相關樣式 */
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
      z-index: 10 !important;
    }
    
    .main-button {
      position: relative !important;
      z-index: 11 !important;
    }
    
    /* 投手卡片層級 */
    .pitcher-card {
      position: relative !important;
      z-index: 1 !important;
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
    
    /* 響應式手牌調整 */
    @media (max-width: 1200px) {
      .hand .card {
        min-width: 100px !important;
        height: 140px !important;
      }
    }
    
    @media (max-width: 768px) {
      .hand {
        gap: 0.5rem !important;
      }
      
      .hand .card {
        min-width: 85px !important;
        height: 120px !important;
      }
    }
  `;
  document.head.appendChild(style);
  
  console.log('✅ UI系統初始化完成');
}

// 手牌管理輔助函數
export function adjustHandLayout(handSize) {
  const handContainer = document.getElementById('player-hand');
  if (!handContainer) return;
  
  // 根據手牌數量調整卡牌大小
  const cards = handContainer.querySelectorAll('.card');
  cards.forEach(card => {
    if (handSize > 7) {
      card.style.width = '100px';
      card.style.height = '140px';
    } else if (handSize > 5) {
      card.style.width = '120px';
      card.style.height = '170px';
    } else {
      card.style.width = '140px';
      card.style.height = '200px';
    }
  });
}

// 清理函數
export function cleanup() {
  // 移除事件監聽器
  const pitcherArea = document.getElementById('player-pitcher-area');
  const centerField = document.querySelector('.center-field');
  
  if (pitcherArea) {
    pitcherArea.replaceWith(pitcherArea.cloneNode(true));
  }
  
  if (centerField) {
    centerField.replaceWith(centerField.cloneNode(true));
  }
}

console.log('✅ UI模組載入完成');