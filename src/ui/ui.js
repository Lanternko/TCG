// src/ui/ui.js - 優化的UI渲染系統

/**
 * 主渲染函數
 */
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
    renderHand(state.player.hand, state.selected, handlers.select, state);
    renderDeckInfo(state.player);
    renderMainButton(state, handlers.button);
    renderActiveEffects(state.activeEffects);
    renderSpecialStates(state);
    
    console.log('✅ UI渲染完成');
    
  } catch (error) {
    console.error('❌ UI渲染失敗:', error);
  }
}

/**
 * 渲染分數
 */
function renderScore(score) {
  const awayScore = document.getElementById('away-score');
  const homeScore = document.getElementById('home-score');
  
  if (awayScore) awayScore.textContent = score.away;
  if (homeScore) homeScore.textContent = score.home;
}

/**
 * 渲染出局燈
 */
function renderOuts(outs) {
  const outLights = document.querySelectorAll('.out-light');
  outLights.forEach((light, index) => {
    light.classList.toggle('active', index < outs);
  });
}

/**
 * 渲染局數
 */
function renderInning(inning, half) {
  const inningDisplay = document.getElementById('inning-display');
  if (!inningDisplay) return;
  
  const inningSuffix = ['st', 'nd', 'rd'][inning - 1] || 'th';
  const halfText = half === 'top' ? '上' : '下';
  inningDisplay.textContent = `${inning}${inningSuffix} ${halfText}`;
}

/**
 * 渲染壘包
 */
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

/**
 * 渲染投手卡（左右分佈）
 */
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

/**
 * 渲染手牌（修復點擊事件）
 */
function renderHand(hand, selectedIndex, selectHandler, state) {
  const handContainer = document.getElementById('player-hand');
  if (!handContainer) return;
  
  console.log('🎯 渲染手牌:', {
    handSize: hand.length,
    selected: selectedIndex,
    hasSelectHandler: !!selectHandler
  });
  
  handContainer.innerHTML = '';

  hand.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card hand-card';
    
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
    
    // 重要：綁定點擊事件
    cardEl.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🎯 卡牌點擊:', index, card.name);
      if (selectHandler) {
        selectHandler(index);
      }
    });
    
    // 添加鍵盤支援
    cardEl.tabIndex = 0;
    cardEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (selectHandler) {
          selectHandler(index);
        }
      }
    });
    
    handContainer.appendChild(cardEl);
  });
}

/**
 * 渲染主按鈕（修復事件綁定）
 */
function renderMainButton(state, buttonHandler) {
  const button = document.getElementById('main-button');
  if (!button) return;
  
  const gameStarted = !!state.cpu.activePitcher;
  
  // 移除舊的事件監聽器
  const newButton = button.cloneNode(true);
  button.parentNode.replaceChild(newButton, button);
  
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

/**
 * 渲染牌組資訊
 */
function renderDeckInfo(player) {
  const deckCount = document.getElementById('player-deck-count');
  const discardCount = document.getElementById('player-discard-count');
  
  if (deckCount) deckCount.textContent = player.deck.length;
  if (discardCount) discardCount.textContent = player.discard.length;
}

/**
 * 渲染活躍效果
 */
function renderActiveEffects(activeEffects) {
  const display = document.getElementById('active-effects-display');
  if (!display) return;
  
  display.innerHTML = '';
  
  if (activeEffects.length > 0) {
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

/**
 * 渲染特殊狀態
 */
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

/**
 * 獲取卡牌描述
 */
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

/**
 * 更新結果文字
 */
export function updateOutcomeText(message) {
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = message;
    outcomeText.style.color = '#f39c12';
  }
}

/**
 * 更新錯誤文字
 */
export function updateErrorText(message) {
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = message;
    outcomeText.style.color = '#e74c3c';
  }
}

/**
 * 添加視覺效果
 */
export function addVisualEffect(type, target) {
  // 未來可以添加動畫效果
  console.log(`✨ 視覺效果: ${type} -> ${target}`);
}

console.log('✅ UI模組載入完成');