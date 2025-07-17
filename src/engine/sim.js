// /src/engine/sim.js
import { CONFIG } from '../data/config.js';

export function simulateAtBat(batter, pitcher, state) {
  // Apply active effects (e.g., Socrates' synergy, Heraclitus' aura)
  const modifiedBatter = { ...batter, stats: { ...batter.stats } };
  const modifiedPitcher = { ...pitcher, stats: { ...pitcher.stats } };
  applyEffects(state, modifiedBatter, modifiedPitcher);

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

function applyEffects(state, batter, pitcher) {
  state.activeEffects.forEach(effect => {
    if (effect.type === "synergy" && effect.cardName === "Socrates" && state.bases.some(b => b && b.name === "Socrates")) {
      batter.stats.power += effect.value;
    } else if (effect.type === "aura" && effect.cardName === "Heraclitus" && state.bases.some(b => b && b.name === "Heraclitus")) {
      batter.stats.contact += effect.value;
    } else if (effect.type === "play" && effect.cardName === "Parmenides" && effect.duration === "atBat") {
      pitcher.stats.technique += effect.value; // Negative value reduces technique
    } else if (effect.type === "play" && effect.cardName === "Plato" && effect.duration === "inning") {
      state.player.hand.forEach(card => {
        if (card.type === 'batter') card.stats.hitRate += effect.value;
      });
    }
  });

  // Apply Zeno's synergy effect during base advancement
  if (batter.name === "Zeno of Elea" && state.bases[1] && state.bases[1].name !== "Zeno of Elea") {
    state.activeEffects.push({ cardName: "Zeno of Elea", type: "synergy", effect: "advanceExtraBase", value: 1 });
  }
}