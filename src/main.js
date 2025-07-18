// src/main.js (Updated with UI improvements)
import { createGameState } from './engine/game_state.js';
import { render } from './ui/ui.js';
import { simulateAtBat, processCardEffects, applyActionCard } from './engine/sim.js';
import { CONFIG } from './data/config.js';

// =============================================================================
// 1. Initialize game state and event handlers
// =============================================================================

const state = createGameState();

const handlers = {
  /**
   * Handle card selection events
   * @param {number} idx - Index of clicked card
   */
  select: (idx) => {
    if (state.playerTurn) {
      // If clicking on already selected card, deselect; otherwise, select new card
      state.selected = (state.selected === idx) ? -1 : idx;
      render(state, handlers); // Immediately redraw after each selection to update 'selected' styling
    }
  },
  /**
   * Handle main button click events
   */
  button: () => {
    const gameStarted = !!state.cpu.activePitcher;

    if (!gameStarted) {
      // If game hasn't started, initialize decks
      initDecks();
    } else if (state.playerTurn && state.selected !== -1) {
      // If it's player turn and a card is selected, execute player turn
      runPlayerTurn();
    }
    
    // Redraw entire screen after each main button click based on latest state
    render(state, handlers);
  },
};

// =============================================================================
// 2. Core game flow functions
// =============================================================================

/**
 * Initialize all decks, hands, and pitchers
 */
function initDecks() {
  // Initialize player (HOME team)
  const playerTeam = state.player.team;
  state.player.deck = [...playerTeam.batters, ...playerTeam.actionCards].map(prepareCard);
  shuffle(state.player.deck);
  state.player.hand = [];
  state.player.pitcher = prepareCard(playerTeam.pitchers[0]); // NEW: Set player pitcher
  draw(state.player, state.cfg.handSize);

  // Initialize CPU (AWAY team)
  state.cpu.deck = [...state.cpu.team.batters].map(prepareCard);
  state.cpu.activePitcher = prepareCard(state.cpu.team.pitchers[0]);
  
  document.getElementById('outcome-text').textContent = "客隊先攻！";
  
  // Start CPU turn (away team bats first)
  setTimeout(() => {
    runCpuTurn();
  }, 1000);
}

/**
 * Execute a complete player turn
 */
function runPlayerTurn() {
  const card = state.player.hand[state.selected];
  if (!card) return;

  // --- Core change: decide flow based on card type ---
  if (card.type === 'batter') {
    // 1. If it's a batter card, execute original batting flow
    processCardEffects(card, 'play', state);
    const result = simulateAtBat(card, state.cpu.activePitcher, state);
    processAtBatOutcome(result, card);
  } else if (card.type === 'action') {
    // 2. If it's an action card, execute new tactical flow
    const description = applyActionCard(card, state);
    document.getElementById('outcome-text').textContent = description;
  }

  // --- State update phase ---
  // Remove card from hand, add to discard pile
  state.player.hand.splice(state.selected, 1);
  state.player.discard.push(card);
  draw(state.player, 1); // Draw a new card
  state.selected = -1; // Reset selection

  // Clean up one-time effects (e.g., effects that only last one at-bat)
  state.activeEffects = state.activeEffects.filter(e => e.duration !== "atBat");

  // --- End of turn check --- 
  render(state, handlers); // First render this at-bat's result

  if (state.outs >= 3) {
    // Use setTimeout to give player 1.5 seconds to view result, then change sides
    setTimeout(changeHalfInning, 1500);
  }
}

/**
 * Process at-bat outcome, update score, outs, and bases
 * @param {object} result - Simulation result
 * @param {object} card - Batting card
 */
function processAtBatOutcome(result, card) {
  document.getElementById('outcome-text').textContent = result.description;

  if (result.type === 'K' || result.type === 'OUT') {
    state.outs++;
    processCardEffects(card, 'death', state); // Handle 'death' effects
    // Handle permanent effects (like Aristotle)
    const deathEffect = card.effects?.death;
    if (deathEffect?.duration === 'permanent') {
        state.player.deck.forEach(c => c.stats[deathEffect.stat] += deathEffect.value);
        state.player.hand.forEach(c => c.stats[deathEffect.stat] += deathEffect.value);
        state.player.discard.forEach(c => c.stats[deathEffect.stat] += deathEffect.value);
    }
  } else {
    // If safely on base, handle 'aura' and 'synergy' effects
    processCardEffects(card, 'aura', state);
    processCardEffects(card, 'synergy', state);

    // Advance runners and score (this is a simplified version, can be expanded more complexly in future)
    const runners = state.bases.filter(Boolean); // Current runners on base
    runners.push(card); // Batter also counts
    state.bases = [null, null, null]; // Clear bases to reset
    let scoreGained = 0;

    runners.forEach(runner => {
      // Assume each runner advances result.adv bases
      const currentBase = state.bases.indexOf(runner); // -1 if not on base
      const newBaseIndex = currentBase + result.adv;
      if (newBaseIndex >= 3) {
        scoreGained++; // Runner reaches home and scores
      } else {
        state.bases[newBaseIndex] = runner; // Advance to new base
      }
    });

    // Update score
    const currentScorer = state.half === 'top' ? 'away' : 'home';
    state.score[currentScorer] += scoreGained;
  }
}

/**
 * Change sides
 */
function changeHalfInning() {
  // Reset state
  state.outs = 0;
  state.bases = [null, null, null];
  state.activeEffects = state.activeEffects.filter(e => e.duration !== "inning");

  if (state.half === 'top') {
    // Switch to HOME team batting (player)
    state.half = 'bottom';
    state.playerTurn = true;
    document.getElementById('outcome-text').textContent = "輪到主隊打擊！";
  } else {
    // Switch to AWAY team batting (CPU)
    state.half = 'top';
    state.currentInning++;
    state.playerTurn = false;
    document.getElementById('outcome-text').textContent = "客隊打擊中...";
    setTimeout(() => {
      runCpuTurn();
    }, 1000);
  }

  // Check if game is over
  if (state.currentInning > state.cfg.innings) {
    state.over = true;
    const winner = state.score.home > state.score.away ? "主隊勝利!" : 
                  state.score.away > state.score.home ? "客隊勝利!" : "平手!";
    document.getElementById('outcome-text').textContent = `比賽結束！${winner} 終場比數 ${state.score.away} : ${state.score.home}`;
  }

  render(state, handlers);
}

/**
 * Simulate CPU's complete turn
 */
function runCpuTurn() {
  let cpuOuts = 0;
  let cpuBatterIndex = 0;
  const playerPitcher = state.player.pitcher; // NEW: Use player's pitcher

  // Use setInterval to simulate one-by-one at-bats, letting player see the process
  const turnInterval = setInterval(() => {
    if (cpuOuts >= 3) {
      clearInterval(turnInterval);
      changeHalfInning(); // 3 outs, change sides
      return;
    }

    const batter = state.cpu.deck[cpuBatterIndex % state.cpu.deck.length];
    const result = simulateAtBat(batter, playerPitcher, state);

    if (result.type === 'K' || result.type === 'OUT') {
      cpuOuts++;
    } else {
      // Simplified CPU scoring logic
      let points = 0;
      switch (result.type) {
        case 'HR': points = 1 + state.bases.filter(Boolean).length; break;
        case '3B': points = 1; break; // Simplified handling
        case '2B': points = 1; break;
        case '1B': points = 1; break;
      }
      state.score.away += points; // CPU is away team
    }
    
    document.getElementById('outcome-text').textContent = result.description;
    cpuBatterIndex++;
    render(state, handlers); // Update screen after each CPU at-bat
  }, 1000); // Hit once per second
}

// =============================================================================
// 3. Utility helper functions
// =============================================================================

/**
 * NEW: Prepare a card by calculating OVR and other properties
 * @param {object} cardData - Raw card data
 * @returns {object} - Prepared card with OVR
 */
function prepareCard(cardData) {
  const card = { ...cardData };
  if (card.type === 'batter') {
    card.ovr = calculateBatterOVR(card.stats);
  } else if (card.type === 'pitcher') {
    card.ovr = calculatePitcherOVR(card.stats);
  } else if (card.type === 'action') {
    card.ovr = "戰術";
  }
  return card;
}

/**
 * NEW: Calculate batter OVR
 */
function calculateBatterOVR(stats) {
  const w = CONFIG.ovrWeights.batter;
  const power = stats.power ?? 5;
  const hitRate = stats.hitRate ?? 5;
  const contact = stats.contact ?? 5;
  const speed = stats.speed ?? 5;
  const score = power * w.power + hitRate * w.hitRate + contact * w.contact + speed * w.speed;
  const ovr = Math.round(score * w.scale + w.base);
  return Math.min(99, Math.max(40, ovr));
}

/**
 * NEW: Calculate pitcher OVR
 */
function calculatePitcherOVR(stats) {
  const w = CONFIG.ovrWeights.pitcher;
  const power = stats.power ?? 5;
  const velocity = stats.velocity ?? 5;
  const control = stats.control ?? 5;
  const technique = stats.technique ?? 5;
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
    if (player.hand.length < state.cfg.handSize && player.deck.length > 0) {
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

// =============================================================================
// 4. Game startup
// =============================================================================

// Perform initial render, display "Play Ball" screen
render(state, handlers);