// 新增：處理個別卡牌的特殊效果
import { GAME_CONFIG } from '../data/game_config.js';

export class CardSpecificEffects {
  constructor(gameState, effectProcessor) {
    this.state = gameState;
    this.effectProcessor = effectProcessor;
  }

  // === 戰吼效果 ===
  
  // 愛音 - 還來得及嗎？
  playAnon(card) {
    console.log('🎵 愛音戰吼：還來得及嗎？');
    this.effectProcessor.drawCards(this.state.player, 1);
    
    // 檢查羈絆效果
    const tomoriOnBase = this.state.bases.some(base => base && base.name.includes('燈'));
    if (tomoriOnBase) {
      console.log('💫 愛音羈絆：燈在壘上，額外抽1張');
      this.effectProcessor.drawCards(this.state.player, 1);
    }
    
    return { success: true, description: `愛音：抽了${tomoriOnBase ? 2 : 1}張牌` };
  }
  
  // 樂奈 - 無人之境
  playRana(card) {
    if (this.state.bases.every(base => base === null)) {
      console.log('🎯 樂奈戰吼：無人之境觸發');
      card.tempBonus = card.tempBonus || {};
      card.tempBonus.hitRate = (card.tempBonus.hitRate || 0) + GAME_CONFIG.BUFFS.RANA_NO_BASE;
      return { success: true, description: '樂奈：無人之境，安打率+25' };
    }
    return { success: false, reason: '壘上有人' };
  }
  
  // 立希 - 就照我說的做！
  playTaki(card) {
    console.log('🎯 立希戰吼：就照我說的做！');
    // 需要目標選擇邏輯
    return { 
      success: true, 
      needsTarget: true,
      targetType: 'mygo_in_hand',
      description: '選擇手牌中的MyGO成員強化'
    };
  }
  
  // 喵夢 - 百萬訂閱
  playNyamu(card) {
    const leading = this.state.score.home > this.state.score.away;
    const trailing = this.state.score.home < this.state.score.away;
    
    if (leading) {
      console.log('📺 喵夢：領先中，抽1張牌');
      this.effectProcessor.drawCards(this.state.player, 1);
      return { success: true, description: '喵夢：領先中，抽了1張牌' };
    } else if (trailing) {
      console.log('📺 喵夢：落後中，削弱對手投手');
      this.state.cpu.activePitcher.tempDebuff = { control: -20 };
      return { success: true, description: '喵夢：落後中，對手投手控球-20' };
    }
    
    return { success: true, description: '喵夢：平手，無效果' };
  }
  
  // 海鈴 - 準備萬全
  playUmirin(card) {
    console.log('🔍 海鈴戰吼：準備萬全');
    const topCards = this.state.player.deck.slice(-3);
    console.log('檢視牌庫頂3張:', topCards.map(c => c.name));
    // 實際遊戲中需要UI來重新排列
    return { success: true, description: '海鈴：檢視並重排了牌庫頂3張牌' };
  }
  
  // 祥子 - 世界的中心
  playSaki(card) {
    if (card.permanentBonus && Object.keys(card.permanentBonus).length > 0) {
      console.log('🌟 祥子戰吼：世界的中心');
      card.tempBonus = card.tempBonus || {};
      
      Object.entries(card.permanentBonus).forEach(([stat, value]) => {
        card.tempBonus[stat] = (card.tempBonus[stat] || 0) + value;
      });
      
      return { success: true, description: '祥子：永久加成翻倍！' };
    }
    return { success: false, reason: '沒有永久加成' };
  }
  
  // 初華 - 你是我的...
  playUika(card) {
    const sakiOnBase = this.state.bases.find(base => base && base.name.includes('祥子'));
    if (sakiOnBase) {
      console.log('💕 初華羈絆：複製祥子數值');
      const sakiStats = this.calculateTotalStats(sakiOnBase);
      card.tempBonus = card.tempBonus || {};
      
      Object.keys(card.stats).forEach(stat => {
        card.tempBonus[stat] = sakiStats[stat] - card.stats[stat];
      });
      
      return { success: true, description: '初華：複製了祥子的所有數值！' };
    }
    return { success: false, reason: '祥子不在壘上' };
  }
  
  // === 死聲效果 ===
  
  // 真奈 - 二人一體
  deathMana(card) {
    console.log('💀 真奈死聲：二人一體');
    
    const allCards = [
      ...this.state.player.hand,
      ...this.state.bases.filter(Boolean),
      ...this.state.player.deck,
      ...this.state.player.discard
    ];
    
    let uikaCount = 0;
    allCards.forEach(targetCard => {
      if (targetCard && targetCard.name.includes('初華')) {
        targetCard.permanentBonus = targetCard.permanentBonus || {};
        ['power', 'hitRate', 'contact', 'speed'].forEach(stat => {
          targetCard.permanentBonus[stat] = (targetCard.permanentBonus[stat] || 0) + GAME_CONFIG.BUFFS.MANA_DEATH_BOOST;
        });
        uikaCount++;
      }
    });
    
    return { 
      success: true, 
      description: `真奈死聲：${uikaCount}張初華獲得永久全數值+5！` 
    };
  }
  
  // 睦 - ......
  deathMutsuki(card) {
    console.log('💀 睦死聲：......');
    return this.boostTargetCard('Mortis', 'power', GAME_CONFIG.BUFFS.MUTSUKI_MORTIS_BOOST);
  }
  
  // Mortis - 迴響
  deathMortis(card) {
    console.log('💀 Mortis死聲：迴響');
    return this.boostTargetCard('睦', 'power', GAME_CONFIG.BUFFS.MUTSUKI_MORTIS_BOOST);
  }
  
  // 初華 - 給我回來
  deathUika(card) {
    console.log('💀 初華死聲：給我回來');
    const manaInDiscard = this.state.player.discard.find(c => c && c.name.includes('真奈'));
    
    if (manaInDiscard) {
      const index = this.state.player.discard.indexOf(manaInDiscard);
      this.state.player.discard.splice(index, 1);
      
      if (this.state.player.hand.length < GAME_CONFIG.HAND.MAX_SIZE) {
        this.state.player.hand.push(manaInDiscard);
        return { success: true, description: '初華死聲：真奈回到手牌！' };
      } else {
        this.state.player.deck.push(manaInDiscard);
        return { success: true, description: '初華死聲：真奈回到牌庫！' };
      }
    }
    
    return { success: false, reason: '棄牌堆沒有真奈' };
  }
  
  // 海鈴 - 經驗傳承
  deathUmirin(card) {
    console.log('💀 海鈴死聲：經驗傳承');
    this.effectProcessor.nextCardBuffs.push({
      source: card.name,
      stat: 'contact',
      value: 20,
      duration: 'atBat'
    });
    return { success: true, description: '海鈴死聲：下張打出的卡牌專注+20' };
  }
  
  // === 被動效果 ===
  
  // 祥子 - 遺忘的義務
  passiveSaki() {
    // 這個在 processCharacterDeath 中處理
    console.log('🌟 祥子被動：遺忘的義務觸發');
    
    const allSakiCards = [
      ...this.state.player.hand,
      ...this.state.bases.filter(Boolean),
      ...this.state.player.deck,
      ...this.state.player.discard
    ].filter(c => c && c.name.includes('祥子'));
    
    allSakiCards.forEach(sakiCard => {
      sakiCard.permanentBonus = sakiCard.permanentBonus || {};
      sakiCard.permanentBonus.power = (sakiCard.permanentBonus.power || 0) + GAME_CONFIG.BUFFS.SAKI_POWER_ON_DEATH;
    });
    
    return { 
      success: true, 
      description: `遺忘的義務：${allSakiCards.length}張祥子力量+2` 
    };
  }
  
  // === 輔助方法 ===
  
  calculateTotalStats(card) {
    const stats = { ...card.stats };
    
    if (card.permanentBonus) {
      Object.entries(card.permanentBonus).forEach(([stat, value]) => {
        stats[stat] = (stats[stat] || 0) + value;
      });
    }
    
    if (card.tempBonus) {
      Object.entries(card.tempBonus).forEach(([stat, value]) => {
        stats[stat] = (stats[stat] || 0) + value;
      });
    }
    
    return stats;
  }
  
  boostTargetCard(targetName, stat, value) {
    const allCards = [
      ...this.state.player.hand,
      ...this.state.bases.filter(Boolean),
      ...this.state.player.deck,
      ...this.state.player.discard
    ];
    
    let boostedCount = 0;
    allCards.forEach(targetCard => {
      if (targetCard && targetCard.name.includes(targetName)) {
        targetCard.permanentBonus = targetCard.permanentBonus || {};
        targetCard.permanentBonus[stat] = (targetCard.permanentBonus[stat] || 0) + value;
        boostedCount++;
        console.log(`✅ ${targetCard.name} ${stat}+${value} (永久)`);
      }
    });
    
    return {
      success: boostedCount > 0,
      description: boostedCount > 0 
        ? `${boostedCount}張${targetName}的${stat}永久+${value}！`
        : `找不到${targetName}`
    };
  }
}