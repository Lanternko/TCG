// src/ui/ui.js - 增強的UI系統

// 🔧 修改：render 函數 - 添加記錄面板渲染
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
    renderBatterZone(state);
    renderHand(state.player.hand, state.selected, handlers);
    renderDeckInfo(state.player);
    renderMainButton(state, handlers.button);
    renderActiveEffects(state.activeEffects);
    renderSpecialStates(state);
    renderGameLog(state);
    
    // 🆕 新增：更新右鍵功能提示
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

// 🔧 修改：renderBases 函數 - 強化壘包點擊
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
      baseElement.innerHTML = `
        <div class="base-player-info">
          <div class="player-name">${card.name}</div>
          <div class="player-band">${card.band || ''}</div>
          ${card.locked ? '<div class="locked-indicator">🔒</div>' : ''}
        </div>
      `;
      
      // 🔧 修復：增強壘包點擊處理
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

// 🔧 修改：renderHand 函數（已存在，需要更新）
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

// 🆕 新增：createCardElement 函數（如果不存在）
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
  
  // 計算動態數值（包含臨時加成）
  const dynamicStats = calculateDynamicStats(card);
  
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
  
  cardEl.innerHTML = `
    <div class="card-name">${card.name}</div>
    <div class="card-ovr">${card.ovr}</div>
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

// 🔧 修改：setupCardEvents 函數 - 強化目標選擇
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

// 🆕 新增：卡牌工具提示系統（如果不存在）
let currentTooltip = null;

function showCardTooltip(card, x, y) {
  hideCardTooltip(); // 移除現有工具提示
  
  currentTooltip = document.createElement('div');
  currentTooltip.className = 'card-tooltip';
  currentTooltip.style.cssText = `
    position: absolute;
    left: ${Math.min(x + 15, window.innerWidth - 350)}px;
    top: ${Math.max(y - 100, 10)}px;
    background: rgba(0,0,0,0.95);
    color: #fff;
    padding: 1.2rem 1.8rem;
    border-radius: 12px;
    border: 2px solid #4a5a6a;
    font-size: 0.9rem;
    max-width: 350px;
    word-wrap: break-word;
    z-index: 2000;
    box-shadow: 0 8px 25px rgba(0,0,0,0.6);
    backdrop-filter: blur(8px);
    pointer-events: none;
    font-family: 'Inter', sans-serif;
  `;
  
  let tooltipContent = `<strong style="color: #f1c40f; font-size: 1rem;">${card.name}</strong><br>`;
  
  // 顯示 OVR
  if (card.ovr) {
    tooltipContent += `<span style="color: #ffd700; font-weight: bold;">OVR: ${card.ovr}</span><br>`;
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

// 🆕 新增：calculateDynamicStats 函數（如果不存在）
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

// 🆕 新增：增強的遊戲記錄渲染
function renderGameLog(state) {
  let logPanel = document.getElementById('game-log-panel');
  
  if (!logPanel) {
    // 創建記錄面板
    logPanel = document.createElement('div');
    logPanel.id = 'game-log-panel';
    logPanel.className = 'game-log-panel';
    
    // 添加到遊戲容器
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.appendChild(logPanel);
    }
  }
  
  // 更新面板內容
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
    
    <div class="log-section">
      <div class="log-title" style="color: #e67e22;">
        ✨ 活躍效果
      </div>
      <div style="font-size: 0.75rem; color: #95a5a6; line-height: 1.3;">
        ${getActiveEffectsText(state)}
      </div>
    </div>
    
    <div class="log-section">
      <div class="log-title" style="color: #9b59b6;">
        🎯 壘包狀況
      </div>
      <div style="font-size: 0.75rem; color: #95a5a6; line-height: 1.3;">
        ${getBasesStatusText(state)}
      </div>
    </div>
    
    ${window.awaitingTargetSelection ? `
    <div class="log-section" style="border-color: #e74c3c;">
      <div class="log-title" style="color: #e74c3c;">
        🎯 目標選擇中
      </div>
      <div style="font-size: 0.75rem; color: #e74c3c; line-height: 1.3;">
        正在選擇 ${window.pendingActionCard?.name || '戰術卡'} 的目標<br>
        <em>右鍵或點擊空白區域取消</em>
      </div>
    </div>
    ` : ''}
  `;
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

// 🔧 修改：renderSpecialStates 函數（已存在，需要更新）
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

// 🆕 新增：createSpecialStateElement 函數（如果不存在）
function createSpecialStateElement(text, count, type) {
  const stateEl = document.createElement('div');
  stateEl.className = `special-state ${type}`;
  stateEl.textContent = `${text} (${count}人)`;
  return stateEl;
}

// 🔧 修改：getCardDescription 函數（如果已存在則修改，否則新增）
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

// 🔧 修改：getActiveEffectsText 函數 - 更詳細的效果顯示
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

// 🔧 修改：getBasesStatusText 函數 - 更清晰的壘包顯示
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

// 🆕 新增：initializeUIEnhancements 函數 - 初始化 UI 增強功能
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
  `;
  document.head.appendChild(style);
  
  console.log('✅ UI增強初始化完成');
}

// 自動初始化
if (typeof window !== 'undefined') {
  // 確保在模組載入後初始化
  setTimeout(initializeUIEnhancements, 100);
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

// 🆕 新增：更新主函數中的取消選擇功能
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

// 🆕 新增：更新情境提示
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

console.log('✅ UI模組載入完成');

// 自動初始化取消功能
if (typeof window !== 'undefined') {
  setTimeout(initializeCancelFunctionality, 100);
}

console.log('✅ UI事件處理模組載入完成');