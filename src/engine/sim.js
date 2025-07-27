// src/engine/sim.js - Enhanced simulation engine with new effect integration
import { CONFIG } from '../data/config.js';

let effectProcessor = null;

export function initializeEffectProcessor(gameState) {
  effectProcessor = new EffectProcessor(gameState);
  return effectProcessor;
}

/**
 * 增強版打擊模擬 - 整合所有新效果
 */
// 修改：simulateAtBat 函數 - 修復 modifiedBatter 未定義錯誤
export function simulateAtBat(batter, pitcher, state) {
  // 確保效果處理器已初始化
  if (!effectProcessor) {
    effectProcessor = initializeEffectProcessor(state);
  }

  console.log('⚾ 開始增強版打擊模擬...');
  console.log('  打者:', batter.name, '位置:', batter.position);
  console.log('  投手:', pitcher.name);

  // 🆕 新增：處理打擊前的條件效果
  processBattingConditions(batter, state);

  // 創建數值修改後的球員物件
  const modifiedBatter = JSON.parse(JSON.stringify(batter));
  const modifiedPitcher = JSON.parse(JSON.stringify(pitcher));
  
  // 🆕 新增：應用所有效果到數值
  applyAllActiveEffects(state, modifiedBatter, modifiedPitcher);
  applyAuraEffects(state, modifiedBatter, modifiedPitcher);
  applySynergyEffects(state, modifiedBatter);

  console.log('  最終打者數值:', modifiedBatter.stats);
  console.log('  最終投手數值:', modifiedPitcher.stats);

  // 使用CONFIG中的標準化參數進行計算
  const { norm } = CONFIG;
  const base = { K: 0.2, BB: 0.08, HR: 0.05, H: 0.25 };

  let pK = base.K + (modifiedPitcher.stats.power - 75) * norm.pitcherPowerSO
                 - (modifiedBatter.stats.contact - 75) * norm.batterContactSO;
  let pBB = base.BB - (modifiedPitcher.stats.control - 75) * norm.controlBB;
  let pHR = base.HR + (modifiedBatter.stats.power - 75) * norm.batterPowerHR
                  - (modifiedPitcher.stats.power - 75) * norm.pitcherPowerHR;
  let pH = base.H + (modifiedBatter.stats.hitRate - 75) * norm.batterHitRate
                 - (modifiedPitcher.stats.velocity - 75) * norm.velocityHit;

  // 確保機率在合理範圍內
  pK = Math.max(0.05, Math.min(0.6, pK));
  pBB = Math.max(0.02, Math.min(0.3, pBB));
  pHR = Math.max(0.01, Math.min(0.2, pHR));
  pH = Math.max(0.1, Math.min(0.7, pH));

  console.log('  機率分佈: K:', pK.toFixed(3), 'BB:', pBB.toFixed(3), 'HR:', pHR.toFixed(3), 'H:', pH.toFixed(3));

  const r = Math.random();
  let c = pK;
  if (r < c) {
    console.log('  結果: 三振');
    return { 
      type: 'K', 
      description: `${batter.name} 三振出局`,
      points: 0,
      batterStats: modifiedBatter.stats,
      pitcherStats: modifiedPitcher.stats
    };
  }
  
  c += pBB;
  if (r < c) {
    console.log('  結果: 保送');
    return { 
      type: 'BB', 
      description: `${batter.name} 獲得保送`,
      points: 1,
      adv: 1,
      batterStats: modifiedBatter.stats
    };
  }
  
  c += pHR;
  if (r < c) {
    console.log('  結果: 全壘打');
    return { 
      type: 'HR', 
      description: `全壘打！${batter.name}！`,
      points: 4,
      adv: 4,
      batterStats: modifiedBatter.stats
    };
  }
  
  c += pH;
  if (r < c) {
    console.log('  結果: 安打，檢查速度');
    // 🔧 修復：傳入正確的 modifiedBatter 物件
    return hitBySpeed(modifiedBatter.stats.speed, state, batter);
  }
  
  console.log('  結果: 出局');
  return { 
    type: 'OUT', 
    description: `${batter.name} 出局`,
    points: 0,
    batterStats: modifiedBatter.stats
  };
}

/**
 * 🆕 新增：處理打擊前的條件效果
 */
function processBattingConditions(batter, state) {
  // 檢查樂奈的"無人之境"效果
  if (batter.name.includes('樂奈') && batter.effects && batter.effects.play) {
    const condition = batter.effects.play.condition;
    if (condition === 'basesEmpty' && state.bases.every(base => base === null)) {
      console.log('🎯 樂奈的無人之境效果觸發！');
      batter.tempBonus = batter.tempBonus || {};
      batter.tempBonus.hitRate = (batter.tempBonus.hitRate || 0) + 25;
    }
  }

  // 檢查祥子的"世界的中心"效果
  if (batter.name.includes('祥子') && batter.effects && batter.effects.play) {
    if (batter.effects.play.keyword === 'double_bonus') {
      console.log('🌟 祥子的世界的中心效果觸發！');
      const permanentBonus = batter.permanentBonus || {};
      batter.tempBonus = batter.tempBonus || {};
      
      Object.keys(permanentBonus).forEach(stat => {
        batter.tempBonus[stat] = (batter.tempBonus[stat] || 0) + permanentBonus[stat];
      });
    }
  }
}

/**
 * 🆕 新增：應用光環效果
 */
function applyAuraEffects(state, modifiedBatter, modifiedPitcher) {
  console.log('🌟 檢查光環效果...');
  
  // 檢查壘上角色的光環效果
  state.bases.forEach((baseCard, index) => {
    if (baseCard && baseCard.effects && baseCard.effects.aura) {
      const auraEffect = baseCard.effects.aura;
      console.log(`  ${baseCard.name} (${index + 1}壘) 的光環效果`);
      
      // 燈的光環效果：為打擊區打者提供專注加成
      if (baseCard.name.includes('燈') && auraEffect.target === 'allMyGOBatters') {
        const mygoMembersCount = state.bases.filter(base => base && base.band === 'MyGO!!!!!').length;
        const contactBonus = mygoMembersCount * (auraEffect.value || 5);
        
        if (modifiedBatter.band === 'MyGO!!!!!') {
          modifiedBatter.stats.contact += contactBonus;
          console.log(`    燈的光環：打者專注+${contactBonus} (${mygoMembersCount}名MyGO成員)`);
        }
      }
    }
  });
  
  // 檢查投手的光環效果
  if (state.player.pitcher && state.player.pitcher.effects && state.player.pitcher.effects.aura) {
    const pitcherAura = state.player.pitcher.effects.aura;
    console.log(`  投手 ${state.player.pitcher.name} 的光環效果`);
    
    if (pitcherAura.target === 'allFriendlyBatters') {
      const stats = pitcherAura.stats || {};
      Object.keys(stats).forEach(stat => {
        if (modifiedBatter.stats[stat] !== undefined) {
          modifiedBatter.stats[stat] += stats[stat];
          console.log(`    投手光環：打者${stat}+${stats[stat]}`);
        }
      });
    }
  }
}

/**
 * 🆕 新增：應用羈絆效果
 */
function applySynergyEffects(state, modifiedBatter) {
  console.log('🔗 檢查羈絆效果...');
  
  // 燈的詩超絆效果
  if (modifiedBatter.name.includes('燈') && modifiedBatter.effects && modifiedBatter.effects.synergy) {
    const mygoCount = state.bases.filter(base => base && base.band === 'MyGO!!!!!').length;
    if (mygoCount > 0) {
      const powerBonus = mygoCount * 12; // 每名MyGO成員+12力量
      modifiedBatter.stats.power += powerBonus;
      console.log(`  燈的詩超絆：力量+${powerBonus} (${mygoCount}名MyGO成員)`);
    }
  }
  
  // 愛音的羈絆效果
  if (modifiedBatter.name.includes('愛音') && modifiedBatter.effects && modifiedBatter.effects.synergy) {
    const tomoriOnBase = state.bases.some(base => base && base.name.includes('燈'));
    if (tomoriOnBase) {
      console.log('  愛音的羈絆：燈在壘上，額外抽卡效果將在打擊後觸發');
    }
  }
  
  // 爽世的羈絆效果
  if (modifiedBatter.name.includes('爽世') && modifiedBatter.effects && modifiedBatter.effects.synergy) {
    const mygoCount = state.bases.filter(base => base && base.band === 'MyGO!!!!!').length;
    if (mygoCount > 0) {
      const hitRateBonus = mygoCount * 10;
      modifiedBatter.stats.hitRate += hitRateBonus;
      console.log(`  爽世的羈絆：安打率+${hitRateBonus} (${mygoCount}名MyGO成員)`);
    }
  }
  
  // 初華的羈絆效果
  if (modifiedBatter.name.includes('初華') && modifiedBatter.effects && modifiedBatter.effects.synergy) {
    const sakiOnBase = state.bases.find(base => base && base.name.includes('祥子'));
    if (sakiOnBase) {
      console.log('  初華的羈絆：複製祥子的數值');
      const sakiStats = calculateTotalStats(sakiOnBase);
      modifiedBatter.stats = { ...sakiStats };
    }
  }
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
 * 🆕 新增：處理羈絆效果
 */
export function processSynergy(card, state) {
  if (!effectProcessor) {
    effectProcessor = initializeEffectProcessor(state);
  }
  
  return effectProcessor.processSynergy(card);
}

/**
 * 🆕 新增：處理光環效果
 */
export function processAura(card, state) {
  if (!effectProcessor) {
    effectProcessor = initializeEffectProcessor(state);
  }
  
  return effectProcessor.processAura(card);
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
        applyStatModification(batterStats.stats, effect);
      } else if (effect.target === 'pitcher' || effect.targetType === 'pitcher') {
        applyStatModification(pitcherStats.stats, effect);
      } else if (effect.target === 'enemyPitcher') {
        applyStatModification(pitcherStats.stats, effect);
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
    console.log(`🧹 清理了 ${sizeBefore - sizeAfter} 個過期效果 (${context})`);
  }
}

/**
 * 🆕 新增：增強版速度計算
 */
function hitBySpeed(speed, state, batter) {
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
      console.log(`  ${effect.source} 的動態效果: 速度+${dynamicValue}`);
    }
  });

  // 🆕 新增：特殊速度加成檢查
  if (batter.tempBonus && batter.tempBonus.speed) {
    speed += batter.tempBonus.speed;
    console.log(`  臨時速度加成: +${batter.tempBonus.speed}`);
  }

  // 重新計算機率
  doubleChance = Math.max(0.1, Math.min(0.6, 0.20 + (speed - 75) * 0.002));
  tripleChance = Math.max(0.02, Math.min(0.3, 0.05 + (speed - 75) * 0.001));

  console.log(`  速度計算: 最終速度=${speed}, 二壘率=${doubleChance.toFixed(3)}, 三壘率=${tripleChance.toFixed(3)}`);

  const r = Math.random();
  if (r < tripleChance) {
    return { 
      type: '3B', 
      description: `三壘安打！${batter.name}！`, 
      points: 3, 
      adv: 3,
      finalSpeed: speed
    };
  }
  if (r < tripleChance + doubleChance) {
    return { 
      type: '2B', 
      description: `二壘安打！${batter.name}！`, 
      points: 2, 
      adv: 2,
      finalSpeed: speed
    };
  }
  return { 
    type: '1B', 
    description: `一壘安打！${batter.name}！`, 
    points: 1, 
    adv: 1,
    finalSpeed: speed
  };
}

/**
 * 🆕 新增：計算角色的總數值（包含所有加成）
 */
function calculateTotalStats(card) {
  const baseStats = { ...card.stats };
  const permanentBonus = card.permanentBonus || {};
  const tempBonus = card.tempBonus || {};

  const totalStats = {};
  Object.keys(baseStats).forEach(stat => {
    totalStats[stat] = baseStats[stat] + (permanentBonus[stat] || 0) + (tempBonus[stat] || 0);
    // 確保數值在合理範圍內
    totalStats[stat] = Math.max(0, Math.min(200, totalStats[stat]));
  });

  return totalStats;
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
      return state.bases.filter(card => card && card.instrument && card.instrument.includes('Guitar'));
    case 'drummersOnBase':
      return state.bases.filter(card => card && card.instrument && card.instrument.includes('Drums'));
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

/**
 * 🆕 新增：處理角色死亡事件
 */
export function processCharacterDeath(character, state, reason = 'out') {
  console.log(`💀 角色死亡事件: ${character.name} (原因: ${reason})`);
  
  // 觸發祥子的遺忘義務效果
  [...state.player.hand, ...state.bases.filter(Boolean), ...state.player.deck].forEach(card => {
    if (card && card.name.includes('祥子') && card.effects && card.effects.passive) {
      if (card.effects.passive.keyword === 'power_on_death') {
        console.log('🌟 祥子的遺忘義務觸發！');
        card.permanentBonus = card.permanentBonus || {};
        card.permanentBonus.power = (card.permanentBonus.power || 0) + 2;
        
        if (effectProcessor) {
          effectRegistry.getThemeEffect('forgottenDuty', 'MyGO')(
            { value: 2 }, card, effectProcessor
          );
        }
      }
    }
  });
  
  // 處理死聲效果
  if (character.effects && character.effects.death) {
    return processDeathrattle(character, state);
  }
  
  return { success: true, description: `${character.name} 離場` };
}

/**
 * 🆕 新增：簡化版打擊模擬（用於CPU）
 */
export function simulateSimpleAtBat(batter, pitcher) {
  const random = Math.random();
  
  // 基本機率分佈
  if (random < 0.22) {
    return { type: 'K', description: `${batter.name} 三振出局`, points: 0 };
  } else if (random < 0.35) {
    return { type: 'OUT', description: `${batter.name} 出局`, points: 0 };
  } else if (random < 0.43) {
    return { type: 'BB', description: `${batter.name} 保送`, points: 1 };
  } else if (random < 0.50) {
    return { type: 'HR', description: `${batter.name} 全壘打！`, points: 4 };
  } else if (random < 0.65) {
    return { type: '2B', description: `${batter.name} 二壘安打`, points: 2 };
  } else if (random < 0.73) {
    return { type: '3B', description: `${batter.name} 三壘安打`, points: 3 };
  } else {
    return { type: '1B', description: `${batter.name} 一壘安打`, points: 1 };
  }
}

/**
 * 🆕 新增：處理結果的增強版本
 */
export function processEnhancedOutcome(result, state, batterCard) {
  console.log('🎯 處理增強版打擊結果:', result.type);
  
  if (result.type === 'K' || result.type === 'OUT') {
    state.outs++;
    console.log('  出局數增加:', state.outs);
    
    // 處理死亡事件
    processCharacterDeath(batterCard, state, result.type);
  } else {
    console.log('  成功上壘/得分');
    
    // 🆕 新增：處理愛音的羈絆效果（額外抽卡）
    if (batterCard.name.includes('愛音') && batterCard.effects && batterCard.effects.synergy) {
      const tomoriOnBase = state.bases.some(base => base && base.name.includes('燈'));
      if (tomoriOnBase && effectProcessor) {
        console.log('💫 愛音羈絆效果：因為燈在壘上，額外抽1張卡');
        effectProcessor.drawCards(state.player, 1);
      }
    }
    
    // 標準壘包推進邏輯
    const pointsScored = advanceRunnersEnhanced(state, batterCard, result.adv || 1);
    state.score.home += pointsScored;
    
    console.log('  得分:', pointsScored);
  }
  
  // 更新光環效果
  updateAuraEffects(state);
}

/**
 * 🆕 新增：增強版壘包推進
 */
function advanceRunnersEnhanced(state, newBatter, advancement) {
  let pointsScored = 0;
  
  console.log('🏃 增強版壘包推進...');
  console.log('  推進前:', state.bases.map(b => b ? b.name : '空'));
  console.log('  推進距離:', advancement);
  
  // 從後往前處理跑者
  for (let i = 2; i >= 0; i--) {
    const runner = state.bases[i];
    if (runner) {
      const newPosition = i + advancement;
      
      if (newPosition >= 3) {
        // 得分
        if (!runner.locked) {
          console.log(`  ${runner.name} 從 ${i + 1} 壘得分`);
          processCharacterDeath(runner, state, 'score');
          state.player.discard.push(runner);
          pointsScored++;
          state.bases[i] = null;
        } else {
          console.log(`  ${runner.name} 被鎖定，無法得分`);
        }
      } else {
        // 推進
        if (!runner.locked && !state.bases[newPosition]) {
          console.log(`  ${runner.name} 從 ${i + 1} 壘推進到 ${newPosition + 1} 壘`);
          state.bases[newPosition] = runner;
          state.bases[i] = null;
        } else if (runner.locked) {
          console.log(`  ${runner.name} 被鎖定，無法推進`);
        } else {
          console.log(`  ${runner.name} 推進受阻，目標壘包被佔用`);
        }
      }
    }
  }
  
  // 放置新打者
  const newBatterPosition = Math.min(2, advancement - 1);
  if (!state.bases[newBatterPosition]) {
    console.log(`  ${newBatter.name} 上 ${newBatterPosition + 1} 壘`);
    state.bases[newBatterPosition] = newBatter;
    
    // 觸發上壘時的光環效果
    if (newBatter.effects && newBatter.effects.aura) {
      processAura(newBatter, state);
    }
  } else {
    // 如果目標壘包被佔，直接得分
    console.log(`  ${newBatter.name} 因壘包擁擠直接得分`);
    processCharacterDeath(newBatter, state, 'score');
    state.player.discard.push(newBatter);
    pointsScored++;
  }
  
  console.log('  推進後:', state.bases.map(b => b ? b.name : '空'));
  console.log('  本次得分:', pointsScored);
  
  return pointsScored;
}

console.log('✅ Enhanced Simulation Engine 載入完成');
console.log('🎭 增強功能:');
console.log('  - 戰吼/死聲/羈絆/光環效果整合');
console.log('  - 動態數值計算和應用');
console.log('  - 條件效果檢查和觸發');
console.log('  - 增強版壘包推進邏輯');
console.log('  - 角色死亡事件處理');
console.log('  - 效果處理器統一管理');