// 在 effects.js 開頭添加：
import { GAME_CONFIG } from '../data/config.js';

// src/engine/effects.js - Enhanced and Corrected Effect System

export const EFFECT_KEYWORDS = {
  // === 基礎動作關鍵字 ===
  DRAW: 'draw',
  DISCARD: 'discard', 
  SEARCH: 'search',
  SHUFFLE: 'shuffle',
  
  // === 數值修改關鍵字 ===
  BUFF: 'buff',
  DEBUFF: 'debuff',
  SET_TO: 'setTo',
  MAX_STATS: 'max_stats',
  
  // === 狀態關鍵字 ===
  LOCK: 'lock',
  UNLOCK: 'unlock',
  IMMUNE: 'immune',
  UNTARGETABLE: 'untargetable',
  
  // === 條件關鍵字 ===
  CONDITIONAL_BUFF: 'conditional_buff',
  CONDITIONAL_DRAW: 'conditional_draw',
  CONDITIONAL_EFFECT: 'conditional_effect',
  
  // === 新增：戰吼/死聲關鍵字 ===
  BATTLECRY: 'battlecry',
  DEATHRATTLE: 'deathrattle',
  
  // === 位置關鍵字 ===
  ADVANCE: 'advance',
  RETREAT: 'retreat',
  TELEPORT: 'teleport',
  
  // === 特殊關鍵字 ===
  COPY: 'copy',
  COPY_STATS: 'copy_stats',
  DESTROY: 'destroy',
  TRANSFORM: 'transform',
  SACRIFICE: 'sacrifice',
  FUSION: 'fusion',
  RESURRECT: 'resurrect',
  
  // === 新增：高級效果 ===
  DECK_PEEK: 'deck_peek',
  POWER_TRANSFER: 'power_transfer',
  TARGET_SPECIFIC: 'target_specific',
  DOUBLE_BONUS: 'double_bonus'
};

export const TARGET_TYPES = {
  SELF: 'self',
  ALL_FRIENDLY: 'allFriendly',
  ALL_ENEMY: 'allEnemy',
  ALL_ON_BASE: 'allOnBase',
  ALL_MYGO_BATTERS: 'allMyGOBatters',
  CURRENT_BATTER: 'currentBatter',
  ENEMY_PITCHER: 'enemyPitcher',
  HAND: 'hand',
  DECK: 'deck',
  DISCARD_PILE: 'discardPile',
  CHOOSE_ONE: 'chooseOne',
  CHOOSE_FROM_BASE: 'chooseFromBase',
  CHOOSE_MYGO_FROM_HAND: 'chooseMyGOFromHand',
  RANDOM_ONE: 'randomOne',
  SPECIFIC_CARD: 'specificCard'
};

export const CONDITIONS = {
  // === 位置條件 ===
  ON_BASE: 'onBase',
  IN_HAND: 'inHand',
  ON_PLAY: 'onPlay',
  BASES_EMPTY: 'basesEmpty',
  
  // === 數量條件 ===
  COUNT_EQUAL: 'countEqual',
  COUNT_MORE_THAN: 'countMoreThan',
  COUNT_LESS_THAN: 'countLessThan',
  
  // === 特定條件 ===
  HAS_TAG: 'hasTag',
  HAS_INSTRUMENT: 'hasInstrument',
  HAS_BAND: 'hasBand',
  IS_TRAILING: 'isTrailing',
  IS_LEADING: 'isLeading',
  
  // === MyGO!!!!! 特定條件 ===
  MYGO_MEMBERS_ON_BASE: 'mygoMembersOnBase',
  TOMORI_ON_BASE: 'tomoriOnBase',
  SAKI_ON_BASE: 'sakiOnBase',
  ANY_CHARACTER_DIES: 'anyCharacterDies',
  SCORE_COMPARISON: 'scoreComparison'
};

export const DURATIONS = {
  INSTANT: 'instant',
  AT_BAT: 'atBat', 
  TURN: 'turn',
  INNING: 'inning',
  GAME: 'game',
  PERMANENT: 'permanent',
  NEXT_PLAY: 'nextPlay',
  UNTIL_NEXT_TURN: 'untilNextTurn'
};

/**
 * 增強的效果處理器
 * 支援新的卡牌機制：戰吼、死聲、條件效果等
 */
export class EffectProcessor {
  constructor(gameState) {
    this.state = gameState;
    this.handlers = new Map();
    this.permanentEffects = new Map();
    this.nextCardBuffs = [];
    this.registerDefaultHandlers();
  }

  /**
   * 註冊所有預設的效果處理器
   */
  registerDefaultHandlers() {
    // 基礎動作
    this.register(EFFECT_KEYWORDS.DRAW, this.handleDraw.bind(this));
    this.register(EFFECT_KEYWORDS.DISCARD, this.handleDiscard.bind(this));
    this.register(EFFECT_KEYWORDS.SEARCH, this.handleSearch.bind(this));
    this.register(EFFECT_KEYWORDS.SHUFFLE, this.handleShuffle.bind(this));
    
    // 數值修改
    this.register(EFFECT_KEYWORDS.BUFF, this.handleBuff.bind(this));
    this.register(EFFECT_KEYWORDS.DEBUFF, this.handleDebuff.bind(this));
    this.register(EFFECT_KEYWORDS.SET_TO, this.handleSetTo.bind(this));
    this.register(EFFECT_KEYWORDS.MAX_STATS, this.handleMaxStats.bind(this));
    
    // 條件效果
    this.register(EFFECT_KEYWORDS.CONDITIONAL_BUFF, this.handleConditionalBuff.bind(this));
    this.register(EFFECT_KEYWORDS.CONDITIONAL_DRAW, this.handleConditionalDraw.bind(this));
    this.register(EFFECT_KEYWORDS.CONDITIONAL_EFFECT, this.handleConditionalEffect.bind(this));
    
    // 高級效果
    this.register(EFFECT_KEYWORDS.COPY_STATS, this.handleCopyStats.bind(this));
    this.register(EFFECT_KEYWORDS.DECK_PEEK, this.handleDeckPeek.bind(this));
    this.register(EFFECT_KEYWORDS.POWER_TRANSFER, this.handlePowerTransfer.bind(this));
    this.register(EFFECT_KEYWORDS.TARGET_SPECIFIC, this.handleTargetSpecific.bind(this));
    this.register(EFFECT_KEYWORDS.DOUBLE_BONUS, this.handleDoubleBonus.bind(this));
    
    // 戰術卡特殊效果
    this.register('discard_draw', this.handleDiscardDraw.bind(this));
    this.register('discardThenDraw', this.handleDiscardThenDraw.bind(this)); // 新增
    this.register('putBackThenDraw', this.handlePutBackThenDraw.bind(this)); // 新增
    this.register('sacrifice_debuff', this.handleSacrificeDebuff.bind(this));
    this.register('deck_cycle', this.handleDeckCycle.bind(this));
    this.register('power_boost', this.handlePowerBoost.bind(this));
    this.register('drawBaseOnMyGO', this.handleDrawBaseOnMyGO.bind(this));
    this.register('target_buff', this.handleTargetBuff.bind(this));
    this.register('destroyAllBasesForPermanentPower', this.handleSacrificeAll.bind(this)); // 新增
    this.register('sacrifice_all_bases', this.handleSacrificeAll.bind(this)); // 新增
    this.register('buff_next_batter', this.handleBuffNextBatter.bind(this));
    this.register('buffNextBatter', this.handleBuffNextBatter.bind(this));
  
    
    // 狀態效果
    this.register(EFFECT_KEYWORDS.LOCK, this.handleLock.bind(this));
    this.register(EFFECT_KEYWORDS.IMMUNE, this.handleImmune.bind(this));
    this.register(EFFECT_KEYWORDS.UNTARGETABLE, this.handleUntargetable.bind(this));
    
    // 特殊效果
    this.register(EFFECT_KEYWORDS.COPY, this.handleCopy.bind(this));
    this.register(EFFECT_KEYWORDS.DESTROY, this.handleDestroy.bind(this));
    this.register(EFFECT_KEYWORDS.SACRIFICE, this.handleSacrifice.bind(this));

    // 特殊動作效果
    this.register('lockCharacter', this.handleLockCharacter.bind(this));
    this.register('boostUika', this.handleBoostUika.bind(this));
    this.register('boostMortis', this.handleBoostMortis.bind(this));
    this.register('peekAndRearrange', this.handlePeekAndRearrange.bind(this));
    this.register('buffNextCard', this.handleBuffNextCard.bind(this));
    this.register('shuffleDiscardIntoDeck', this.handleShuffleDiscardIntoDeck.bind(this));
  }

  /**
   * 註冊新的效果處理器
   */
  register(keyword, handler) {
    if (typeof handler !== 'function') {
        console.error(`Attempted to register a non-function for keyword: ${keyword}`);
        return;
    }
    this.handlers.set(keyword, handler);
  }

  /**
   * 處理卡牌效果的主要入口
   */
  // 修改：processEffect 方法 - 添加更好的錯誤處理和調試
  processEffect(card, effectData, trigger) {
    console.log(`🎭 處理效果: ${card.name} - ${trigger}`, effectData);
    
    if (!effectData) {
      console.warn(`❌ 沒有效果數據: ${card.name}`);
      return { success: false, reason: '沒有效果數據' };
    }
    
    // 檢查條件
    if (effectData.condition && !this.checkCondition(effectData.condition, card)) {
      console.log(`❌ 條件不符: ${effectData.condition}`);
      return { success: false, reason: '條件不符' };
    }

    // 確定要執行的動作
    const action = effectData.action || effectData.keyword;
    console.log(`🔍 嘗試執行動作: ${action}`);
    
    if (!action) {
      console.warn(`❌ 沒有指定動作: ${card.name}`);
      return { success: false, reason: '沒有指定動作' };
    }

    const handler = this.handlers.get(action);
    
    if (!handler) {
      console.warn(`⚠️ 未知的效果關鍵字: ${action}`);
      console.log(`📋 可用的處理器:`, Array.from(this.handlers.keys()));
      return { success: false, reason: `未知效果: ${action}` };
    }

    try {
      const result = handler(effectData, card);
      if (result && result.success) {
        console.log(`✅ 效果執行成功: ${result.description}`);
      } else {
        console.warn(`❌ 效果執行失敗:`, result);
      }
      return result;
    } catch (error) {
      console.error(`❌ 效果執行異常: ${action}`, error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * 檢查觸發條件
   */
  // 修復問題4：在 checkCondition 方法中也加入安全檢查
  checkCondition(condition, card) {
    if (!condition) return true;
    
    try {
      // 處理字符串條件
      if (typeof condition === 'string') {
        // 🔧 修復：安全的字符串處理
        const conditionStr = String(condition || '').toLowerCase();
        
        switch (conditionStr) {
          case 'basesempty':
            return this.state.bases.every(base => base === null);
          case 'onbase':
            return this.state.bases.some(base => base && String(base.name || '').includes(String(card.name || '')));
          case 'mygomembersonbase':
            return this.state.bases.some(base => base && String(base.band || '') === 'MyGO!!!!!');
          case 'tomorionbase':
            return this.state.bases.some(base => base && String(base.name || '').includes('燈'));
          case 'sakionbase':
            return this.state.bases.some(base => base && String(base.name || '').includes('祥子'));
          case 'scorecomparison':
            return true;
          default:
            console.log(`🔍 未知字符串條件: ${condition}`);
            return true;
        }
      }
      
      // 處理對象條件
      if (typeof condition === 'object' && condition !== null) {
        switch (condition.type) {
          case 'basesEmpty':
            return this.state.bases.every(base => base === null);
          case 'countMyGOBattersOnBase':
            const count = this.state.bases.filter(b => 
              b && String(b.band || '') === 'MyGO!!!!!'
            ).length;
            return count >= (condition.value || 1);
          default:
            console.log(`🔍 未知對象條件:`, condition);
            return true;
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ checkCondition 錯誤:', error, { condition, card });
      return false;
    }
  }


  
  // === 基礎動作處理器 ===

  // 修改：applyPermanentEffects 方法 - 確保永久效果被正確應用
  applyPermanentEffects(card) {
    // 從永久效果存儲中獲取
    if (this.permanentEffects.has(card.name)) {
      const effects = this.permanentEffects.get(card.name);
      card.permanentBonus = card.permanentBonus || {};
      
      Object.keys(effects).forEach(stat => {
        card.permanentBonus[stat] = (card.permanentBonus[stat] || 0) + effects[stat];
      });
      
      console.log(`🔮 應用永久效果: ${card.name}`, card.permanentBonus);
    }
    
    // 直接使用 card.permanentBonus，不要重複存儲
    if (card.permanentBonus) {
      console.log(`應用永久效果: ${card.name}`, card.permanentBonus);
    }
  }


  // 修改：applyNextCardBuffs 方法 - 支援最大數值設定
  applyNextCardBuffs(card) {
    this.nextCardBuffs.forEach((buff, index) => {
      if (buff.type === 'max_stats') {
        // 直接設定最大數值
        card.tempBonus = card.tempBonus || {};
        Object.keys(buff.stats).forEach(stat => {
          const targetValue = buff.stats[stat];
          const currentValue = card.stats[stat] + (card.tempBonus[stat] || 0);
          if (currentValue < targetValue) {
            card.tempBonus[stat] = targetValue - card.stats[stat];
          }
        });
        console.log(`✨ 應用春日影效果: ${card.name} 數值設為最大`);
      } else {
        // 一般加成
        if (this.isTargetCard(card, buff.cardName || '')) {
          card.tempBonus = card.tempBonus || {};
          card.tempBonus[buff.stat] = (card.tempBonus[buff.stat] || 0) + buff.value;
          console.log(`✨ 應用預設加成: ${card.name} ${buff.stat}+${buff.value}`);
        }
      }
    });
    
    // 清除已使用的加成
    this.nextCardBuffs = this.nextCardBuffs.filter((buff, index) => {
      if (buff.type === 'max_stats') {
        return false; // 移除已使用的春日影效果
      }
      return !this.isTargetCard(card, buff.cardName || '');
    });
  }

  
  // 新增：在 EffectProcessor 類中添加 processBattlecry 方法
  processBattlecry(card) {
    if (card.effects && card.effects.play) {
      return this.processEffect(card, card.effects.play, 'play');
    }
    return { success: false, reason: '沒有戰吼效果' };
  }
  // 新增：在 EffectProcessor 類中添加 processDeathrattle 方法
  processDeathrattle(card) {
    if (card.effects && card.effects.death) {
      return this.processEffect(card, card.effects.death, 'death');
    }
    return { success: false, reason: '沒有死聲效果' };
  }// 新增：在 EffectProcessor 類中添加 processSynergy 方法
  processSynergy(card) {
    if (card.effects && card.effects.synergy) {
      return this.processEffect(card, card.effects.synergy, 'synergy');
    }
    return { success: false, reason: '沒有羈絆效果' };
  }
  // 新增：在 EffectProcessor 類中添加 processAura 方法
  processAura(card) {
    if (card.effects && card.effects.aura) {
      return this.processEffect(card, card.effects.aura, 'aura');
    }
    return { success: false, reason: '沒有光環效果' };
  }
  // 新增：在 EffectProcessor 類中添加 cleanupExpiredEffects 方法
  cleanupExpiredEffects(state, context = 'turn') {
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
  handleDraw(effectData, card) {
    const count = effectData.value || 1;
    this.drawCards(this.state.player, count);
    return { 
      success: true, 
      description: `${card.name} 抽了 ${count} 張卡` 
    };
  }

  handleDiscard(effectData, card) {
    const count = effectData.value || 1;
    if (this.state.player.hand.length < count) {
      return { success: false, reason: '手牌不足' };
    }
    for (let i = 0; i < count; i++) {
      const discarded = this.state.player.hand.pop();
      this.state.player.discard.push(discarded);
    }
    return { 
      success: true, 
      description: `${card.name} 棄了 ${count} 張卡` 
    };
  }
  
  handleSearch(effectData, card) {
    return { success: true, description: `搜尋效果待實現` };
  }
  
  handleShuffle(effectData, card) {
    this.shuffleDeck(this.state.player.deck);
    return { success: true, description: `牌庫已洗勻` };
  }
  // 新增：handleLockCharacter 處理器
  handleLockCharacter(effectData, card) {
    // 由於目標已在 main.js 中設置，直接從 effectData 獲取
    const targetCard = effectData.targetCard;
    const targetIndex = effectData.targetIndex;
    
    if (!targetCard) {
      return { success: false, reason: '沒有目標角色' };
    }
    
    targetCard.locked = true;
    console.log(`🔒 角色被鎖定: ${targetCard.name} 在 ${targetIndex + 1} 壘`);
    
    return {
      success: true,
      description: `${targetCard.name} 被鎖定在 ${targetIndex + 1} 壘上！一輩子...`
    };
  }

  // 新增：handleBoostUika 處理器 (真奈的死聲效果)
  handleBoostUika(effectData, card) {
    // 為初華永久增加數值
    [...this.state.player.hand, ...this.state.bases.filter(Boolean), ...this.state.player.deck].forEach(targetCard => {
      if (targetCard && targetCard.name.includes('初華')) {
        targetCard.permanentBonus = targetCard.permanentBonus || {};
        ['power', 'hitRate', 'contact', 'speed'].forEach(stat => {
          targetCard.permanentBonus[stat] = (targetCard.permanentBonus[stat] || 0) + 5;
        });
      }
    });
    
    return {
      success: true,
      description: `${card.name} 的二人一體：初華獲得永久全數值+5！`
    };
  }

  // 修改：handleBoostMortis 函數 - 確保正確增強 Mortis
  handleBoostMortis(effectData, card) {
    let mortisFound = false;
    let mortisEnhanced = 0;
    
    // 修改：在所有位置搜尋 Mortis
    [...this.state.player.hand, ...this.state.bases.filter(Boolean), ...this.state.player.deck, ...this.state.player.discard].forEach(targetCard => {
      if (targetCard && targetCard.name === 'Mortis') {
        targetCard.permanentBonus = targetCard.permanentBonus || {};
        targetCard.permanentBonus.power = (targetCard.permanentBonus.power || 0) + 10;
        mortisFound = true;
        mortisEnhanced++;
        console.log(`💀 睦的死聲：為 ${targetCard.name} 增加力量+10`, targetCard.permanentBonus);
      }
    });
    
    if (!mortisFound) {
      console.log(`⚠️ 找不到 Mortis 卡牌`);
      return {
        success: false,
        description: `${card.name} 的死聲：找不到 Mortis`
      };
    }
    
    return {
      success: true,
      description: `${card.name} 的死聲：為 ${mortisEnhanced} 張 Mortis 卡永久增加力量+10！`
    };
  }

  // 新增：handlePeekAndRearrange 處理器 (海鈴的戰吼)
  handlePeekAndRearrange(effectData, card) {
    const peekCount = effectData.value || 3;
    const topCards = this.state.player.deck.slice(-peekCount);
    
    console.log(`🔍 ${card.name} 檢視了牌庫頂的 ${peekCount} 張牌:`, topCards.map(c => c.name));
    
    return {
      success: true,
      description: `${card.name} 檢視並重新排列了牌庫頂的 ${peekCount} 張牌`
    };
  }

  // 新增：handleBuffNextCard 處理器 (海鈴的死聲)
  handleBuffNextCard(effectData, card) {
    // 為下一張打出的卡牌設置加成
    this.nextCardBuffs.push({
      source: card.name,
      stat: effectData.stat,
      value: effectData.value,
      duration: 'atBat',
      description: '經驗傳承效果'
    });
    
    return {
      success: true,
      description: `${card.name} 的經驗將傳承給下一張卡牌 (${effectData.stat}+${effectData.value})`
    };
  }

  // 新增：handleShuffleDiscardIntoDeck 處理器 (CRYCHIC卡)
  handleShuffleDiscardIntoDeck(effectData, card) {
    // 檢查棄牌堆中不同角色卡的數量
    const characterCards = this.state.player.discard.filter(c => c.type === 'batter');
    const uniqueNames = new Set(characterCards.map(c => c.name));
    
    if (uniqueNames.size < 5) {
      return { 
        success: false, 
        reason: `棄牌堆中只有 ${uniqueNames.size} 種不同角色卡，需要至少 5 種` 
      };
    }
    
    // 將棄牌堆中的角色卡洗入牌庫
    const charactersToShuffle = this.state.player.discard.filter(c => c.type === 'batter');
    charactersToShuffle.forEach(c => {
      const index = this.state.player.discard.indexOf(c);
      if (index > -1) {
        this.state.player.discard.splice(index, 1);
        this.state.player.deck.push(c);
      }
    });
    
    // 洗勻牌庫
    this.shuffleDeck(this.state.player.deck);
    
    // 手牌上限+1
    this.state.handSizeLimit = (this.state.handSizeLimit || 7) + 1;
    
    return {
      success: true,
      description: `CRYCHIC：將 ${charactersToShuffle.length} 張角色卡洗入牌庫，手牌上限永久+1！`
    };
  }

  // === 條件效果處理器 ===

  handleConditionalBuff(effectData, card) {
    if (!this.checkCondition(effectData.condition, card)) {
      return { success: false, reason: '條件不符' };
    }
    const target = this.getTargets(effectData.target, card)[0];
    if (!target) {
      return { success: false, reason: '找不到目標' };
    }
    target.tempBonus = target.tempBonus || {};
    target.tempBonus[effectData.stat] = (target.tempBonus[effectData.stat] || 0) + effectData.value;
    return {
      success: true,
      description: `${card.name}: ${effectData.description}`
    };
  }

  handleConditionalDraw(effectData, card) {
    let totalDraw = effectData.baseValue || 0;
    if (this.checkCondition(effectData.condition, card)) {
      totalDraw += effectData.bonusValue || 0;
    }
    if (totalDraw > 0) {
      this.drawCards(this.state.player, totalDraw);
    }
    return {
      success: true,
      description: `${card.name} 抽了 ${totalDraw} 張卡`
    };
  }

  handleConditionalEffect(effectData, card) {
    const homeScore = this.state.score.home;
    const awayScore = this.state.score.away;
    let actionToExecute = null;

    effectData.actions.forEach(action => {
      if (action.condition === 'leading' && homeScore > awayScore) actionToExecute = action;
      else if (action.condition === 'trailing' && homeScore < awayScore) actionToExecute = action;
    });

    if (!actionToExecute) return { success: false, reason: '沒有符合的條件' };

    const handler = this.handlers.get(actionToExecute.keyword);
    if (handler) {
        return handler(actionToExecute, card);
    }
    return { success: false, reason: '未知的動作類型' };
  }


  // 新增：handleDiscardThenDraw 處理器
  handleDiscardThenDraw(effectData, card) {
    const discardCount = effectData.discardCount || 1;
    const drawCount = effectData.drawCount || 1;
    
    if (this.state.player.hand.length < discardCount) {
      return { success: false, reason: '手牌不足' };
    }

    // 棄牌
    for (let i = 0; i < discardCount; i++) {
      const discarded = this.state.player.hand.pop();
      this.state.player.discard.push(discarded);
    }

    // 抽牌
    this.drawCards(this.state.player, drawCount);

    return {
      success: true,
      description: `棄了 ${discardCount} 張牌，抽了 ${drawCount} 張牌`
    };
  }

  // 新增：handlePutBackThenDraw 處理器
  handlePutBackThenDraw(effectData, card) {
    const putBackCount = effectData.putBackCount || 1;
    const drawCount = effectData.drawCount || 2;
    
    if (this.state.player.hand.length < putBackCount) {
      return { success: false, reason: '手牌不足' };
    }

    // 將手牌放回牌庫底
    for (let i = 0; i < putBackCount; i++) {
      const putBack = this.state.player.hand.pop();
      this.state.player.deck.unshift(putBack); // 放到牌庫底
    }

    // 抽牌
    this.drawCards(this.state.player, drawCount);

    return {
      success: true,
      description: `放回了 ${putBackCount} 張牌到牌庫底，抽了 ${drawCount} 張牌`
    };
  }

  // 新增：handleSacrificeAll 處理器 (解散樂隊)
  handleSacrificeAll(effectData, card) {
    const destroyedCards = [];
    
    // 收集所有壘上的卡牌
    this.state.bases.forEach((baseCard, index) => {
      if (baseCard) {
        destroyedCards.push(baseCard);
        this.state.player.discard.push(baseCard);
      }
    });
    
    // 清空壘包
    this.state.bases = [null, null, null];
    
    // 計算加成
    const bonusPerCard = effectData.bonusPerDestroyed || 5;
    const totalBonus = destroyedCards.length * bonusPerCard;
    
    if (totalBonus > 0) {
      // 為所有角色卡永久增加數值
      [...this.state.player.deck, ...this.state.player.hand, ...this.state.player.discard].forEach(deckCard => {
        if (deckCard.type === 'batter') {
          deckCard.permanentBonus = deckCard.permanentBonus || {};
          ['power', 'hitRate', 'contact', 'speed'].forEach(stat => {
            deckCard.permanentBonus[stat] = (deckCard.permanentBonus[stat] || 0) + bonusPerCard;
          });
        }
      });
    }
    
    return {
      success: true,
      description: `解散樂隊！摧毀了 ${destroyedCards.length} 名角色，所有打者全數值永久+${bonusPerCard}！`
    };
  }

  // === 高級效果處理器 ===

  handleCopyStats(effectData, card) {
    if (!this.checkCondition(effectData.condition, card)) return { success: false, reason: '條件不符' };
    
    const saki = [...this.state.bases, ...this.state.player.hand].find(c => c && c.name.includes('祥子'));
    if (!saki) return { success: false, reason: '找不到祥子' };

    const sakiStats = this.calculateTotalStats(saki);
    card.tempBonus = card.tempBonus || {};
    Object.keys(card.stats).forEach(stat => {
      card.tempBonus[stat] = (sakiStats[stat] || card.stats[stat]) - card.stats[stat];
    });

    return {
      success: true,
      description: `${card.name} 複製了祥子的所有數值！`
    };
  }

  handleDeckPeek(effectData, card) {
    const peekCount = effectData.value || 3;
    const topCards = this.state.player.deck.slice(-peekCount);
    console.log(`🔍 ${card.name} 檢視了牌庫頂的 ${peekCount} 張牌:`, topCards.map(c => c.name));
    return {
      success: true,
      description: `${card.name} 檢視並重新排列了牌庫頂的 ${peekCount} 張牌`
    };
  }


  // 修改：handlePowerTransfer 方法 - 修復睦與Mortis的死聲效果
  handlePowerTransfer(effectData, card) {
    const targetName = effectData.target;
    const stat = effectData.stat;
    const value = effectData.value;
    
    console.log(`💀 處理力量轉移: ${card.name} → ${targetName}`);

    // 修復：擴大搜索範圍，包含所有可能的位置
    const allCards = [
      ...this.state.player.hand,
      ...this.state.bases.filter(Boolean),
      ...this.state.player.deck,
      ...this.state.player.discard
    ];

    let targetFound = false;
    let enhancedCount = 0;

    allCards.forEach(targetCard => {
      if (targetCard && this.isTargetCard(targetCard, targetName)) {
        targetFound = true;
        enhancedCount++;
        
        // 使用永久效果存儲
        this.permanentEffects.set(targetCard.name, this.permanentEffects.get(targetCard.name) || {});
        const effects = this.permanentEffects.get(targetCard.name);
        
        if (stat === 'allStats') {
          ['power', 'hitRate', 'contact', 'speed'].forEach(s => {
            effects[s] = (effects[s] || 0) + value;
            // 同時更新 permanentBonus
            targetCard.permanentBonus = targetCard.permanentBonus || {};
            targetCard.permanentBonus[s] = (targetCard.permanentBonus[s] || 0) + value;
          });
        } else {
          effects[stat] = (effects[stat] || 0) + value;
          // 同時更新 permanentBonus
          targetCard.permanentBonus = targetCard.permanentBonus || {};
          targetCard.permanentBonus[stat] = (targetCard.permanentBonus[stat] || 0) + value;
        }
        
        console.log(`✅ ${targetCard.name} 獲得永久加成:`, targetCard.permanentBonus);
      }
    });

    if (!targetFound) {
      console.log(`⚠️ 找不到目標: ${targetName}`);
      return {
        success: false,
        description: `${card.name} 的死聲：找不到 ${targetName}`
      };
    }

    return {
      success: true,
      description: `${card.name} 的死聲：為 ${enhancedCount} 張 ${targetName} 卡永久增加 ${stat}+${value}！`
    };
  }

  /**
   * 處理針對特定名稱卡牌效果的函式 (完整重寫版)
   * @param {object} effectData - 效果的具體數據，如目標名稱、數值
   * @param {object} card - 發動此效果的卡牌本身（例如「抹茶芭菲」）
   */
  handleTargetSpecific(effectData, card) {
    // --- 第 1 步：從效果數據中獲取目標名稱 ---
    const targetName = effectData.target; // 例如 "樂奈"
  
    // 防禦性檢查：如果效果沒有指定目標，則中止
    if (!targetName) {
      return { success: false, reason: '效果缺少 target 屬性' };
    }
  
    // --- 第 2 步：建立一個涵蓋所有可能區域的「超級陣列」---
    // 這是本次修正的核心：我們將所有需要被效果影響的區域
    // (手牌、壘包、牌庫、棄牌堆) 全部合併到一個陣列中，以便進行一次性搜索。
    const allPlayerCards = [
      ...this.state.player.hand,       // 搜索「手牌」
      ...this.state.bases.filter(Boolean), // 搜索「壘包上」的跑者 (使用 filter 過濾掉空壘包)
      ...this.state.player.deck,       // 搜索「牌庫中」的所有卡牌
      ...this.state.player.discard     // 搜索「棄牌堆中」的所有卡牌
    ];
  
    // --- 第 3 步：從「超級陣列」中，篩選出所有符合目標名稱的卡牌 ---
    const targets = allPlayerCards.filter(c => this.isTargetCard(c, targetName));
  
    // 如果一張都沒找到，就回報失敗並中止
    if (targets.length === 0) {
      return { success: false, reason: `在任何地方都找不到 ${targetName}` };
    }
  
    console.log(`🔍 找到了 ${targets.length} 張 '${targetName}'，準備施加效果...`);
  
    // --- 第 4 步：遍歷所有找到的目標，為它們加上效果 ---
    targets.forEach(target => {
      // 確保目標卡上有 tempBonus 物件可用
      target.tempBonus = target.tempBonus || {};
      
      const statsToBuff = effectData.stat === 'allStats' ? ['power', 'hitRate', 'contact', 'speed'] : [effectData.stat];
      
      // 為指定的數值加上效果值
      statsToBuff.forEach(s => {
          target.tempBonus[s] = (target.tempBonus[s] || 0) + effectData.value;
      });
    });
  
    // --- 第 5 步：處理額外的獎勵效果（如果有的話）---
    // 例如，有些卡可能在強化隊友後，還能讓你抽一張牌
    if (effectData.bonusEffect) {
      this.processEffect(card, effectData.bonusEffect, 'bonus');
    }
  
    // --- 第 6 步：回報成功 ---
    return {
      success: true,
      description: `強化了所有位於任何地方的 ${targetName} 卡牌`
    };
  }

  handleDoubleBonus(effectData, card) {
    const permanentBonus = this.permanentEffects.get(card.name) || {};
    card.tempBonus = card.tempBonus || {};
    Object.keys(permanentBonus).forEach(stat => {
      card.tempBonus[stat] = (card.tempBonus[stat] || 0) + permanentBonus[stat];
    });
    return {
      success: true,
      description: `${card.name} 的永久加成再次生效！`
    };
  }

  // 新增：handleBuffNextBatter 處理器
  handleBuffNextBatter(effectData, card) {
    // 為下一張打出的打者卡設置最大數值
    this.nextCardBuffs.push({
      source: card.name,
      type: 'max_stats',
      stats: effectData.stats,
      duration: effectData.duration || 'atBat',
      description: '春日影效果：安打率與專注視為99'
    });

    return {
      success: true,
      description: `${card.name}：下一位打者的安打率與專注將視為99！`
    };
  }

  // === 戰術卡特殊效果處理器 ===

  handleDiscardDraw(effectData, card) {
    const discardCount = effectData.value.discardCount || 1;
    const drawCount = effectData.value.drawCount || 1;
    if (this.state.player.hand.length < discardCount) return { success: false, reason: '手牌不足' };

    for (let i = 0; i < discardCount; i++) {
      const discarded = this.state.player.hand.pop();
      this.state.player.discard.push(discarded);
    }
    this.drawCards(this.state.player, drawCount);
    return {
      success: true,
      description: `棄了 ${discardCount} 張牌，抽了 ${drawCount} 張牌`
    };
  }

  handleSacrificeDebuff(effectData, card) {
    const cost = effectData.cost.count || 1;
    if (this.state.player.hand.length < cost) return { success: false, reason: '手牌不足以支付代價' };

    for (let i = 0; i < cost; i++) {
      const discarded = this.state.player.hand.pop();
      this.state.player.discard.push(discarded);
    }
    this.addActiveEffect({
      source: card.name, target: 'enemyPitcher', type: 'debuff',
      stat: 'allStats', value: effectData.value, duration: effectData.duration
    });
    return {
      success: true,
      description: `犧牲了 ${cost} 張手牌，對方投手所有數值${effectData.value}！`
    };
  }

  handleDeckCycle(effectData, card) {
    const putBackCount = effectData.value.putBackCount || 1;
    const drawCount = effectData.value.drawCount || 2;
    if (this.state.player.hand.length < putBackCount) return { success: false, reason: '手牌不足' };

    for (let i = 0; i < putBackCount; i++) {
      const putBack = this.state.player.hand.pop();
      this.state.player.deck.unshift(putBack);
    }
    this.drawCards(this.state.player, drawCount);
    return {
      success: true,
      description: `放回了 ${putBackCount} 張牌到牌庫底，抽了 ${drawCount} 張牌`
    };
  }

  handlePowerBoost(effectData, card) {
    const currentBatter = this.getCurrentBatter();
    if (!currentBatter) return { success: false, reason: '沒有當前打者' };

    currentBatter.tempBonus = currentBatter.tempBonus || {};
    currentBatter.tempBonus[effectData.stat] = (currentBatter.tempBonus[effectData.stat] || 0) + effectData.value;
    return {
      success: true,
      description: `${currentBatter.name} 本次打擊 ${effectData.stat}+${effectData.value}！`
    };
  }

  handleDrawBaseOnMyGO(effectData, card) {
    const baseCount = effectData.baseValue || 1;
    const mygoCount = this.state.bases.filter(base => base && base.band === 'MyGO!!!!!').length;
    const bonusDraw = Math.min(mygoCount * (effectData.bonusPerMyGO || 1), effectData.maxBonus || 3);
    const totalDraw = baseCount + bonusDraw;
    this.drawCards(this.state.player, totalDraw);
    return {
      success: true,
      description: `抽了 ${baseCount} 張基礎牌 + ${bonusDraw} 張額外牌 (共 ${totalDraw} 張)`
    };
  }

  handleTargetBuff(effectData, card) {
    // 這裡需要UI互動來選擇目標，暫時簡化為選擇第一張
    const mygoCards = this.state.player.hand.filter(handCard => 
      handCard.type === 'batter' && handCard.band === 'MyGO!!!!!'
    );
    if (mygoCards.length === 0) return { success: false, reason: '手牌中沒有MyGO!!!!!角色' };
    
    const targetCard = mygoCards[0];
    this.nextCardBuffs.push({
      cardName: targetCard.name, stat: effectData.stat,
      value: effectData.value, duration: effectData.duration
    });
    return {
      success: true,
      description: `${targetCard.name} 下次打出時將獲得 ${effectData.stat}+${effectData.value}！`
    };
  }

  handleMaxStats(effectData, card) {
    const currentBatter = this.getCurrentBatter();
    if (!currentBatter) return { success: false, reason: '沒有當前打者' };

    currentBatter.tempBonus = currentBatter.tempBonus || {};
    Object.keys(effectData.stats).forEach(stat => {
      const targetValue = effectData.stats[stat];
      currentBatter.tempBonus[stat] = targetValue - currentBatter.stats[stat];
    });
    return {
      success: true,
      description: `${currentBatter.name} 本次打擊數值設為最大值！`
    };
  }

  // === 輔助方法 ===

  addActiveEffect(effect) {
    this.state.activeEffects.push(effect);
  }

  getTargets(targetType, sourceCard) {
    switch (targetType) {
      case TARGET_TYPES.SELF: return [sourceCard];
      case TARGET_TYPES.ALL_ON_BASE: return this.state.bases.filter(Boolean);
      case TARGET_TYPES.ALL_FRIENDLY: return [...this.state.player.hand, ...this.state.bases.filter(Boolean)];
      case TARGET_TYPES.ALL_MYGO_BATTERS:
        return [...this.state.player.hand, ...this.state.bases.filter(Boolean)]
          .filter(card => card.band === 'MyGO!!!!!' && card.type === 'batter');
      case TARGET_TYPES.CURRENT_BATTER: return [this.getCurrentBatter()].filter(Boolean);
      default: return [];
    }
  }

  getCurrentBatter() {
    if (this.state.selected !== -1 && this.state.player.hand[this.state.selected]) {
      return this.state.player.hand[this.state.selected];
    }
    return null;
  }

  // 修復問題4：在多個可能出現 toLowerCase 錯誤的地方添加安全檢查
  isTargetCard(card, targetName) {
    // 👇 新增的防禦性程式碼
    if (!targetName || !card?.name) {
      return false;
    }
    
    try {
      // 🔧 修復：安全的字符串轉換，防止 toLowerCase 錯誤
      const cardName = String(card.name || '').toLowerCase();
      const searchName = String(targetName || '').toLowerCase();
      
      if (!cardName || !searchName) return false;
      
      const nameMap = {
        'rana': '樂奈', 
        '樂奈': '樂奈',
        'rāna': '樂奈',
        'mortis': 'mortis', 
        'mutsuki': '睦', 
        '睦': '睦',
        'uika': '初華', 
        '初華': '初華',
        'saki': '祥子',
        '祥子': '祥子'
      };
      
      const mappedTarget = nameMap[searchName] || targetName;
      const mappedTargetLower = String(mappedTarget || '').toLowerCase();
      
      return cardName.includes(mappedTargetLower) || 
             cardName.includes(searchName) ||
             String(card.name).includes(String(mappedTarget)) ||
             String(card.name).includes(String(targetName));
    } 
    catch (error) {
      console.error('❌ isTargetCard 錯誤:', error, { card, targetName });
      return false;
    }
  }

  calculateTotalStats(card) {
    const baseStats = { ...card.stats };
    const permanentBonus = this.permanentEffects.get(card.name) || {};
    const tempBonus = card.tempBonus || {};
    const totalStats = {};

    Object.keys(baseStats).forEach(stat => {
      totalStats[stat] = (baseStats[stat] || 0) + (permanentBonus[stat] || 0) + (tempBonus[stat] || 0);
    });
    return totalStats;
  }

  // 修改：drawCards 方法 - 使用配置的手牌上限
  drawCards(player, count) {
    const maxHandSize = GAME_CONFIG.HAND.MAX_SIZE; // 不是 CONFIG.handSize
    const actualCount = Math.min(count, maxHandSize - player.hand.length);
    
    console.log(`🎴 抽牌: 嘗試${count}張，實際${actualCount}張`);
    
    for (let i = 0; i < actualCount; i++) {
      if (player.deck.length === 0) {
        if (player.discard.length === 0) {
          console.warn('⚠️ 牌庫和棄牌堆都是空的');
          break;
        }
        
        console.log('🔄 重新洗牌');
        player.deck = [...player.discard];
        player.discard = [];
        this.shuffleDeck(player.deck);
      }
      
      if (player.deck.length > 0) {
        const drawnCard = player.deck.pop();
        
        // 應用永久效果
        this.applyPermanentEffects(drawnCard);
        
        player.hand.push(drawnCard);
        console.log(`🎴 抽到: ${drawnCard.name}`);
      }
    }
  }
  

  shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  
  // === 舊版本兼容性方法 ===
  handleBuff(effectData, card) {
    const targets = this.getTargets(effectData.target, card);
    targets.forEach(target => {
      this.addActiveEffect({
        source: card.name, target: target, type: 'buff',
        stat: effectData.stat, value: effectData.value, duration: effectData.duration || DURATIONS.TURN
      });
    });
    return { success: true, description: `${card.name} 為目標提供了 ${effectData.stat}+${effectData.value} 的加成` };
  }

  handleDebuff(effectData, card) {
    const targets = this.getTargets(effectData.target, card);
    const value = -Math.abs(effectData.value);
    targets.forEach(target => {
      this.addActiveEffect({
        source: card.name, target: target, type: 'debuff',
        stat: effectData.stat, value: value, duration: effectData.duration || DURATIONS.TURN
      });
    });
    return { success: true, description: `${card.name} 為目標施加了 ${effectData.stat}${value} 的減益` };
  }

  handleSetTo(effectData, card) {
    const targets = this.getTargets(effectData.target, card);
    targets.forEach(target => {
        target.stats[effectData.stat] = effectData.value;
    });
    return { success: true, description: `${card.name} 將目標的 ${effectData.stat} 設為 ${effectData.value}` };
  }
  
  // === 狀態效果處理器 ===
  handleLock(effectData, card) {
    const targets = this.getTargets(effectData.target, card);
    targets.forEach(target => { target.locked = true; });
    return { success: true, description: `${targets.map(t => t.name).join(', ')} 被鎖定了！` };
  }

  handleImmune(effectData, card) {
    const targets = this.getTargets(effectData.target, card);
    targets.forEach(target => { target.immune = true; });
    return { success: true, description: `${targets.map(t => t.name).join(', ')} 變得免疫！` };
  }

  handleUntargetable(effectData, card) {
    const targets = this.getTargets(effectData.target, card);
    targets.forEach(target => { target.untargetable = true; });
    return { success: true, description: `${targets.map(t => t.name).join(', ')} 變得無法被指定！` };
  }

  // === 特殊效果處理器 ===
  handleCopy(effectData, card) {
    return { success: true, description: `複製效果待實現` };
  }

  handleDestroy(effectData, card) {
    const targets = this.getTargets(effectData.target, card);
    targets.forEach(target => {
      const baseIndex = this.state.bases.findIndex(b => b === target);
      if (baseIndex !== -1) {
        this.state.player.discard.push(this.state.bases[baseIndex]);
        this.state.bases[baseIndex] = null;
      }
    });
    return { success: true, description: `摧毀了 ${targets.map(t => t.name).join(', ')}！` };
  }

  handleSacrifice(effectData, card) {
    return { success: true, description: `犧牲效果已在卡牌中處理` };
  }
}