// src/ui/ui.js - 增強的UI系統

export function render(state, handlers) {
  try {
    console.log('🎨 開始渲染UI...', {
      playerTurn: state.playerTurn,
      selected: state.selected,
      handSize: state.player.hand.length,
      outs: state.outs,
      bases: state.bases.map(b => b ? b.name : null)
    });
    
    renderScore(state.score);
    renderOuts(state.outs);
    renderInning(state.currentInning, state.half);
    renderBases(state.bases, handlers.baseClick);
    renderPitchers(state.cpu.activePitcher, state.player.pitcher);
    renderBatterZone(state);
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

// 🔧 修復：renderBases 函數 - 正確的壘包順序和目標選擇
function renderBases(bases, baseClickHandler) {
  // 🔧 修復：正確的壘包順序 3B-2B-1B
  const baseConfig = [
    { id: 'first-base', index: 0, label: '1B', order: 3 },   // 1B 顯示在最右邊
    { id: 'second-base', index: 1, label: '2B', order: 2 },  // 2B 顯示在中間  
    { id: 'third-base', index: 2, label: '3B', order: 1 }    // 3B 顯示在最左邊
  ];
  
  baseConfig.forEach(({ id, index, label, order }) => {
    let baseElement = document.getElementById(id);
    const card = bases[index];
    
    // 🆕 新增：確保壘包元素存在
    if (!baseElement) {
      console.warn(`⚠️ 找不到壘包元素: ${id}`);
      return;
    }
    
    // 設置壘包順序（CSS order 屬性）
    baseElement.style.order = order;
    baseElement.dataset.baseIndex = index;
    
    // 更新壘包狀態
    baseElement.classList.toggle('occupied', !!card);
    baseElement.classList.toggle('locked', card && card.locked);
    
    if (card) {
      // 🔧 修復：顯示詳細的球員資訊
      baseElement.innerHTML = `
        <div class="base-player-info">
          <div class="player-name">${card.name}</div>
          <div class="player-band">${card.band || ''}</div>
          ${card.locked ? '<div class="locked-indicator">🔒</div>' : ''}
        </div>
      `;
      
      // 🔧 修復：綁定點擊事件用於目標選擇
      baseElement.onclick = () => {
        console.log('🎯 壘包點擊:', index, card.name);
        if (baseClickHandler) {
          baseClickHandler(index);
        }
      };
      
      // 顯示光環效果
      if (card.effects && card.effects.aura) {
        baseElement.classList.add('has-aura');
        baseElement.title = `${card.name} - 光環: ${card.effects.aura.description}`;
      }
      
    } else {
      baseElement.innerHTML = label;
      baseElement.onclick = null;
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

// 🔧 修復：renderHand 函數 - 增強懸停效果和拖拽
function renderHand(hand, selectedIndex, handlers) {
  const handContainer = document.getElementById('player-hand');
  if (!handContainer) return;
  
  console.log('🎯 渲染手牌:', {
    handSize: hand.length,
    selected: selectedIndex,
    hasSelectHandler: !!handlers.select
  });
  
  handContainer.innerHTML = '';
  
  hand.forEach((card, index) => {
    const cardEl = createEnhancedCardElement(card, index, selectedIndex, handlers);
    handContainer.appendChild(cardEl);
  });
}

// 🆕 新增：創建增強的卡牌元素
function createEnhancedCardElement(card, index, selectedIndex, handlers) {
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
  
  // 🔧 修復：計算動態數值（包含臨時加成）
  const dynamicStats = calculateDynamicStats(card);
  
  let cardStats = '';
  if (card.type === 'batter') {
    // 🔧 修復：顯示臨時加成的數值
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
  
  cardEl.innerHTML = `
    <div class="card-name">${card.name}</div>
    <div class="card-ovr">${card.ovr}</div>
    ${cardStats}
    ${instrument}
    ${band}
    <div class="card-description">${description}</div>
    ${bonusIndicator}
  `;
  
  // 🔧 修復：增強的事件處理
  setupCardEvents(cardEl, card, index, handlers);
  
  return cardEl;
}

// 🆕 新增：設置卡牌事件處理
function setupCardEvents(cardEl, card, index, handlers) {
  // 點擊選擇
  cardEl.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 卡牌點擊:', index, card.name);
    if (handlers.select) {
      handlers.select(index);
    }
  });
  
  // 🔧 修復：拖拽事件
  cardEl.addEventListener('dragstart', (e) => {
    console.log('🎯 開始拖拽:', index, card.name);
    cardEl.classList.add('dragging');
    e.dataTransfer.setData('text/plain', index.toString());
  });
  
  cardEl.addEventListener('dragend', (e) => {
    console.log('🎯 拖拽結束:', index);
    cardEl.classList.remove('dragging');
  });
  
  // 🆕 新增：懸停工具提示
  cardEl.addEventListener('mouseenter', (e) => {
    showCardTooltip(card, e.pageX, e.pageY);
  });
  
  cardEl.addEventListener('mouseleave', () => {
    hideCardTooltip();
  });
}

// 🆕 新增：卡牌工具提示系統
let currentTooltip = null;

function showCardTooltip(card, x, y) {
  hideCardTooltip(); // 移除現有工具提示
  
  currentTooltip = document.createElement('div');
  currentTooltip.className = 'card-tooltip';
  currentTooltip.style.cssText = `
    position: absolute;
    left: ${x + 15}px;
    top: ${y - 80}px;
    background: rgba(0,0,0,0.95);
    color: #fff;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    border: 2px solid #4a5a6a;
    font-size: 0.9rem;
    max-width: 350px;
    word-wrap: break-word;
    z-index: 2000;
    box-shadow: 0 8px 25px rgba(0,0,0,0.6);
    backdrop-filter: blur(8px);
    pointer-events: none;
  `;
  
  let tooltipContent = `<strong>${card.name}</strong><br>`;
  
  if (card.type === 'batter' && card.stats) {
    const stats = calculateDynamicStats(card);
    tooltipContent += `<span style="color: #f1c40f;">POW: ${stats.power} | HIT: ${stats.hitRate}<br>`;
    tooltipContent += `CON: ${stats.contact} | SPD: ${stats.speed}</span><br>`;
  }
  
  if (card.band) {
    tooltipContent += `<em style="color: #3498db;">${card.band}</em><br>`;
  }
  
  if (card.description) {
    tooltipContent += `<br><span style="color: #bdc3c7;">${card.description}</span>`;
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
// 🔧 修復：calculateDynamicStats 函數
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

// 🆕 新增：檢查是否有臨時加成
function hasTempBonus(card) {
  return card.tempBonus && Object.keys(card.tempBonus).length > 0;
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

// 🔧 修復：renderSpecialStates 函數 - 顯示特殊狀態
function renderSpecialStates(state) {
  const container = document.getElementById('special-states');
  if (!container) return;
  
  container.innerHTML = '';
  
  // 檢查 MyGO 協同
  if (state.player.team.id === 'MGO') {
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


// 🆕 新增：創建特殊狀態元素
function createSpecialStateElement(text, count, type) {
  const stateEl = document.createElement('div');
  stateEl.className = `special-state ${type}`;
  stateEl.textContent = `${text} (${count}人)`;
  return stateEl;
}

function getCardDescription(card) {
  if (!card) return "";
  
  if (card.effects) {
    const effects = ['play', 'synergy', 'aura', 'death', 'passive'];
    for (const effectType of effects) {
      if (card.effects[effectType] && card.effects[effectType].description) {
        return card.effects[effectType].description;
      }
    }
  }
  
  if (card.type === 'action') {
    return card.rarity ? `${card.rarity} 戰術卡` : '戰術卡';
  }
  
  if (card.instrument) {
    return `${card.instrument} 演奏者`;
  }
  
  return '';
}

// 更新結果文字
export function updateOutcomeText(message) {
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = message;
    outcomeText.style.color = '#f39c12';
  }
}

// 更新錯誤文字
export function updateErrorText(message) {
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = message;
    outcomeText.style.color = '#e74c3c';
  }
}

// 視覺效果
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

// 初始化UI
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

// 清理函數
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

console.log('✅ UI模組載入完成');