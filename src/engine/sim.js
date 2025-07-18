// /src/engine/sim.js
import { CONFIG } from '../data/config.js';

export function simulateAtBat(batter, pitcher, state) {
  // Create temporary, effect-modified batter and pitcher objects
  const modifiedBatter = JSON.parse(JSON.stringify(batter));
  const modifiedPitcher = JSON.parse(JSON.stringify(pitcher));
  // Apply all current turn's activeEffects
  applyAllActiveEffects(state, modifiedBatter.stats, modifiedPitcher.stats);

  const { norm } = CONFIG;
  const base = { K: 0.2, BB: 0.08, HR: 0.05, H: 0.25 };

  let pK = base.K + (modifiedPitcher.stats.power - 75) * norm.pitcherPowerSO
                 - (modifiedBatter.stats.contact - 75) * norm.batterContactSO;
  let pBB = base.BB - (modifiedPitcher.stats.control - 75) * norm.controlBB;
  let pHR = base.HR + (modifiedBatter.stats.power - 75) * norm.batterPowerHR
                  - (modifiedPitcher.stats.power - 75) * norm.pitcherPowerHR;
  let pH = base.H + (modifiedBatter.stats.hitRate - 75) * norm.batterHitRate
                 - (modifiedPitcher.stats.velocity - 75) * norm.velocityHit;

  const r = Math.random();
  let c = pK;
  if (r < c) return { type: 'K', description: `${batter.name} 三振出局。` };
  c += pBB;
  if (r < c) return { type: 'BB', description: `${batter.name} 獲得保送。`, adv: 1 };
  c += pHR;
  if (r < c) return { type: 'HR', description: `全壘打！ ${batter.name}！`, adv: 4 };
  c += pH;
  if (r < c) return hitBySpeed(modifiedBatter.stats.speed, state);
  return { type: 'OUT', description: `${batter.name} 出局。` };
}

/**
 * Process card effects and add them to activeEffects
 * @param {object} card - Card whose effects are triggered
 * @param {string} trigger - Trigger timing (e.g., 'play', 'death', 'aura')
 * @param {object} state - Game state
 */
export function processCardEffects(card, trigger, state) {
    if (!card.effects || !card.effects[trigger]) {
        return;
    }

    const effect = card.effects[trigger];
    const effectData = {
        cardName: card.name,
        type: trigger,
        ...effect
    };
    
    // Direct handling of specific effects
    if (effect.action === "shuffleToDeck" && trigger === "play") {
        if (state.player.discard.length > 0) {
            const cardToShuffle = state.player.discard.splice(0, 1)[0];
            state.player.deck.push(cardToShuffle);
            // You might need a shuffleDeck function
            console.log(`${card.name} 的效果：將 ${cardToShuffle.name} 從棄牌堆洗回牌庫！`);
        }
        return; // This effect doesn't enter activeEffects
    }

    // Add effects that need to persist to activeEffects
    state.activeEffects.push(effectData);
    console.log(`觸發效果: ${card.name} 的 ${trigger} 效果已被啟動。`);
}

/**
 * Apply all activeEffects
 * @param {object} state - Game state
 * @param {object} batterStats - Batter stats to modify
 * @param {object} pitcherStats - Pitcher stats to modify
 */
function applyAllActiveEffects(state, batterStats, pitcherStats) {
    state.activeEffects.forEach(effect => {
        // Check trigger conditions
        const isSocratesSynergy = effect.cardName === "Socrates" && state.bases.some(b => b && b.name === "Socrates");
        const isHeraclitusAura = effect.cardName === "Heraclitus" && state.bases.some(b => b && b.name === "Heraclitus");

        if (effect.target === "allFriendlyBatters" && (isSocratesSynergy || isHeraclitusAura)) {
            batterStats[effect.stat] += effect.value;
        } else if (effect.target === "enemyPitcher" && effect.duration === "atBat") {
            pitcherStats[effect.stat] += effect.value;
        } else if (effect.target === "hand" && effect.type === "play") {
            // This effect should be handled in main.js during draw/play phase, here for example only
        } else if (effect.target === "deck" && effect.type === "death") {
             // Permanent effects handled once in main.js
        }
    });
}

/**
 * Handle action card effects
 * @param {object} card - Action card being played
 * @param {object} state - Game state
 * @returns {string} - Description of the result
 */
export function applyActionCard(card, state) {
  const effect = card.effects.play;
  let outcomeDescription = "戰術失敗了...";

  switch (effect.action) {
    case "bunt":
      // Advance all runners, batter is out
      state.outs++;
      const runners = state.bases.filter(Boolean);
      state.bases = [null, null, null];
      runners.forEach(runner => {
        const currentBase = state.bases.indexOf(runner);
        const newBaseIndex = currentBase + 1;
        if (newBaseIndex < 3) state.bases[newBaseIndex] = runner;
        else {
          // Score run
          const currentScorer = state.half === 'top' ? 'away' : 'home';
          state.score[currentScorer]++;
        }
      });
      outcomeDescription = `${card.name}成功！跑者向前推進！`;
      break;

    case "steal":
      const runner = state.bases[0]; // Simplified: only steal second
      if (runner) {
        // Success rate = (runner speed - pitcher power) / 100
        const pitcher = state.playerTurn ? state.cpu.activePitcher : state.player.pitcher;
        const successChance = (runner.stats.speed - pitcher.stats.power) / 100 + 0.5;
        if (Math.random() < successChance) {
          state.bases[1] = runner;
          state.bases[0] = null;
          outcomeDescription = `${runner.name} 盜壘成功！`;
        } else {
          state.bases[0] = null;
          state.outs++;
          outcomeDescription = `${runner.name} 盜壘失敗，被抓到了！`;
        }
      } else {
        outcomeDescription = "一壘上沒有跑者可以盜壘！";
      }
      break;

    case "buff":
      // Add effect to activeEffects, it will be applied in simulateAtBat
      state.activeEffects.push({
        cardName: card.name,
        type: 'buff',
        ...effect
      });
      outcomeDescription = "全隊的專注力提升了！";
      break;
  }
  return outcomeDescription;
}

function hitBySpeed(speed, state) {
  let doubleChance = 0.20 + (speed - 75) * 0.002;
  let tripleChance = 0.05 + (speed - 75) * 0.001;

  // Apply Pythagoras' aura effect if active
  const pythagorasEffect = state.activeEffects.find(e => e.cardName === "Pythagoras" && e.type === "aura");
  if (pythagorasEffect) {
    doubleChance += pythagorasEffect.value;
  }

  if (Math.random() < tripleChance) return { type: '3B', description: `三壘安打！`, adv: 3 };
  if (Math.random() < doubleChance) return { type: '2B', description: `二壘安打！`, adv: 2 };
  return { type: '1B', description: `一壘安打！`, adv: 1 };
}