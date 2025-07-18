// src/ui/ui.js

/**
 * Main render function that coordinates all UI component updates
 * @param {object} state - Global game state object
 * @param {object} handlers - Event handler object (select, button)
 */
export function render(state, handlers) {
  // Update all UI blocks
  renderScore(state.score);
  renderOuts(state.outs);
  renderInning(state.currentInning, state.half);
  renderBases(state.bases);
  renderCpuPitcher(state.cpu.activePitcher);
  renderPlayerPitcher(state.player.pitcher); // NEW: Render player's pitcher
  renderHand(state.player.hand, state.selected, handlers.select, state);
  renderDeckInfo(state.player);
  renderMainButton(state);
  
  // Bind main button event (if not already bound)
  const button = document.getElementById('main-button');
  if (!button.onclick) {
    button.onclick = handlers.button;
  }
}

// --- Helper render functions for individual UI blocks ---

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
      <div class="card-ovr">${pitcher.ovr}</div>
      <div class="card-stats">POW:${pitcher.stats.power} VEL:${pitcher.stats.velocity}<br>CTL:${pitcher.stats.control} TEC:${pitcher.stats.technique}</div>
    </div>` : '';
}

/**
 * NEW: Render player's pitcher card
 * @param {object} pitcher - Player's pitcher object
 */
function renderPlayerPitcher(pitcher) {
  const pitcherArea = document.getElementById('player-pitcher-area');
  if (!pitcherArea) return;
  pitcherArea.innerHTML = pitcher ? `
    <div class="card">
      <div class="card-name">${pitcher.name}</div>
      <div class="card-ovr">${pitcher.ovr}</div>
      <div class="card-stats">POW:${pitcher.stats.power} VEL:${pitcher.stats.velocity}<br>CTL:${pitcher.stats.control} TEC:${pitcher.stats.technique}</div>
    </div>` : '';
}

function renderHand(hand, selectedIndex, selectHandler, state) {
  const handContainer = document.getElementById('player-hand');
  if (!handContainer) return;
  handContainer.innerHTML = '';

  hand.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    
    if (index === selectedIndex) {
      cardEl.classList.add('selected');
    }
    
    // NEW: Add action card styling
    if (card.type === 'action') {
      cardEl.classList.add('action-card');
    }
    
    // NEW: Check if card can trigger special effects
    if (canTriggerEffect(card, state)) {
      cardEl.classList.add('effect-active');
    }

    // Generate stats or description based on card type
    let cardContent = '';
    if (card.type === 'batter') {
      cardContent = `POW:${card.stats.power} HIT:${card.stats.hitRate}<br>CON:${card.stats.contact} SPD:${card.stats.speed}`;
    } else if (card.type === 'action') {
      cardContent = getCardDescription(card);
    }

    const description = getCardDescription(card);

    cardEl.innerHTML = `
      <div class="card-name">${card.name}</div>
      <div class="card-ovr">${card.ovr}</div>
      <div class="card-stats">${cardContent}</div>
      ${description ? `<div class="card-description">${description}</div>` : ''}`;
      
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
  
  // Check if game has started (e.g., check if pitcher exists)
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
    button.textContent = "客隊回合";
    button.disabled = true;
  }
}

// --- NEW: Helper functions for card effects ---

/**
 * Check if a card can trigger special effects based on current game state
 * @param {object} card - Card to check
 * @param {object} state - Current game state
 * @returns {boolean} - Whether card can trigger effects
 */
function canTriggerEffect(card, state) {
  if (!card.effects) return false;
  
  // Check for different effect triggers
  if (card.effects.synergy) {
    const condition = card.effects.synergy.condition;
    if (condition === "onBase" && card.name === "Socrates") {
      return state.bases.some(b => b && b.name === "Socrates");
    }
    if (condition === "philosopherOnSecond" && card.name === "Zeno of Elea") {
      return state.bases[1] && state.bases[1].name !== "Zeno of Elea";
    }
  }
  
  if (card.effects.aura) {
    const condition = card.effects.aura.condition;
    if (condition === "onBase") {
      return state.bases.some(b => b && b.name === card.name);
    }
  }
  
  // Action cards can always be played (if conditions are met)
  if (card.type === "action") {
    const effect = card.effects.play;
    if (effect.action === "steal") {
      return state.bases[0] !== null; // Need runner on first
    }
    if (effect.action === "bunt") {
      return state.bases.some(Boolean); // Need any runner on base
    }
    return true; // Other action cards can always be played
  }
  
  return false;
}

/**
 * Get description text for a card
 * @param {object} card - Card object
 * @returns {string} - Description text
 */
function getCardDescription(card) {
  if (card.type === 'action' && card.effects && card.effects.play) {
    return card.effects.play.description;
  }
  
  if (card.effects) {
    const effectTypes = Object.keys(card.effects);
    if (effectTypes.length > 0) {
      const firstEffect = card.effects[effectTypes[0]];
      if (firstEffect.description) {
        return firstEffect.description;
      }
      // Generate description from effect data
      if (effectTypes.includes('synergy')) {
        return "協作效果：在壘上時觸發";
      }
      if (effectTypes.includes('aura')) {
        return "光環效果：影響其他球員";
      }
      if (effectTypes.includes('play')) {
        return "出牌效果：打擊時觸發";
      }
      if (effectTypes.includes('death')) {
        return "死亡效果：出局時觸發";
      }
    }
  }
  
  return "";
}