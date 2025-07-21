// 新增：管理回合流程和抽牌邏輯
import { GAME_CONFIG } from '../data/game_config.js';

export class TurnManager {
  constructor(gameState, effectProcessor) {
    this.state = gameState;
    this.effectProcessor = effectProcessor;
  }
  
  // 開始新回合
  startTurn(isPlayerTurn) {
    console.log(`🎯 開始${isPlayerTurn ? '玩家' : 'CPU'}回合`);
    
    if (isPlayerTurn) {
      // 玩家回合開始抽牌
      this.drawCardsForTurn();
      
      // 清理過期效果
      this.effectProcessor.cleanupExpiredEffects(this.state, 'turn');
      
      // 更新UI狀態
      this.state.playerTurn = true;
      this.state.selected = -1;
    } else {
      // CPU回合
      this.state.playerTurn = false;
    }
  }
  
  // 回合開始抽牌
  drawCardsForTurn() {
    const currentHandSize = this.state.player.hand.length;
    const maxHandSize = GAME_CONFIG.HAND.MAX_SIZE;
    const drawPerTurn = GAME_CONFIG.HAND.DRAW_PER_TURN;
    
    // 計算實際可抽數量
    const canDraw = maxHandSize - currentHandSize;
    const actualDraw = Math.min(drawPerTurn, canDraw);
    
    if (actualDraw > 0) {
      console.log(`📋 回合開始抽牌: ${actualDraw}張`);
      this.effectProcessor.drawCards(this.state.player, actualDraw);
    } else {
      console.log('⚠️ 手牌已滿，無法抽牌');
    }
  }
  
  // 打出卡牌後處理
  afterCardPlayed(cardType) {
    // 打者卡：抽1張
    if (cardType === 'batter') {
      const drawCount = GAME_CONFIG.HAND.DRAW_AFTER_PLAY;
      const currentHandSize = this.state.player.hand.length;
      const maxHandSize = GAME_CONFIG.HAND.MAX_SIZE;
      
      if (currentHandSize < maxHandSize) {
        console.log(`📋 打出打者後抽牌: ${drawCount}張`);
        this.effectProcessor.drawCards(this.state.player, drawCount);
      }
    }
    // 戰術卡通常不抽牌，除非效果中有說明
  }
  
  // 結束回合
  endTurn() {
    console.log('🔚 結束當前回合');
    
    // 清理臨時效果
    this.clearTempEffects();
    
    // 檢查出局數
    if (this.state.outs >= GAME_CONFIG.FLOW.OUTS_PER_INNING) {
      return 'change_half_inning';
    }
    
    return 'continue';
  }
  
  // 清理臨時效果
  clearTempEffects() {
    // 清理打者的臨時加成
    this.state.player.hand.forEach(card => {
      if (card.tempBonus) {
        delete card.tempBonus;
      }
    });
    
    // 清理壘上跑者的臨時加成
    this.state.bases.forEach(card => {
      if (card && card.tempBonus) {
        delete card.tempBonus;
      }
    });
    
    // 清理投手的臨時減益
    if (this.state.cpu.activePitcher && this.state.cpu.activePitcher.tempDebuff) {
      delete this.state.cpu.activePitcher.tempDebuff;
    }
  }
  
  // 更換半局
  changeHalfInning() {
    console.log('🔄 更換半局');
    
    // 重置出局數
    this.state.outs = 0;
    
    // 清理效果
    this.effectProcessor.cleanupExpiredEffects(this.state, 'inning');
    
    if (this.state.half === 'top') {
      this.state.half = 'bottom';
      return 'player_turn';
    } else {
      this.state.half = 'top';
      this.state.currentInning++;
      
      // 檢查遊戲是否結束
      if (this.state.currentInning > GAME_CONFIG.FLOW.INNINGS) {
        return 'game_over';
      }
      
      return 'cpu_turn';
    }
  }
}