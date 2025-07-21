// 新增：統一管理得分邏輯
import { GAME_CONFIG } from '../data/game_config.js';

export class ScoringManager {
  constructor(gameState, effectProcessor, cardEffects) {
    this.state = gameState;
    this.effectProcessor = effectProcessor;
    this.cardEffects = cardEffects;
  }
  
  // 處理打擊結果
  processAtBatResult(result, batterCard) {
    console.log('⚾ 處理打擊結果:', result.type);
    
    if (result.type === 'K' || result.type === 'OUT') {
      return this.handleOut(batterCard);
    } else {
      return this.handleHit(result, batterCard);
    }
  }
  
  // 處理出局
  handleOut(batterCard) {
    this.state.outs++;
    console.log(`❌ ${batterCard.name} 出局，出局數: ${this.state.outs}`);
    
    // 處理死聲效果
    this.processDeathEffects(batterCard);
    
    // 處理祥子被動
    this.cardEffects.passiveSaki();
    
    return { pointsScored: 0, description: `${batterCard.name} 出局` };
  }
  
  // 處理安打
  handleHit(result, batterCard) {
    const advancement = this.getAdvancement(result.type);
    console.log(`✅ ${batterCard.name} ${result.type}，推進${advancement}壘`);
    
    // 計算得分
    const pointsScored = this.advanceRunners(batterCard, advancement);
    
    // 加上打擊本身的得分（如果有）
    const hitPoints = this.getHitPoints(result.type);
    const totalPoints = pointsScored + hitPoints;
    
    // 更新分數
    this.state.score.home += totalPoints;
    console.log(`📊 得分: +${totalPoints} (總分: ${this.state.score.home})`);
    
    return { 
      pointsScored: totalPoints, 
      description: `${batterCard.name} ${result.description}，得${totalPoints}分` 
    };
  }
  
  // 獲取推進壘數
  getAdvancement(hitType) {
    switch (hitType) {
      case 'HR': return 4;
      case '3B': return 3;
      case '2B': return 2;
      case '1B':
      case 'BB': return 1;
      default: return 0;
    }
  }
  
  // 獲取打擊得分
  getHitPoints(hitType) {
    switch (hitType) {
      case 'HR': return GAME_CONFIG.SCORING.HOME_RUN;
      case '3B': return GAME_CONFIG.SCORING.TRIPLE;
      case '2B': return GAME_CONFIG.SCORING.DOUBLE;
      case '1B': return GAME_CONFIG.SCORING.SINGLE;
      case 'BB': return GAME_CONFIG.SCORING.WALK;
      default: return 0;
    }
  }
  
  // 推進跑者
  advanceRunners(newRunner, advancement) {
    let pointsScored = 0;
    const bases = this.state.bases;
    
    console.log('🏃 推進前:', bases.map((b, i) => b ? `${i+1}B: ${b.name}` : `${i+1}B: 空`));
    
    // 從三壘開始處理
    for (let i = 2; i >= 0; i--) {
      const runner = bases[i];
      if (!runner) continue;
      
      const newPosition = i + advancement;
      
      if (runner.locked) {
        console.log(`🔒 ${runner.name} 被鎖定在 ${i+1}B`);
        continue;
      }
      
      if (newPosition >= 3) {
        // 得分
        console.log(`🏠 ${runner.name} 從 ${i+1}B 得分！`);
        pointsScored += GAME_CONFIG.SCORING.BASE_RUNNER_SCORE;
        
        // 處理死聲
        this.processDeathEffects(runner);
        
        // 移到棄牌堆
        this.state.player.discard.push(runner);
        bases[i] = null;
      } else {
        // 嘗試推進
        if (!bases[newPosition]) {
          console.log(`🏃 ${runner.name}: ${i+1}B → ${newPosition+1}B`);
          bases[newPosition] = runner;
          bases[i] = null;
        } else {
          // 壘包被佔，嘗試下一壘
          let placed = false;
          for (let j = newPosition + 1; j <= 2; j++) {
            if (!bases[j]) {
              console.log(`🏃 ${runner.name}: ${i+1}B → ${j+1}B (擠壘)`);
              bases[j] = runner;
              bases[i] = null;
              placed = true;
              break;
            }
          }
          
          if (!placed) {
            // 無處可去，得分
            console.log(`🏠 ${runner.name} 從 ${i+1}B 擠回本壘得分！`);
            pointsScored += GAME_CONFIG.SCORING.BASE_RUNNER_SCORE;
            this.processDeathEffects(runner);
            this.state.player.discard.push(runner);
            bases[i] = null;
          }
        }
      }
    }
    
    // 放置新跑者
    if (advancement < 4) { // 非全壘打
      const targetBase = advancement - 1;
      
      if (targetBase >= 0 && targetBase <= 2) {
        if (!bases[targetBase]) {
          console.log(`🏃 ${newRunner.name} 上 ${targetBase+1}B`);
          bases[targetBase] = newRunner;
        } else {
          // 目標壘被佔，找下一個空壘
          let placed = false;
          for (let i = targetBase + 1; i <= 2; i++) {
            if (!bases[i]) {
              console.log(`🏃 ${newRunner.name} 上 ${i+1}B (擠壘)`);
              bases[i] = newRunner;
              placed = true;
              break;
            }
          }
          
          if (!placed) {
            // 全滿，新跑者得分
            console.log(`🏠 ${newRunner.name} 因滿壘得分！`);
            pointsScored += GAME_CONFIG.SCORING.BASE_RUNNER_SCORE;
            this.processDeathEffects(newRunner);
            this.state.player.discard.push(newRunner);
          }
        }
      }
    } else {
      // 全壘打，新跑者直接進棄牌堆
      console.log(`🏠 ${newRunner.name} 全壘打！`);
      this.processDeathEffects(newRunner);
      this.state.player.discard.push(newRunner);
    }
    
    console.log('🏃 推進後:', bases.map((b, i) => b ? `${i+1}B: ${b.name}` : `${i+1}B: 空`));
    console.log(`⚾ 跑者得分: ${pointsScored}`);
    
    return pointsScored;
  }
  
  // 處理死聲效果
  processDeathEffects(card) {
    if (!card.effects || !card.effects.death) return;
    
    console.log(`💀 處理 ${card.name} 的死聲效果`);
    
    let result;
    switch (card.name) {
      case '真奈':
        result = this.cardEffects.deathMana(card);
        break;
      case '睦':
        result = this.cardEffects.deathMutsuki(card);
        break;
      case 'Mortis':
        result = this.cardEffects.deathMortis(card);
        break;
      case '初華':
        result = this.cardEffects.deathUika(card);
        break;
      case '海鈴':
        result = this.cardEffects.deathUmirin(card);
        break;
      default:
        if (this.effectProcessor.processDeathrattle) {
          result = this.effectProcessor.processDeathrattle(card);
        }
    }
    
    if (result && result.success) {
      console.log('✅ 死聲效果:', result.description);
    }
  }
}