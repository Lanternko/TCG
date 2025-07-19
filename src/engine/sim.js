// src/engine/sim.js - 更新的模擬引擎
import { CONFIG } from '../data/config.js';
import { EffectProcessor, effectRegistry } from './effects.js';

let effectProcessor = null;

export function initializeEffectProcessor(gameState) {
  effectProcessor = new EffectProcessor(gameState);
  return effectProcessor;
}

export function simulateAtBat(batter, pitcher, state) {
  // 確保效果處理器已初始化
  if (!effectProcessor) {
    effectProcessor = initializeEffectProcessor(state);
  }

  // 創建臨時修改後的球員物件
  const modifiedBatter = JSON.parse(JSON.stringify(batter));
  const modifiedPitcher = JSON.parse(JSON.stringify(pitcher));
  
  // 應用所有當前活躍效果
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
 * 統一的卡牌效果處理入口
 */
export function processCardEffects(card, trigger, state) {
  if (!effectProcessor) {
    effectProcessor = initializeEffectProcessor(state);
  }
  
  if (!card.effects || !card.effects[trigger]) {
    return { success: false, reason: '沒有對應的效果' };
  }

  const effectData = card.effects[trigger];
  const result = effectProcessor.processEffect(card, effectData, trigger);
  
  // 更新光環效果
  if (trigger === 'play' || trigger === 'death') {
    updateAuraEffects(state);
  }
  
  return result;
}

/**
 * 應用所有當前活躍效果到數值上
 */
function applyAllActiveEffects(state, batterStats, pitcherStats) {
  state.activeEffects.forEach(effect => {
    // 檢查效果是否仍然有效
    if (!isEffectValid(effect, state)) {
      return;
    }

    // 根據目標類型應用效果
    if (effect.target && typeof effect.target === 'object') {
      applyEffectToTarget(effect, effect.target, batterStats, pitcherStats);
    } else if (effect.stat && effect.value !== undefined) {
      // 簡單的數值修改
      if (effect.target === 'batter' || effect.targetType === 'batter') {
        applyStatModification(batterStats, effect);
      } else if (effect.target === 'pitcher' || effect.targetType === 'pitcher') {
        applyStatModification(pitcherStats, effect);
      }
    }
  });
}

/**
 * 檢查效果是否仍然有效
 */
function isEffectValid(effect, state) {
  // 檢查持續時間
  if (effect.duration === 'atBat') return true;
  if (effect.duration === 'turn') return true;
  if (effect.duration === 'inning') return true;
  if (effect.duration === 'game') return true;
  if (effect.duration === 'permanent') return true;
  
  // 檢查條件
  if (effect.condition) {
    return effectProcessor.checkCondition(effect.condition, effect.source);
  }
  
  return true;
}

/**
 * 應用數值修改
 */
function applyStatModification(stats, effect) {
  if (!effect.stat || effect.value === undefined) return;
  
  const stat = effect.stat;
  const value = effect.value;
  
  if (effect.mode === 'absolute' || effect.type === 'setTo') {
    stats[stat] = value;
  } else if (effect.type === 'buff' || effect.type === 'debuff') {
    stats[stat] = (stats[stat] || 0) + value;
  }
  
  // 確保數值在合理範圍內
  if (typeof stats[stat] === 'number') {
    stats[stat] = Math.max(0, Math.min(200, stats[stat]));
  }
}

/**
 * 更新光環效果
 * 這個函數會重新計算所有基於壘包狀態的光環效果
 */
export function updateAuraEffects(state) {
  // 清除舊的光環效果
  state.activeEffects = state.activeEffects.filter(effect => 
    effect.type !== 'aura' && effect.type !== 'passive'
  );
  
  // 重新添加所有光環效果
  // 1. 壘上角色的光環
  state.bases.forEach((card, baseIndex) => {
    if (card && card.effects && card.effects.aura) {
      const auraEffect = card.effects.aura;
      if (effectProcessor.checkCondition(auraEffect.condition, card)) {
        const auraData = {
          source: card.name,
          type: 'aura',
          baseIndex: baseIndex,
          ...auraEffect
        };
        state.activeEffects.push(auraData);
      }
    }
  });
  
  // 2. 手牌中的被動效果
  state.player.hand.forEach(card => {
    if (card && card.effects && card.effects.passive) {
      const passiveEffect = card.effects.passive;
      if (passiveEffect.condition === 'inHand' || !passiveEffect.condition) {
        const passiveData = {
          source: card.name,
          type: 'passive',
          location: 'hand',
          ...passiveEffect
        };
        state.activeEffects.push(passiveData);
      }
    }
  });
  
  // 3. 投手的被動效果
  if (state.player.pitcher && state.player.pitcher.effects && state.player.pitcher.effects.passive) {
    const pitcherPassive = state.player.pitcher.effects.passive;
    const pitcherData = {
      source: state.player.pitcher.name,
      type: 'passive',
      location: 'pitcher',
      ...pitcherPassive
    };
    state.activeEffects.push(pitcherData);
  }
}

/**
 * 處理戰術卡效果
 */
export function applyActionCard(card, state) {
  if (!effectProcessor) {
    effectProcessor = initializeEffectProcessor(state);
  }
  
  if (!card.effects || !card.effects.play) {
    return "這張戰術卡沒有效果...";
  }
  
  const result = effectProcessor.processEffect(card, card.effects.play, 'play');
  
  if (result.success) {
    updateAuraEffects(state);
    return result.description;
  } else {
    return `${card.name} 失敗了: ${result.reason}`;
  }
}

/**
 * 清理過期效果
 */
export function cleanupExpiredEffects(state, context = 'turn') {
  const sizeBefore = state.activeEffects.length;
  
  switch (context) {
    case 'atBat':
      state.activeEffects = state.activeEffects.filter(effect => 
        effect.duration !== 'atBat'
      );
      break;
    case 'turn':
      state.activeEffects = state.activeEffects.filter(effect => 
        effect.duration !== 'atBat' && effect.duration !== 'turn'
      );
      break;
    case 'inning':
      state.activeEffects = state.activeEffects.filter(effect => 
        effect.duration !== 'atBat' && 
        effect.duration !== 'turn' && 
        effect.duration !== 'inning'
      );
      break;
    case 'game':
      state.activeEffects = state.activeEffects.filter(effect => 
        effect.duration === 'permanent'
      );
      break;
  }
  
  const sizeAfter = state.activeEffects.length;
  if (sizeBefore !== sizeAfter) {
    console.log(`清理了 ${sizeBefore - sizeAfter} 個過期效果 (${context})`);
  }
}

function hitBySpeed(speed, state) {
  let doubleChance = 0.20 + (speed - 75) * 0.002;
  let tripleChance = 0.05 + (speed - 75) * 0.001;

  // 檢查動態數值修改（如喵夢的效果）
  const dynamicEffects = state.activeEffects.filter(effect => 
    effect.value === 'dynamicByScore' && effect.stat === 'speed'
  );
  
  dynamicEffects.forEach(effect => {
    if (effect.calculation) {
      const dynamicValue = effect.calculation(state);
      speed += dynamicValue;
      console.log(`${effect.source} 的動態效果: 速度+${dynamicValue}`);
    }
  });

  // 重新計算機率
  doubleChance = 0.20 + (speed - 75) * 0.002;
  tripleChance = 0.05 + (speed - 75) * 0.001;

  if (Math.random() < tripleChance) return { type: '3B', description: `三壘安打！`, adv: 3 };
  if (Math.random() < doubleChance) return { type: '2B', description: `二壘安打！`, adv: 2 };
  return { type: '1B', description: `一壘安打！`, adv: 1 };
}

// === 工具函數 ===

/**
 * 獲取指定條件的角色列表
 */
export function getCharactersByCondition(state, condition) {
  switch (condition) {
    case 'mygoOnBase':
      return state.bases.filter(card => card && card.band === 'MyGO!!!!!');
    case 'mujicaOnBase':
      return state.bases.filter(card => card && card.band === 'Mujica');
    case 'guitaristsOnBase':
      return state.bases.filter(card => card && card.instrument === 'Guitar');
    case 'drummersOnBase':
      return state.bases.filter(card => card && card.instrument === 'Drums');
    case 'allOnBase':
      return state.bases.filter(Boolean);
    case 'allInHand':
      return state.player.hand;
    default:
      return [];
  }
}

/**
 * 計算效果的實際數值（支援動態計算）
 */
export function calculateEffectValue(effect, state) {
  if (typeof effect.value === 'function') {
    return effect.value(state);
  } else if (effect.value === 'dynamicByScore') {
    return state.score.home || 0;
  } else if (typeof effect.value === 'number') {
    return effect.value;
  } else {
    return 0;
  }
}

/**
 * 檢查角色是否滿足特定標籤條件
 */
export function hasTag(character, tag) {
  return character.tags && character.tags.includes(tag);
}

/**
 * 檢查角色是否屬於特定樂隊
 */
export function isBandMember(character, band) {
  return character.band === band;
}

/**
 * 檢查角色是否使用特定樂器
 */
export function playsInstrument(character, instrument) {
  return character.instrument === instrument || 
         (character.instrument && character.instrument.includes(instrument));
}

// A simple outcome processor
export function processSimpleOutcome(result, state, batterCard) {
  if (result.type === 'K' || result.type === 'OUT') {
    state.outs++;
  } else {
    // This is a very simplified scoring and base running logic.
    // A more complex system would be needed for a full game.
    state.score.home += result.points || 0;
    
    // Clear bases and place the new batter
    // This doesn't account for advancing other runners properly yet.
    const runners = state.bases.filter(Boolean);
    runners.unshift(batterCard); // Add batter to the front
    state.bases = [null, null, null];

    let runsScored = 0;
    runners.forEach(runner => {
        // A placeholder for base advancement logic
        const advance = result.points || 1;
        // This is not a correct base running simulation, but a placeholder
        if (advance === 4) {
            runsScored++;
        } else if (state.bases[advance - 1] === null) {
            state.bases[advance - 1] = runner;
        } else {
            // If base is occupied, just score for simplicity in this version
            runsScored++;
        }
    });
    state.score.home += runsScored;
  }
}

// A simplified simulation function based on the patch for testing UI and effects
export function simulateSimpleAtBat(batter, pitcher) {
  const random = Math.random();
  
  if (random < 0.2) {
    return { type: 'K', description: `${batter.name} 三振出局`, points: 0 };
  } else if (random < 0.3) {
    return { type: 'OUT', description: `${batter.name} 出局`, points: 0 };
  } else if (random < 0.4) {
    return { type: 'BB', description: `${batter.name} 保送`, points: 1 };
  } else if (random < 0.5) {
    return { type: 'HR', description: `${batter.name} 全壘打！`, points: 4 };
  } else if (random < 0.7) {
    return { type: '2B', description: `${batter.name} 二壘安打`, points: 2 };
  } else {
    return { type: '1B', description: `${batter.name} 一壘安打`, points: 1 };
  }
}