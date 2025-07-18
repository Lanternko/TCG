// src/main.js
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
  state.player.pitcher = prepareCard(playerTeam.pitchers[0]); // Set player pitcher
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

  if (card.type === 'batter') {
    processCardEffects(card, 'play', state);
    const result = simulateAtBat(card, state.cpu.activePitcher, state);
    processAtBatOutcome(result, card); // <-- Will use the new scoring logic
  } else if (card.type === 'action') {
    const description = applyActionCard(card, state);
    document.getElementById('outcome-text').textContent = description;
  }

  state.player.hand.splice(state.selected, 1);
  state.player.discard.push(card);
  draw(state.player, 1);
  state.selected = -1;

  state.activeEffects = state.activeEffects.filter(e => e.duration !== "atBat");

  render(state, handlers);

  if (state.outs >= 3) {
    setTimeout(changeHalfInning, 1500);
  }
}

/**
 * --- COMPLETELY REVISED ---
 * Process at-bat outcome, update score based on custom rules, and advance runners.
 * @param {object} result - Simulation result
 * @param {object} card - Batting card
 */
function processAtBatOutcome(result, card) {
  document.getElementById('outcome-text').textContent = result.description;
  const currentScorer = state.half === 'top' ? 'away' : 'home';

  if (result.type === 'K' || result.type === 'OUT') {
    state.outs++;
    processCardEffects(card, 'death', state);
  } else {
    // --- NEW SCORING LOGIC ---
    let points = 0;
    switch (result.type) {
        case '1B': points = CONFIG.scoring.single; break;
        case '2B': points = CONFIG.scoring.double; break;
        case '3B': points = CONFIG.scoring.triple; break;
        case 'HR': points = CONFIG.scoring.homeRun; break;
    }
    state.score[currentScorer] += points;

    // --- NEW RUNNER ADVANCEMENT LOGIC ---
    processCardEffects(card, 'aura', state);
    processCardEffects(card, 'synergy', state);

    const runners = [card, ...state.bases.filter(Boolean)]; // Batter is now a runner
    state.bases = [null, null, null]; // Clear bases before placing runners

    if (result.type === 'HR') {
        // Home run clears the bases, no need to place anyone.
    } else {
        const adv = result.adv || 0;
        runners.forEach(runner => {
            const currentBase = (runner === card) ? -1 : state.bases.indexOf(runner);
            const newBaseIndex = currentBase + adv;
            if (newBaseIndex < 3) {
                // If the new base is empty or the runner is the batter, place them.
                if (!state.bases[newBaseIndex] || runner === card) {
                    state.bases[newBaseIndex] = runner;
                } else {
                    // Simple logic: if base is occupied, push to the next one.
                    if (newBaseIndex + 1 < 3) state.bases[newBaseIndex + 1] = runner;
                }
            }
            // Note: In this custom scoring, runners reaching home do not add extra points.
        });
        // Place the batter on their new base
        if (adv > 0 && adv < 4) {
            state.bases[adv - 1] = card;
        }
    }
  }
}


/**
 * Change sides and handle "soft reset" of bases
 */
function changeHalfInning() {
  // --- NEW: Soft reset logic for bases ---
  // Find the most advanced runner and remove them
  let removedRunner = false;
  for (let i = 2; i >= 0; i--) {
      if (state.bases[i]) {
          state.bases[i] = null;
          removedRunner = true;
          break; // Only remove one runner
      }
  }

  // Reset outs and inning-specific effects
  state.outs = 0;
  state.activeEffects = state.activeEffects.filter(e => e.duration !== "inning");

  if (state.half === 'top') {
    state.half = 'bottom';
    state.playerTurn = true;
    document.getElementById('outcome-text').textContent = "輪到主隊打擊！";
  } else {
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


// ... (main.js 的其他部分保持不變) ...

/**
 * Simulate CPU's complete turn with proper scoring
 */
function runCpuTurn() {
  let cpuOuts = 0;
  let cpuBatterIndex = 0;
  const playerPitcher = state.player.pitcher;
  const cpuBases = [null, null, null]; // Track CPU runners

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
      document.getElementById('outcome-text').textContent = result.description;
    } else {
      // FIX: Proper CPU scoring with runner advancement
      let points = 0;
      const advanceCount = result.adv || 0;

      // Advance existing runners
      for (let i = 2; i >= 0; i--) {
        if (cpuBases[i]) {
          const newPosition = i + advanceCount;
          if (newPosition >= 3) {
            points++;
            cpuBases[i] = null;
          } else {
            cpuBases[newPosition] = cpuBases[i];
            cpuBases[i] = null;
          }
        }
      }

      // Place batter on base
      if (advanceCount > 0 && advanceCount < 4) {
        cpuBases[advanceCount - 1] = batter;
      } else if (advanceCount === 4) {
        // Home run
        points++;
      }

      state.score.away += points;
      document.getElementById('outcome-text').textContent = result.description + 
        (points > 0 ? ` ${points} 分得手！` : '');
    }
    
    cpuBatterIndex++;
    render(state, handlers); // Update screen after each CPU at-bat
  }, 1500); // Hit once every 1.5 seconds
}

// =============================================================================
// 3. Utility helper functions
// =============================================================================

/**
 * Prepare a card by calculating OVR and other properties
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
 * Calculate batter OVR using weights from config
 */
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

/**
 * Calculate pitcher OVR using weights from config
 */
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