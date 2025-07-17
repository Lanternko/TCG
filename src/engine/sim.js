// /src/engine/sim.js
import { CONFIG } from '../data/config.js';

export function simulateAtBat(batter, pitcher, state) {
  // 建立一個臨時的、被效果修改過的打者和投手物件
  const modifiedBatter = JSON.parse(JSON.stringify(batter));
  const modifiedPitcher = JSON.parse(JSON.stringify(pitcher));
  // 應用所有當前回合的 activeEffects
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
 * NEW: 處理卡牌效果並將其加入 activeEffects
 * @param {object} card - 被觸發效果的卡牌
 * @param {string} trigger - 觸發時機 (e.g., 'play', 'death', 'aura')
 * @param {object} state - 遊戲狀態
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
    
    // 特定效果的直接處理
    if (effect.action === "shuffleToDeck" && trigger === "play") {
        if (state.player.discard.length > 0) {
            const cardToShuffle = state.player.discard.splice(0, 1)[0];
            state.player.deck.push(cardToShuffle);
            // 你可能需要一個 shuffleDeck 函數
            console.log(`${card.name} 的效果：將 ${cardToShuffle.name} 從棄牌堆洗回牌庫！`);
        }
        return; // 此效果不進入 activeEffects
    }

    // 將需要持續作用的效果加入 activeEffects
    state.activeEffects.push(effectData);
    console.log(`觸發效果: ${card.name} 的 ${trigger} 效果已被啟動。`);
}

/**
 * NEW: 應用所有 activeEffects
 * @param {object} state - 遊戲狀態
 * @param {object} batterStats - 要修改的打者屬性
 * @param {object} pitcherStats - 要修改的投手屬性
 */
function applyAllActiveEffects(state, batterStats, pitcherStats) {
    state.activeEffects.forEach(effect => {
        // 檢查觸發條件
        const isSocratesSynergy = effect.cardName === "Socrates" && state.bases.some(b => b && b.name === "Socrates");
        const isHeraclitusAura = effect.cardName === "Heraclitus" && state.bases.some(b => b && b.name === "Heraclitus");

        if (effect.target === "allFriendlyBatters" && (isSocratesSynergy || isHeraclitusAura)) {
            batterStats[effect.stat] += effect.value;
        } else if (effect.target === "enemyPitcher" && effect.duration === "atBat") {
            pitcherStats[effect.stat] += effect.value;
        } else if (effect.target === "hand" && effect.type === "play") {
            // 這個效果應該在 main.js 的抽牌/出牌階段處理，這裡僅作範例
        } else if (effect.target === "deck" && effect.type === "death") {
             // 永久效果在 main.js 中處理一次即可
        }
    });
}
/**
 * NEW: 處理戰術卡效果
 * @param {object} card - 被打出的戰術卡
 * @param {object} state - 遊戲狀態
 * @returns {string} - 描述結果的文字
 */
export function applyActionCard(card, state) {
  const effect = card.effects.play;
  let outcomeDescription = "戰術失敗了...";

  switch (effect.action) {
    case "bunt":
      // 推進所有跑者，打者出局
      state.outs++;
      const runners = state.bases.filter(Boolean);
      state.bases = [null, null, null];
      runners.forEach(runner => {
        const currentBase = state.bases.indexOf(runner);
        const newBaseIndex = currentBase + 1;
        if (newBaseIndex < 3) state.bases[newBaseIndex] = runner;
        else state.score.away++; // 跑回本壘得分
      });
      outcomeDescription = `${card.name}成功！跑者向前推進！`;
      break;

    case "steal":
      const runner = state.bases[0]; // 簡化：只偷二壘
      if (runner) {
        // 盜壘成功率 = (跑者速度 - 投手力量) / 100
        const successChance = (runner.stats.speed - state.cpu.activePitcher.stats.power) / 100 + 0.5;
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
      // 將效果加入 activeEffects，它會在 simulateAtBat 中被應用
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