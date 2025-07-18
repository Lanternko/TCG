// src/ui/ui.js

/**
 * Main render function that coordinates all UI component updates
 * @param {object} state - Global game state object
 * @param {object} handlers - Event handler object (select, button)
 */
export function render(state, handlers) {
  renderScore(state.score);
  renderOuts(state.outs);
  renderInning(state.currentInning, state.half);
  renderBases(state.bases);
  renderCpuPitcher(state.cpu.activePitcher);
  renderPlayerPitcher(state.player.pitcher);
  renderHand(state.player.hand, state.selected, handlers.select, state);
  renderDeckInfo(state.player);
  renderMainButton(state);
  renderActiveEffects(state.activeEffects); // --- NEW ---
  
  const button = document.getElementById('main-button');
  if (!button.onclick) {
    button.onclick = handlers.button;
  }
}


// --- Helper render functions ---

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
    <div class="team-indicator away">客隊投手</div>
    <div class="card">
      <div class="card-name">${pitcher.name}</div>
      <div class="card-ovr">${pitcher.ovr}</div>
      <div class="card-stats">POW:${pitcher.stats.power} VEL:${pitcher.stats.velocity}<br>CTL:${pitcher.stats.control} TEC:${pitcher.stats.technique}</div>
    </div>` : '';
}

function renderPlayerPitcher(pitcher) {
  const pitcherArea = document.getElementById('player-pitcher-area');
  if (!pitcherArea) return;
  pitcherArea.innerHTML = pitcher ? `
    <div class="team-indicator home">主隊投手</div>
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
    
    if (card.type === 'action') {
      cardEl.classList.add('action-card');
    }

    let cardStats = '';
    if (card.type === 'batter') {
      cardStats = `POW:${card.stats.power} HIT:${card.stats.hitRate}<br>CON:${card.stats.contact} SPD:${card.stats.speed}`;
    }
    // --- UPDATED: Always show description for all card types ---
    const description = getCardDescription(card, 'short');

    cardEl.innerHTML = `
      <div class="card-name">${card.name}</div>
      <div class="card-ovr">${card.ovr}</div>
      <div class="card-stats">${cardStats}</div>
      <div class="card-description">${description}</div>`;
      
    cardEl.onclick = () => selectHandler(index);
    handContainer.appendChild(cardEl);
  });
}

// --- NEW: Render Active Effects ---
function renderActiveEffects(activeEffects) {
    const display = document.getElementById('active-effects-display');
    if (!display) return;
    display.innerHTML = ''; // Clear previous effects
    if (activeEffects.length > 0) {
        display.innerHTML = '場上效果：';
        activeEffects.forEach(effect => {
            const effectEl = document.createElement('span');
            effectEl.className = 'effect';
            effectEl.textContent = `[${effect.cardName}] ${getCardDescription(effect, 'effect')}`;
            display.appendChild(effectEl);
        });
    }
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

function getCardDescription(card, context = 'full') {
    if (!card) return "";

    // For rendering active effects
    if (context === 'effect' && card.description) {
        return card.description;
    }
    
    if (card.effects) {
        const effect = card.effects.play || card.effects.synergy || card.effects.aura || card.effects.death;
        if (effect && effect.description) {
            return effect.description;
        }
    }
    
    if (card.type === 'action') {
        return card.effects?.play?.description || '戰術卡';
    }

    if (context === 'short') { // For cards in hand
        const effect = card.effects?.play || card.effects?.synergy || card.effects?.aura || card.effects?.death;
        return effect?.description || '';
    }

    return "";
}

// --- Helper functions for card effects ---

function canTriggerEffect(card, state) {
  if (!card.effects) return false;
  
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
  
  if (card.type === "action") {
    const effect = card.effects.play;
    if (effect.action === "steal") {
      return state.bases[0] !== null; // Need runner on first
    }
    if (effect.action === "bunt") {
      return state.bases.some(Boolean); // Need any runner on base
    }
    return true;
  }
  
  return false;
}

