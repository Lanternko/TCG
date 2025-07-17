// src/ui/ui.js
/**
 * 主渲染函數，協調所有 UI 元件的更新
 * @param {object} state - 全局遊戲狀態物件
 * @param {object} handlers - 事件處理器物件 (select, button)
 */
export function render(state, handlers) {
  // 更新所有 UI 區塊
  renderScore(state.score);
  renderOuts(state.outs);
  renderInning(state.currentInning, state.half);
  renderBases(state.bases);
  renderCpuPitcher(state.cpu.activePitcher);
  renderHand(state.player.hand, state.selected, handlers.select);
  renderDeckInfo(state.player);
  renderMainButton(state);
  
  // 綁定主按鈕事件 (如果尚未綁定)
  const button = document.getElementById('main-button');
  if (!button.onclick) {
    button.onclick = handlers.button;
  }
}

// --- 以下是各個 UI 區塊的輔助渲染函數 ---

function renderScore(score) {
  document.getElementById('away-score').textContent = score.away;
  document.getElementById('home-score').textContent = score.home;
}

function renderOuts(outs) {
  document.querySelectorAll('.out-light').forEach((light, index) => {
    light.classList.toggle('active', index < outs);
  });
}

function renderInning(inning, half) {
  const inningDisplay = document.getElementById('inning-display');
  if (!inningDisplay) return;
  const inningSuffix = ['st', 'nd', 'rd'][inning - 1] || 'th';
  inningDisplay.innerHTML = `<span class="inning-indicator ${half}"></span> ${inning}${inningSuffix}`;
}

function renderBases(bases) {
  document.getElementById('first-base')?.classList.toggle('occupied', !!bases[0]);
  document.getElementById('second-base')?.classList.toggle('occupied', !!bases[1]);
  document.getElementById('third-base')?.classList.toggle('occupied', !!bases[2]);
}

function renderCpuPitcher(pitcher) {
  const pitcherArea = document.getElementById('cpu-pitcher-area');
  if (!pitcherArea) return;
  pitcherArea.innerHTML = pitcher ? `
    <div class="card">
      <div class="card-name">${pitcher.name}</div>
      <div class="card-ovr">${pitcher.stats.ovr}</div>
      <div class="card-stats">POW:${pitcher.stats.power} VEL:${pitcher.stats.velocity} CTL:${pitcher.stats.control}</div>
    </div>` : '';
}

function renderHand(hand, selectedIndex, selectHandler) {
  const handContainer = document.getElementById('player-hand');
  if (!handContainer) return;
  handContainer.innerHTML = '';

  hand.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    if (index === selectedIndex) {
      cardEl.classList.add('selected');
    }
    
    // --- 新增的邏輯 ---
    if (card.type === 'action') {
      cardEl.classList.add('action-card'); // 為戰術卡新增 class
    }
    // --- 結束 ---

    // 根據卡牌類型，顯示不同的資訊
    const statsHTML = card.type === 'batter'
      ? `POW:${card.stats.power} HIT:${card.stats.hitRate} CON:${card.stats.contact}`
      : card.effects.play.description; // 戰術卡直接顯示描述

    cardEl.innerHTML = `
      <div class="card-name">${card.name}</div>
      <div class="card-ovr">${card.ovr}</div>
      <div class="card-stats">${statsHTML}</div>`;
      
    cardEl.onclick = () => selectHandler(index);
    handContainer.appendChild(cardEl);
  });
}

function renderDeckInfo(player) {
  const deckCount = document.getElementById('player-deck-count');
  const discardCount = document.getElementById('player-discard-count');
  if (deckCount) deckCount.textContent = player.deck.length;
  if (discardCount) discardCount.textContent = player.discard.length;
}

function renderMainButton(state) {
  const button = document.getElementById('main-button');
  if (!button) return;
  
  // 檢查遊戲是否已開始 (例如，檢查投手是否存在)
  const gameStarted = !!state.cpu.activePitcher;

  if (state.over) {
    button.textContent = "比賽結束";
    button.disabled = true;
  } else if (!gameStarted) {
    button.textContent = "Play Ball";
    button.disabled = false;
  } else if (state.playerTurn) {
    button.disabled = state.selected === -1;
    button.textContent = state.selected === -1 ? "選擇卡牌" : "確認出牌";
  } else {
    button.textContent = "對手回合";
    button.disabled = true;
  }
}