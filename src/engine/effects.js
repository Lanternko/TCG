// src/engine/effects.js - Enhanced effect system for new card mechanics

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
    this.permanentEffects = new Map(); // 儲存永久效果
    this.nextCardBuffs = []; // 儲存下一張卡的加成
    this.registerDefaultHandlers();
  }

  /**
   * 註冊所有預設的效果處理器
   */
  // 🆕 新增：在 registerDefaultHandlers 方法中添加遺漏的處理器
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
    this.register('sacrifice_debuff', this.handleSacrificeDebuff.bind(this));
    this.register('deck_cycle', this.handleDeckCycle.bind(this));
    this.register('power_boost', this.handlePowerBoost.bind(this));
    this.register('drawBaseOnMyGO', this.handleDrawBaseOnMyGO.bind(this));
    this.register('target_buff', this.handleTargetBuff.bind(this));
    
    // 狀態效果
    this.register(EFFECT_KEYWORDS.LOCK, this.handleLock.bind(this));
    this.register(EFFECT_KEYWORDS.IMMUNE, this.handleImmune.bind(this));
    this.register(EFFECT_KEYWORDS.UNTARGETABLE, this.handleUntargetable.bind(this));
    
    // 特殊效果
    this.register(EFFECT_KEYWORDS.COPY, this.handleCopy.bind(this));
    this.register(EFFECT_KEYWORDS.DESTROY, this.handleDestroy.bind(this));
    this.register(EFFECT_KEYWORDS.SACRIFICE, this.handleSacrifice.bind(this));
  }

  /**
   * 註冊新的效果處理器
   */
  register(keyword, handler) {
    this.handlers.set(keyword, handler);
  }

  /**
   * 處理卡牌效果的主要入口
   */
  processEffect(card, effectData, trigger) {
    console.log(`🎭 處理效果: ${card.name} - ${trigger}`);
    
    // 檢查觸發條件
    if (!this.checkCondition(effectData.condition, card)) {
      console.log(`❌ 條件不符: ${effectData.condition}`);
      return { success: false, reason: '條件不符' };
    }

    // 執行效果
    const action = effectData.action || effectData.keyword;
    const handler = this.handlers.get(action);
    
    if (!handler) {
      console.warn(`⚠️ 未知的效果關鍵字: ${action}`);
      return { success: false, reason: '未知效果' };
    }

    try {
      const result = handler(effectData, card);
      console.log(`✅ 效果執行成功: ${result.description}`);
      return result;
    } catch (error) {
      console.error(`❌ 效果執行失敗: ${error.message}`);
      return { success: false, reason: error.message };
    }
  }

  /**
   * 檢查觸發條件
   */
  checkCondition(condition, card) {
    if (!condition) return true;
    
    switch (condition) {
      case CONDITIONS.ON_BASE:
        return this.state.bases.some(base => base && base.name === card.name);
      
      case CONDITIONS.IN_HAND:
        return this.state.player.hand.some(handCard => handCard.name === card.name);
      
      case CONDITIONS.BASES_EMPTY:
        return this.state.bases.every(base => base === null);
      
      case CONDITIONS.MYGO_MEMBERS_ON_BASE:
        return this.state.bases.some(base => base && base.band === 'MyGO!!!!!');
      
      case CONDITIONS.TOMORI_ON_BASE:
        return this.state.bases.some(base => base && base.name.includes('燈'));
      
      case CONDITIONS.SAKI_ON_BASE:
        return this.state.bases.some(base => base && base.name.includes('祥子'));
      
      case CONDITIONS.SCORE_COMPARISON:
        return true; // 在具體處理中判斷
      
      case CONDITIONS.ANY_CHARACTER_DIES:
        return true; // 死亡事件觸發時檢查
      
      default:
        console.log(`🔍 未知條件: ${condition}`);
        return true;
    }
  }

  // === 基礎動作處理器 ===
  
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
    if (this.state.player.hand.length >= count) {
      for (let i = 0; i < count; i++) {
        const discarded = this.state.player.hand.pop();
        this.state.player.discard.push(discarded);
      }
      return { 
        success: true, 
        description: `${card.name} 棄了 ${count} 張卡` 
      };
    }
    return { success: false, reason: '手牌不足' };
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

    // 應用臨時加成
    target.tempBonus = target.tempBonus || {};
    target.tempBonus[effectData.stat] = (target.tempBonus[effectData.stat] || 0) + effectData.value;

    return {
      success: true,
      description: `${card.name}: ${effectData.description}`
    };
  }

  handleConditionalDraw(effectData, card) {
    const baseCount = effectData.baseValue || 1;
    let totalDraw = baseCount;

    // 計算額外抽牌數
    if (effectData.action === 'drawBaseOnMyGO') {
      const mygoCount = this.state.bases.filter(base => base && base.band === 'MyGO!!!!!').length;
      const bonusDraw = Math.min(mygoCount * (effectData.bonusPerMyGO || 1), effectData.maxBonus || 3);
      totalDraw += bonusDraw;
    }

    this.drawCards(this.state.player, totalDraw);
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
      if (action.condition === 'leading' && homeScore > awayScore) {
        actionToExecute = action;
      } else if (action.condition === 'trailing' && homeScore < awayScore) {
        actionToExecute = action;
      }
    });

    if (!actionToExecute) {
      return { success: false, reason: '沒有符合的條件' };
    }

    // 執行對應的動作
    switch (actionToExecute.keyword) {
      case 'draw':
        this.drawCards(this.state.player, actionToExecute.value);
        return { success: true, description: actionToExecute.description };
      
      case 'debuff':
        // 對敵方投手施加減益
        this.addActiveEffect({
          source: card.name,
          target: 'enemyPitcher',
          type: 'debuff',
          stat: actionToExecute.stat,
          value: actionToExecute.value,
          duration: actionToExecute.duration
        });
        return { success: true, description: actionToExecute.description };
      
      default:
        return { success: false, reason: '未知的動作類型' };
    }
  }

  // === 高級效果處理器 ===

  handleCopyStats(effectData, card) {
    if (!this.checkCondition(effectData.condition, card)) {
      return { success: false, reason: '條件不符' };
    }

    // 找到祥子
    const saki = this.state.bases.find(base => base && base.name.includes('祥子'));
    if (!saki) {
      return { success: false, reason: '找不到祥子' };
    }

    // 複製祥子的數值（包含永久加成）
    const sakiStats = this.calculateTotalStats(saki);
    
    // 為初華設置臨時數值
    card.tempBonus = card.tempBonus || {};
    Object.keys(sakiStats).forEach(stat => {
      card.tempBonus[stat] = sakiStats[stat] - (card.stats[stat] || 0);
    });

    return {
      success: true,
      description: `${card.name} 複製了祥子的所有數值！`
    };
  }

  handleDeckPeek(effectData, card) {
    const peekCount = effectData.value || 3;
    const topCards = this.state.player.deck.slice(-peekCount);
    
    // 這裡應該有UI讓玩家重新排列，暫時只是記錄
    console.log(`🔍 ${card.name} 檢視了牌庫頂的 ${peekCount} 張牌:`, topCards.map(c => c.name));
    
    return {
      success: true,
      description: `${card.name} 檢視並重新排列了牌庫頂的 ${peekCount} 張牌`
    };
  }

  handlePowerTransfer(effectData, card) {
    // 永久力量轉移（死聲效果）
    const targetName = effectData.target;
    const stat = effectData.stat;
    const value = effectData.value;

    // 記錄永久效果
    if (!this.permanentEffects.has(targetName)) {
      this.permanentEffects.set(targetName, {});
    }

    const targetEffects = this.permanentEffects.get(targetName);
    if (stat === 'allStats') {
      ['power', 'hitRate', 'contact', 'speed'].forEach(s => {
        targetEffects[s] = (targetEffects[s] || 0) + value;
      });
    } else {
      targetEffects[stat] = (targetEffects[stat] || 0) + value;
    }

    // 如果目標角色在場上，立即應用效果
    [...this.state.player.hand, ...this.state.bases.filter(Boolean), ...this.state.player.deck].forEach(targetCard => {
      if (targetCard && this.isTargetCard(targetCard, targetName)) {
        targetCard.permanentBonus = targetCard.permanentBonus || {};
        if (stat === 'allStats') {
          ['power', 'hitRate', 'contact', 'speed'].forEach(s => {
            targetCard.permanentBonus[s] = (targetCard.permanentBonus[s] || 0) + value;
          });
        } else {
          targetCard.permanentBonus[stat] = (targetCard.permanentBonus[stat] || 0) + value;
        }
      }
    });

    return {
      success: true,
      description: `${card.name} 為 ${targetName} 永久增加了 ${stat}+${value}`
    };
  }

  handleTargetSpecific(effectData, card) {
    const targetName = effectData.target;
    
    // 找到指定角色
    const targets = [...this.state.player.hand, ...this.state.bases.filter(Boolean)].filter(c => 
      this.isTargetCard(c, targetName)
    );

    if (targets.length === 0) {
      return { success: false, reason: `找不到 ${targetName}` };
    }

    // 對所有找到的目標應用效果
    targets.forEach(target => {
      target.tempBonus = target.tempBonus || {};
      if (effectData.stat === 'allStats') {
        ['power', 'hitRate', 'contact', 'speed'].forEach(stat => {
          target.tempBonus[stat] = (target.tempBonus[stat] || 0) + effectData.value;
        });
      } else {
        target.tempBonus[effectData.stat] = (target.tempBonus[effectData.stat] || 0) + effectData.value;
      }
    });

    // 執行獎勵效果
    if (effectData.bonusEffect && effectData.bonusEffect.keyword === 'draw') {
      this.drawCards(this.state.player, effectData.bonusEffect.value);
    }

    return {
      success: true,
      description: `強化了 ${targets.length} 張 ${targetName} 卡，並 ${effectData.bonusEffect ? '抽了一張卡' : ''}`
    };
  }

  handleDoubleBonus(effectData, card) {
    // 祥子的"世界的中心"效果
    const permanentBonus = card.permanentBonus || {};
    card.tempBonus = card.tempBonus || {};
    
    // 將永久加成再次添加為臨時加成
    Object.keys(permanentBonus).forEach(stat => {
      card.tempBonus[stat] = (card.tempBonus[stat] || 0) + permanentBonus[stat];
    });

    return {
      success: true,
      description: `${card.name} 的永久加成再次生效！`
    };
  }

  // === 戰術卡特殊效果處理器 ===

  handleDiscardDraw(effectData, card) {
    if (this.state.player.hand.length < effectData.discardCount) {
      return { success: false, reason: '手牌不足' };
    }

    // 棄牌
    for (let i = 0; i < effectData.discardCount; i++) {
      const discarded = this.state.player.hand.pop();
      this.state.player.discard.push(discarded);
    }

    // 抽牌
    this.drawCards(this.state.player, effectData.drawCount);

    return {
      success: true,
      description: `棄了 ${effectData.discardCount} 張牌，抽了 ${effectData.drawCount} 張牌`
    };
  }

  handleSacrificeDebuff(effectData, card) {
    // 檢查代價
    if (this.state.player.hand.length < effectData.cost.count) {
      return { success: false, reason: '手牌不足以支付代價' };
    }

    // 支付代價
    for (let i = 0; i < effectData.cost.count; i++) {
      const discarded = this.state.player.hand.pop();
      this.state.player.discard.push(discarded);
    }

    // 對敵方投手施加減益
    this.addActiveEffect({
      source: card.name,
      target: 'enemyPitcher',
      type: 'debuff',
      stat: 'allStats',
      value: effectData.value,
      duration: effectData.duration
    });

    return {
      success: true,
      description: `犧牲了手牌，對方投手所有數值${effectData.value}直到下回合！`
    };
  }

  handleDeckCycle(effectData, card) {
    if (this.state.player.hand.length === 0) {
      return { success: false, reason: '手牌為空' };
    }

    // 將手牌放回牌庫底
    for (let i = 0; i < effectData.putBackCount && this.state.player.hand.length > 0; i++) {
      const putBack = this.state.player.hand.pop();
      this.state.player.deck.unshift(putBack); // 放到牌庫底
    }

    // 抽牌
    this.drawCards(this.state.player, effectData.drawCount);

    return {
      success: true,
      description: `放回了 ${effectData.putBackCount} 張牌到牌庫底，抽了 ${effectData.drawCount} 張牌`
    };
  }

  handlePowerBoost(effectData, card) {
    // 為當前打者添加臨時力量加成
    const currentBatter = this.getCurrentBatter();
    if (!currentBatter) {
      return { success: false, reason: '沒有當前打者' };
    }

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
    // 立希的效果：選擇手牌中的MyGO!!!!!角色進行強化
    const mygoCards = this.state.player.hand.filter(handCard => 
      handCard.type === 'batter' && handCard.band === 'MyGO!!!!!'
    );

    if (mygoCards.length === 0) {
      return { success: false, reason: '手牌中沒有MyGO!!!!!角色' };
    }

    // 簡化版：選擇第一張MyGO!!!!!角色
    const targetCard = mygoCards[0];
    
    // 為下次打出設置加成
    this.nextCardBuffs.push({
      cardName: targetCard.name,
      stat: effectData.stat,
      value: effectData.value,
      duration: effectData.duration
    });

    return {
      success: true,
      description: `${targetCard.name} 下次打出時將獲得 ${effectData.stat}+${effectData.value}！`
    };
  }

  handleMaxStats

  // === 輔助方法 ===

  addActiveEffect(effect) {
    this.state.activeEffects.push(effect);
  }

  getTargets(targetType, sourceCard) {
    switch (targetType) {
      case TARGET_TYPES.SELF:
        return [sourceCard];
      case TARGET_TYPES.ALL_ON_BASE:
        return this.state.bases.filter(Boolean);
      case TARGET_TYPES.ALL_FRIENDLY:
        return [...this.state.player.hand, ...this.state.bases.filter(Boolean)];
      case TARGET_TYPES.ALL_MYGO_BATTERS:
        return [...this.state.player.hand, ...this.state.bases.filter(Boolean)]
          .filter(card => card.band === 'MyGO!!!!!' && card.type === 'batter');
      case TARGET_TYPES.CURRENT_BATTER:
        return [this.getCurrentBatter()].filter(Boolean);
      default:
        return [];
    }
  }

  getCurrentBatter() {
    // 返回當前選中的打者或正在打擊區的打者
    if (this.state.selected !== -1 && this.state.player.hand[this.state.selected]) {
      return this.state.player.hand[this.state.selected];
    }
    return null;
  }

  isTargetCard(card, targetName) {
    // 檢查卡牌是否為指定目標
    switch (targetName) {
      case 'rana':
      case '樂奈':
        return card.name.includes('樂奈');
      case 'mortis':
      case 'Mortis':
        return card.name === 'Mortis';
      case 'mutsuki':
      case '睦':
        return card.name.includes('睦');
      case 'uika':
      case '初華':
        return card.name.includes('初華');
      case 'mana':
      case '真奈':
        return card.name.includes('真奈');
      default:
        return card.name.includes(targetName);
    }
  }

  calculateTotalStats(card) {
    const baseStats = { ...card.stats };
    const permanentBonus = card.permanentBonus || {};
    const tempBonus = card.tempBonus || {};

    const totalStats = {};
    Object.keys(baseStats).forEach(stat => {
      totalStats[stat] = baseStats[stat] + (permanentBonus[stat] || 0) + (tempBonus[stat] || 0);
    });

    return totalStats;
  }

  drawCards(player, count) {
    for (let i = 0; i < count; i++) {
      if (player.deck.length === 0) {
        if (player.discard.length === 0) break;
        player.deck = [...player.discard];
        player.discard = [];
        this.shuffleDeck(player.deck);
      }
      if (player.deck.length > 0) {
        player.hand.push(player.deck.pop());
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
    const stat = effectData.stat;
    const value = effectData.value;
    const duration = effectData.duration || DURATIONS.TURN;
    
    targets.forEach(target => {
      this.addActiveEffect({
        source: card.name,
        target: target,
        type: 'buff',
        stat: stat,
        value: value,
        duration: duration
      });
    });
    
    return { 
      success: true, 
      description: `${card.name} 為目標提供了 ${stat}+${value} 的加成` 
    };
  }

  handleDebuff(effectData, card) {
    const targets = this.getTargets(effectData.target, card);
    const stat = effectData.stat;
    const value = -Math.abs(effectData.value);
    const duration = effectData.duration || DURATIONS.TURN;
    
    targets.forEach(target => {
      this.addActiveEffect({
        source: card.name,
        target: target,
        type: 'debuff',
        stat: stat,
        value: value, // 補上 value
        duration: duration
      }); // 補上 }
    }); // 補上 )

    return { 
      success: true, 
      description: `${card.name} 為目標施加了 ${stat}${value} 的減益` 
    };
  } // 補上 }

  handleSetTo(effectData, card) {
    const targets = this.getTargets(effectData.target, card);
    const stat = effectData.stat;
    const value = effectData.value;
    
    targets.forEach(target => {
      // 這裡可以直接修改角色的基礎數值，或添加一個絕對值的臨時效果
      target.stats[stat] = value;
    });
    
    return { 
      success: true, 
      description: `${card.name} 將目標的 ${stat} 設為 ${value}` 
    };
  }

  // === 狀態效果處理器 ===
  
  handleLock(effectData, card) {
    const targets = this.getTargets(effectData.target, card);
    targets.forEach(target => {
      target.locked = true; 
    });
    return { success: true, description: `${targets.map(t => t.name).join(', ')} 被鎖定了！` };
  }

  handleImmune(effectData, card) {
    const targets = this.getTargets(effectData.target, card);
    targets.forEach(target => {
      target.immune = true;
    });
    return { success: true, description: `${targets.map(t => t.name).join(', ')} 變得免疫！` };
  }

  handleUntargetable(effectData, card) {
    const targets = this.getTargets(effectData.target, card);
    targets.forEach(target => {
      target.untargetable = true;
    });
    return { success: true, description: `${targets.map(t => t.name).join(', ')} 變得無法被指定！` };
  }

  // === 特殊效果處理器 ===

  handleCopy(effectData, card) {
    // 複製效果的邏輯，可能需要更複雜的實現
    return { success: true, description: `複製效果待實現` };
  }

  handleDestroy(effectData, card) {
    const targets = this.getTargets(effectData.target, card);
    // 摧毀邏輯，例如將卡牌從壘上移至棄牌堆
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
    // 犧牲邏輯，例如從手牌棄置
    // 這個關鍵字的主要邏輯在卡牌效果本身，而非通用處理器
    return { success: true, description: `犧牲效果已在卡牌中處理` };
  }
  // 🔧 修改：在 EffectProcessor 類中正確定義 cleanupExpiredEffects 方法
  /**
   * 清理過期效果
   */
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


} // 補上 EffectProcessor class 的結尾 }