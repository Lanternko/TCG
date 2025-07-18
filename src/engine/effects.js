// src/engine/effects.js - 可擴展的效果系統

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
  
  // === 狀態關鍵字 ===
  LOCK: 'lock',
  UNLOCK: 'unlock',
  IMMUNE: 'immune',
  UNTARGETABLE: 'untargetable',
  
  // === 位置關鍵字 ===
  ADVANCE: 'advance',
  RETREAT: 'retreat',
  TELEPORT: 'teleport',
  
  // === 特殊關鍵字 ===
  COPY: 'copy',
  DESTROY: 'destroy',
  TRANSFORM: 'transform',
  SACRIFICE: 'sacrifice'
};

export const TARGET_TYPES = {
  SELF: 'self',
  ALL_FRIENDLY: 'allFriendly',
  ALL_ENEMY: 'allEnemy',
  ALL_ON_BASE: 'allOnBase',
  HAND: 'hand',
  DECK: 'deck',
  DISCARD_PILE: 'discardPile',
  CHOOSE_ONE: 'chooseOne',
  RANDOM_ONE: 'randomOne'
};

export const CONDITIONS = {
  // === 位置條件 ===
  ON_BASE: 'onBase',
  IN_HAND: 'inHand',
  ON_PLAY: 'onPlay',
  
  // === 數量條件 ===
  COUNT_EQUAL: 'countEqual',
  COUNT_MORE_THAN: 'countMoreThan',
  COUNT_LESS_THAN: 'countLessThan',
  
  // === 特定條件 ===
  HAS_TAG: 'hasTag',
  HAS_INSTRUMENT: 'hasInstrument',
  HAS_BAND: 'hasBand',
  IS_TRAILING: 'isTrailing',
  IS_LEADING: 'isLeading'
};

export const DURATIONS = {
  INSTANT: 'instant',
  AT_BAT: 'atBat', 
  TURN: 'turn',
  INNING: 'inning',
  GAME: 'game',
  PERMANENT: 'permanent'
};

/**
 * 標準化的效果處理器
 * 這個類負責解析和執行所有卡牌效果
 */
export class EffectProcessor {
  constructor(gameState) {
    this.state = gameState;
    this.handlers = new Map();
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
    
    // 狀態效果
    this.register(EFFECT_KEYWORDS.LOCK, this.handleLock.bind(this));
    this.register(EFFECT_KEYWORDS.IMMUNE, this.handleImmune.bind(this));
    this.register(EFFECT_KEYWORDS.UNTARGETABLE, this.handleUntargetable.bind(this));
    
    // 位置效果
    this.register(EFFECT_KEYWORDS.ADVANCE, this.handleAdvance.bind(this));
    this.register(EFFECT_KEYWORDS.RETREAT, this.handleRetreat.bind(this));
    
    // 特殊效果
    this.register(EFFECT_KEYWORDS.COPY, this.handleCopy.bind(this));
    this.register(EFFECT_KEYWORDS.DESTROY, this.handleDestroy.bind(this));
    this.register(EFFECT_KEYWORDS.SACRIFICE, this.handleSacrifice.bind(this));
  }

  /**
   * 註冊新的效果處理器（供擴展使用）
   */
  register(keyword, handler) {
    this.handlers.set(keyword, handler);
  }

  /**
   * 處理卡牌效果的主要入口
   */
  processEffect(card, effectData, trigger) {
    console.log(`處理效果: ${card.name} - ${trigger}`);
    
    // 檢查觸發條件
    if (!this.checkCondition(effectData.condition, card)) {
      return { success: false, reason: '條件不符' };
    }

    // 執行效果
    const action = effectData.action || effectData.keyword;
    const handler = this.handlers.get(action);
    
    if (!handler) {
      console.warn(`未知的效果關鍵字: ${action}`);
      return { success: false, reason: '未知效果' };
    }

    return handler(effectData, card);
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
      
      case 'mygo3OnBase':
        return this.state.bases.filter(base => base && base.band === 'MyGO!!!!!').length >= 3;
      
      case 'mujica3OnBase':
        return this.state.bases.filter(base => base && base.band === 'Mujica').length >= 3;
      
      case 'tomoriOnBase':
        return this.state.bases.some(base => base && base.name.includes('燈'));
      
      case 'sakiOnBase':
        return this.state.bases.some(base => base && base.name.includes('祥子'));
      
      case 'crychicOnBase':
        return this.state.bases.some(base => base && (base.name.includes('祥子') || base.name.includes('睦')));
      
      case 'enemyHasSaki':
        return this.state.cpu.deck.some(card => card.name.includes('祥子'));
      
      case 'perGuitaristOnBase':
        return this.state.bases.filter(base => base && base.instrument === 'Guitar').length;
      
      case 'enemyDrummerOnBase':
        // 這需要追蹤CPU的壘包狀態，暫時返回false
        return false;
      
      case 'takiOnBase':
        return this.state.bases.some(base => base && base.name.includes('立希'));
      
      default:
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
    // 實作棄牌邏輯
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

  handleSearch(effectData, card) {
    const searchFor = effectData.searchFor;
    const deck = this.state.player.deck;
    
    // MyGO特殊搜尋
    if (effectData.action === 'searchMyGO') {
      const mygoCard = deck.find(c => c.band === 'MyGO!!!!!');
      if (mygoCard) {
        deck.splice(deck.indexOf(mygoCard), 1);
        this.state.player.hand.push(mygoCard);
        return { 
          success: true, 
          description: `${card.name} 找到了 ${mygoCard.name}` 
        };
      }
    }
    
    if (effectData.action === 'searchSaki') {
      const sakiCard = deck.find(c => c.name.includes('祥子'));
      if (sakiCard) {
        deck.splice(deck.indexOf(sakiCard), 1);
        this.state.player.hand.push(sakiCard);
        return { 
          success: true, 
          description: `${card.name} 找到了祥子` 
        };
      } else {
        // 如果祥子已經在場上或手牌，改為抽兩張
        this.drawCards(this.state.player, 2);
        return { 
          success: true, 
          description: `祥子已經在場，${card.name} 改為抽兩張卡` 
        };
      }
    }
    
    return { success: false, reason: '找不到目標卡牌' };
  }

  handleShuffle(effectData, card) {
    this.shuffleDeck(this.state.player.deck);
    return { 
      success: true, 
      description: `${card.name} 洗了牌庫` 
    };
  }

  // === 數值修改處理器 ===
  
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
    const value = -Math.abs(effectData.value); // 確保是負值
    const duration = effectData.duration || DURATIONS.TURN;
    
    targets.forEach(target => {
      this.addActiveEffect({
        source: card.name,
        target: target,
        type: 'debuff',
        stat: stat,
        value: value,
        duration: duration
      });
    });
    
    return { 
      success: true, 
      description: `${card.name} 為目標施加了 ${stat}${value} 的減益` 
    };
  }

  handleSetTo(effectData, card) {
    const targets = this.getTargets(effectData.target, card);
    const stat = effectData.stat;
    const value = effectData.value;
    const duration = effectData.duration || DURATIONS.TURN;
    
    targets.forEach(target => {
      this.addActiveEffect({
        source: card.name,
        target: target,
        type: 'setTo',
        stat: stat,
        value: value,
        duration: duration,
        mode: 'absolute'
      });
    });
    
    return { 
      success: true, 
      description: `${card.name} 將目標的 ${stat} 設為 ${value}` 
    };
  }

  // === 特殊效果處理器 ===
  
  handleLock(effectData, card) {
    if (effectData.action === 'lockCharacter') {
      // 選擇壘上的角色進行鎖定
      const baseIndex = this.chooseFromBases();
      if (baseIndex !== -1 && this.state.bases[baseIndex]) {
        const lockedCard = this.state.bases[baseIndex];
        lockedCard.locked = true;
        return { 
          success: true, 
          description: `${lockedCard.name} 被鎖定了，將永遠留在 ${baseIndex + 1} 壘` 
        };
      }
    }
    return { success: false, reason: '沒有可鎖定的目標' };
  }

  handleDestroy(effectData, card) {
    if (effectData.action === 'destroyAllBasesForPermanentPower') {
      const destroyedCount = this.state.bases.filter(Boolean).length;
      
      // 清空所有壘包
      this.state.bases = [null, null, null];
      
      // 為牌庫中所有打者永久增加力量
      this.state.player.deck.forEach(deckCard => {
        if (deckCard.type === 'batter') {
          deckCard.stats.power += destroyedCount * 10;
        }
      });
      
      return { 
        success: true, 
        description: `解散樂隊！摧毀了 ${destroyedCount} 名角色，所有打者力量永久+${destroyedCount * 10}` 
      };
    }
    return { success: false, reason: '無法執行摧毀效果' };
  }

  handleSacrifice(effectData, card) {
    if (effectData.action === 'sacrificeForGodhood') {
      // 從手牌中棄掉一張MyGO成員
      const mygoCardIndex = this.state.player.hand.findIndex(c => c.band === 'MyGO!!!!!');
      if (mygoCardIndex === -1) {
        return { success: false, reason: '手牌中沒有MyGO!!!!!成員' };
      }
      
      const sacrificed = this.state.player.hand.splice(mygoCardIndex, 1)[0];
      this.state.player.discard.push(sacrificed);
      
      // 為所有祥子卡永久增加力量
      const powerBoost = effectData.value || 20;
      [...this.state.player.deck, ...this.state.player.hand, ...this.state.player.discard]
        .filter(c => c.name.includes('祥子'))
        .forEach(sakiCard => {
          sakiCard.stats.power += powerBoost;
        });
      
      return { 
        success: true, 
        description: `${card.name} 犧牲了 ${sacrificed.name}，祥子的力量永久+${powerBoost}！` 
      };
    }
    return { success: false, reason: '無法執行犧牲效果' };
  }

  // === 輔助方法 ===
  
  getTargets(targetType, sourceCard) {
    switch (targetType) {
      case TARGET_TYPES.SELF:
        return [sourceCard];
      case TARGET_TYPES.ALL_ON_BASE:
        return this.state.bases.filter(Boolean);
      case TARGET_TYPES.ALL_FRIENDLY:
        return [...this.state.player.hand, ...this.state.bases.filter(Boolean)];
      case 'allMyGOMembers':
        return this.state.bases.filter(base => base && base.band === 'MyGO!!!!!');
      case 'allMyGOOnBase':
        return this.state.bases.filter(base => base && base.band === 'MyGO!!!!!');
      case 'allGuitarists':
        return [...this.state.player.hand, ...this.state.bases.filter(Boolean)]
          .filter(card => card.instrument === 'Guitar');
      default:
        return [];
    }
  }

  addActiveEffect(effect) {
    this.state.activeEffects.push(effect);
  }

  chooseFromBases() {
    // 簡化版選擇邏輯，實際應該有UI讓玩家選擇
    return this.state.bases.findIndex(Boolean);
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
}

// === 效果註冊系統 ===
// 這允許不同主題包註冊自己的特殊效果

export class EffectRegistry {
  constructor() {
    this.customEffects = new Map();
  }

  /**
   * 註冊主題包特有的效果
   * @param {string} effectName - 效果名稱
   * @param {Function} handler - 處理函式
   * @param {string} theme - 主題包名稱
   */
  registerThemeEffect(effectName, handler, theme = 'default') {
    const key = `${theme}:${effectName}`;
    this.customEffects.set(key, handler);
    console.log(`註冊主題效果: ${key}`);
  }

  /**
   * 獲取主題效果處理器
   */
  getThemeEffect(effectName, theme = 'default') {
    const key = `${theme}:${effectName}`;
    return this.customEffects.get(key);
  }

  /**
   * 列出所有已註冊的效果
   */
  listEffects() {
    return Array.from(this.customEffects.keys());
  }
}

// 全域效果註冊器實例
export const effectRegistry = new EffectRegistry();

// === MyGO!!!!! 主題效果註冊 ===
effectRegistry.registerThemeEffect('copyGuitaristSynergy', (effectData, card, processor) => {
  const guitarists = processor.state.bases.filter(base => 
    base && base.instrument === 'Guitar' && base.name !== card.name
  );
  
  if (guitarists.length > 0) {
    const randomGuitarist = guitarists[Math.floor(Math.random() * guitarists.length)];
    const synergyEffect = randomGuitarist.effects?.synergy;
    
    if (synergyEffect) {
      // 複製該吉他手的協同效果
      processor.addActiveEffect({
        source: card.name,
        target: card,
        type: 'copied',
        originalEffect: synergyEffect,
        duration: 'turn'
      });
      
      return {
        success: true,
        description: `${card.name} 複製了 ${randomGuitarist.name} 的羁絆效果`
      };
    }
  }
  
  return { success: false, reason: '場上沒有其他吉他手可複製' };
}, 'MyGO');

effectRegistry.registerThemeEffect('soloistBoost', (effectData, card, processor) => {
  // 讓玩家選擇手牌中的一張卡（這裡簡化為選第一張）
  const chosenIndex = 0; // 實際應該有UI讓玩家選擇
  const chosenCard = processor.state.player.hand[chosenIndex];
  
  if (!chosenCard) {
    return { success: false, reason: '手牌為空' };
  }
  
  // 給選中的卡牌+40力量
  processor.addActiveEffect({
    source: card.name,
    target: chosenCard,
    type: 'buff',
    stat: 'power',
    value: 40,
    duration: 'turn'
  });
  
  // 給其他手牌-20專注
  processor.state.player.hand.forEach((handCard, index) => {
    if (index !== chosenIndex) {
      processor.addActiveEffect({
        source: card.name,
        target: handCard,
        type: 'debuff',
        stat: 'contact',
        value: -20,
        duration: 'turn'
      });
    }
  });
  
  return {
    success: true,
    description: `${chosenCard.name} 成為了獨奏者(力量+40)，但其他成員專注-20`
  };
}, 'MyGO');