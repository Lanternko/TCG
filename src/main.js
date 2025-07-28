// src/main.js - 修复版本
console.log('🎸 MyGO!!!!! TCG Enhanced Edition 载入中...');

// ✅ 修复 1: 添加所有必要的 imports
import { GAME_CONFIG } from './data/config.js';
import { TEAMS, getTeamById } from './data/teams.js';
import { createGameState } from './engine/game_state.js';
import { render } from './ui/ui.js';
import { EffectProcessor } from './engine/effects.js';
import { simulateAtBat } from './engine/sim.js';

// ✅ 修复 2: 移除重复的全域变量声明
let gameInitialized = false;
let draggedCard = null;
let draggedCardIndex = -1;
let awaitingTargetSelection = false;
let pendingActionCard = null;
let currentGameState = null;
let currentHandlers = null;
let effectProcessor = null;

// ✅ 修复 3: 简化 window 对象使用
window.awaitingTargetSelection = false;
window.pendingActionCard = null;
window.gameState = null;

async function initializeGame() {
  try {
    console.log('📦 开始载入增强版游戏模组...');
    
    // ✅ 修复 4: 移除不必要的动态 import
    console.log('✅ 使用静态 imports，跳过动态载入');
    
    // 将配置挂载到 window 供全域使用
    window.GAME_CONFIG = GAME_CONFIG;
    
    startGame();
    
  } catch (error) {
    console.error('❌ 模组载入失败:', error);
    showErrorMessage(`载入失败: ${error.message}`);
  }
}

function startGame() {
  try {
    console.log('🎯 开始初始化增强版游戏...');
    
    // --- 创建核心游戏状态 ---
    const state = createGameState();
    currentGameState = state;
    window.gameState = state;
    console.log('✅ 游戏状态创建成功');

    // --- 初始化效果处理器 ---
    effectProcessor = new EffectProcessor(state);
    window.effectProcessor = effectProcessor;
    console.log('✅ 效果处理器 (EffectProcessor) 初始化完成');

    // --- 准备队伍资料 ---
    const mygoTeam = TEAMS.find(team => team.id === "MGO");
    if (!mygoTeam) {
      throw new Error('找不到MyGO队伍资料');
    }
    console.log('✅ MyGO队伍确认:', mygoTeam.name);
    
    // 创建 handlers 对象
    const handlers = {
      select: (idx) => {
        console.log('🎯 选择卡牌:', idx);
        if (state.playerTurn && !awaitingTargetSelection) {
          state.selected = (state.selected === idx) ? -1 : idx;
          render(state, handlers);
        }
      },
      button: () => {
        console.log('🎯 主按钮点击');
        const gameStarted = !!state.cpu.activePitcher;
        
        if (!gameStarted) {
          initDecks(state, handlers);
        } else if (state.playerTurn && state.selected !== -1) {
          runPlayerTurn(state, handlers);
        }
        
        render(state, handlers);
      },
      baseClick: (baseIndex) => {
        console.log('🎯 垒包点击:', baseIndex);
        if (awaitingTargetSelection && state.bases[baseIndex]) {
          handleTargetSelection(baseIndex, state, handlers);
        }
      },
      dragToBatter: (cardIndex) => {
        console.log('🎯 拖拽到打击位置:', cardIndex);
        if (state.playerTurn && !awaitingTargetSelection) {
          state.selected = cardIndex;
          runPlayerTurn(state, handlers);
        }
      },
      render: render
    };
    
    currentHandlers = handlers;
    window.currentHandlers = handlers;
    window.handleHandCardSelection = handleHandCardSelection;
    window.cancelTargetSelection = cancelTargetSelection;
    
    setupDragDropZones(handlers);
    
    const mainButton = document.getElementById('main-button');
    if (mainButton) {
      mainButton.onclick = handlers.button;
    }
    
    render(state, handlers);
    
    gameInitialized = true;
    console.log('🎉 增强版游戏初始化完成！');
    
    const outcomeText = document.getElementById('outcome-text');
    if (outcomeText) {
      outcomeText.textContent = '🎸 MyGO!!!!! Enhanced Edition 准备就绪！点击 Play Ball 开始游戏！';
    }
    
  } catch (error) {
    console.error('❌ 游戏初始化失败:', error);
    showErrorMessage(`初始化失败: ${error.message}`);
  }
}

function setupDragDropZones(handlers) {
  const centerField = document.querySelector('.center-field');
  if (centerField) {
    centerField.replaceWith(centerField.cloneNode(true));
    const newCenterField = document.querySelector('.center-field');
    
    newCenterField.addEventListener('dragover', (e) => {
      e.preventDefault();
      newCenterField.classList.add('drag-over');
      
      const dropHint = document.getElementById('drop-hint');
      if (dropHint) {
        dropHint.classList.add('active');
        dropHint.textContent = '释放以进行打击';
      }
    });
    
    newCenterField.addEventListener('dragleave', (e) => {
      if (!newCenterField.contains(e.relatedTarget)) {
        newCenterField.classList.remove('drag-over');
        
        const dropHint = document.getElementById('drop-hint');
        if (dropHint) {
          dropHint.classList.remove('active');
          dropHint.textContent = '拖拽卡牌到此区域进行打击';
        }
      }
    });
    
    newCenterField.addEventListener('drop', (e) => {
      e.preventDefault();
      newCenterField.classList.remove('drag-over');
      
      const dropHint = document.getElementById('drop-hint');
      if (dropHint) {
        dropHint.classList.remove('active');
      }
      
      const cardIndex = parseInt(e.dataTransfer.getData('text/plain'));
      if (cardIndex !== -1 && !isNaN(cardIndex)) {
        console.log('🎯 拖拽到中央场地:', cardIndex);
        handlers.dragToBatter(cardIndex);
      }
    });
    
    newCenterField.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (window.awaitingTargetSelection) {
        window.cancelTargetSelection(window.gameState, handlers);
      }
    });
  }
}

// ✅ 修复 5: 使用配置文件的设定
function initDecks(state, handlers) {
  try {
    console.log('🎯 初始化牌组...');
    
    const playerTeam = TEAMS.find(team => team.id === "MGO");
    state.player.team = playerTeam;
    state.player.deck = [...playerTeam.batters, ...playerTeam.actionCards].map(prepareCard);
    shuffle(state.player.deck);
    state.player.hand = [];
    state.player.pitcher = prepareCard(playerTeam.pitchers[0]);
    
    // ✅ 使用配置的起始手牌数
    drawCards(state.player, GAME_CONFIG.HAND.STARTING_DRAW);
    
    const cpuTeam = TEAMS.find(team => team.id === "NYY");
    state.cpu.team = cpuTeam;
    state.cpu.deck = [...cpuTeam.batters].map(prepareCard);
    state.cpu.activePitcher = prepareCard(cpuTeam.pitchers[0]);
    
    console.log('✅ 牌组初始化完成');
    
    const outcomeText = document.getElementById('outcome-text');
    if (outcomeText) {
      outcomeText.textContent = '🎵 MyGO!!!!! vs Yankees - 客队先攻！';
    }
    
    setTimeout(() => runCpuTurn(state, handlers), 1000);
    
  } catch (error) {
    console.error('❌ 牌组初始化失败:', error);
    showErrorMessage(`牌组初始化失败: ${error.message}`);
  }
}

// ✅ 修复 6: 修复玩家回合逻辑，解决手牌为空问题
function runPlayerTurn(state, handlers) {
  try {
    const cardIndex = state.selected;
    const card = state.player.hand[cardIndex];
    
    if (!card) {
      console.warn('⚠️ 没有选择有效的卡牌');
      state.selected = -1;
      render(state, handlers);
      return;
    }
    
    console.log(`🎯 玩家回合：使用 ${card.name}`);
    
    if (card.type === 'batter') {
      // 处理战吼效果
      handleBattlecry(card);
      
      // 使用 sim.js 的模拟函数
      const result = simulateAtBat(card, state.cpu.activePitcher, state);
      
      // 处理打击结果
      processAtBatResult(result, card, state);
      
      // 移除卡牌
      removeCardFromHand(state, cardIndex);
      
      // ✅ 修复：确保打击后抽牌
      const currentHandSize = state.player.hand.length;
      const maxHandSize = GAME_CONFIG.HAND.MAX_SIZE;
      const drawCount = Math.min(GAME_CONFIG.HAND.DRAW_AFTER_PLAY, maxHandSize - currentHandSize);
      
      if (drawCount > 0) {
        console.log(`📋 打击后抽牌: ${drawCount}张`);
        drawCards(state.player, drawCount);
      } else {
        console.log('⚠️ 手牌已满，无法抽牌');
      }
      
    } else if (card.type === 'action') {
      if (needsTargetSelection(card)) {
        startTargetSelection(card, state, handlers);
        return;
      } else {
        executeActionCard(card, state);
        removeCardFromHand(state, cardIndex);
        
        // ✅ 修复：战术卡也要补充手牌
        const currentHandSize = state.player.hand.length;
        const maxHandSize = GAME_CONFIG.HAND.MAX_SIZE;
        const drawCount = Math.min(1, maxHandSize - currentHandSize);
        
        if (drawCount > 0) {
          console.log(`📋 战术卡后抽牌: ${drawCount}张`);
          drawCards(state.player, drawCount);
        }
      }
    }
    
    state.selected = -1;
    
    // ✅ 修复：如果手牌为空，强制抽牌
    if (state.player.hand.length === 0) {
      console.warn('⚠️ 手牌为空，强制抽牌！');
      const emergencyDrawCount = Math.min(2, GAME_CONFIG.HAND.MAX_SIZE);
      drawCards(state.player, emergencyDrawCount);
    }
    
    render(state, handlers);
    
    // 检查是否需要更换半局
    if (state.outs >= GAME_CONFIG.FLOW.OUTS_PER_INNING) {
      setTimeout(() => changeHalfInning(state, handlers), 1500);
    }
    
  } catch (error) {
    console.error('❌ 玩家回合执行失败:', error);
    showErrorMessage(`玩家回合出错: ${error.message}`);
  }
}

// ✅ 修复 7: 统一效果处理
function handleBattlecry(card) {
  if (!card.effects || !card.effects.play) return;
  
  // 只使用 EffectProcessor，移除重复处理
  const result = effectProcessor.processBattlecry(card);
  
  if (result && result.success) {
    console.log('✅ 战吼效果:', result.description);
    updateOutcomeText(`${card.name}: ${result.description}`);
  }
}

// ✅ 修复 8: 统一抽牌逻辑
function drawCards(player, count) {
  if (!effectProcessor) {
    console.error('❌ EffectProcessor 未初始化');
    return;
  }
  
  effectProcessor.drawCards(player, count);
}

// ✅ 修复 9: 修复打击结果处理，解决得分问题
function processAtBatResult(result, batterCard, state) {
  console.log('⚾ 处理打击结果:', result.type, result);
  
  updateOutcomeText(result.description);
  
  if (result.type === 'K' || result.type === 'OUT') {
    // 出局处理
    state.outs++;
    console.log(`❌ ${batterCard.name} 出局，出局数: ${state.outs}`);
    
    // 处理死声效果
    if (batterCard.effects && batterCard.effects.death) {
      const deathResult = effectProcessor.processDeathrattle(batterCard);
      if (deathResult.success) {
        console.log('💀 死声效果:', deathResult.description);
      }
    }
  } else {
    // ✅ 修复：安打处理，确保正确得分
    console.log('✅ 安打成功，开始处理跑垒...');
    
    // 获取推进距离
    const advancement = getAdvancement(result.type);
    console.log(`🏃 推进距离: ${advancement} 垒`);
    
    // 处理跑垒和得分
    const pointsScored = advanceRunners(state, batterCard, advancement);
    
    // ✅ 修复：加上打击本身的得分
    const hitPoints = getHitPoints(result.type);
    const totalPoints = pointsScored + hitPoints;
    
    // 更新分数
    state.score.home += totalPoints;
    
    console.log(`📊 跑垒得分: ${pointsScored}, 打击得分: ${hitPoints}, 总得分: ${totalPoints}`);
    console.log(`📊 当前总分: 客队 ${state.score.away} - 主队 ${state.score.home}`);
    
    // 更新显示
    updateOutcomeText(`${result.description} - 得${totalPoints}分！`);
  }
}

// ✅ 修复 10: 准确的推进距离计算
function getAdvancement(hitType) {
  switch (hitType) {
    case 'HR': return 4;  // 全垒打：所有跑者得分 + 打者得分
    case '3B': return 3;  // 三垒安打：打者上三垒，其他跑者推进3垒
    case '2B': return 2;  // 二垒安打：打者上二垒，其他跑者推进2垒
    case '1B':
    case 'BB': return 1;  // 一垒安打/保送：打者上一垒，其他跑者推进1垒
    default: return 0;
  }
}

// ✅ 修复 11: 准确的打击得分计算
function getHitPoints(hitType) {
  switch (hitType) {
    case 'HR': return GAME_CONFIG.SCORING.HOME_RUN;     // 全垒打：10分
    case '3B': return GAME_CONFIG.SCORING.TRIPLE;       // 三垒安打：3分
    case '2B': return GAME_CONFIG.SCORING.DOUBLE;       // 二垒安打：2分
    case '1B': return GAME_CONFIG.SCORING.SINGLE;       // 一垒安打：1分
    case 'BB': return GAME_CONFIG.SCORING.WALK;         // 保送：1分
    default: return 0;
  }
}

// ✅ 修复 12: 完整的跑垒逻辑
function advanceRunners(state, newBatter, advancement) {
  let pointsScored = 0;
  
  console.log('🏃 开始垒包推进...');
  console.log('🏃 推进前状态:', state.bases.map((b, i) => b ? `${i+1}B: ${b.name}` : `${i+1}B: 空`));
  console.log('🏃 新打者:', newBatter.name, '推进距离:', advancement);
  
  // 从三垒开始处理现有跑者
  for (let i = 2; i >= 0; i--) {
    const runner = state.bases[i];
    if (!runner) continue;
    
    const newPosition = i + advancement;
    console.log(`🏃 处理跑者: ${runner.name} 从 ${i+1}垒 推进到位置 ${newPosition+1}`);
    
    if (runner.locked) {
      console.log(`🔒 ${runner.name} 被锁定，无法移动`);
      continue;
    }
    
    if (newPosition >= 3) {
      // 得分
      console.log(`🏠 ${runner.name} 从 ${i+1}垒 回本垒得分！`);
      pointsScored += GAME_CONFIG.SCORING.BASE_RUNNER_SCORE;
      
      // 处理死声效果
      if (runner.effects && runner.effects.death) {
        const deathResult = effectProcessor.processDeathrattle(runner);
        if (deathResult.success) {
          console.log('💀 得分时的死声效果:', deathResult.description);
        }
      }
      
      // 移到弃牌堆
      state.player.discard.push(runner);
      state.bases[i] = null;
    } else {
      // 尝试推进到新位置
      if (!state.bases[newPosition]) {
        console.log(`🏃 ${runner.name} 成功推进: ${i+1}垒 → ${newPosition+1}垒`);
        state.bases[newPosition] = runner;
        state.bases[i] = null;
      } else {
        // 目标垒包被占用，尝试下一个空垒
        let placed = false;
        for (let j = newPosition + 1; j <= 2; j++) {
          if (!state.bases[j]) {
            console.log(`🏃 ${runner.name} 挤垒推进: ${i+1}垒 → ${j+1}垒`);
            state.bases[j] = runner;
            state.bases[i] = null;
            placed = true;
            break;
          }
        }
        
        if (!placed) {
          // 无处可去，强制得分
          console.log(`🏠 ${runner.name} 被挤回本垒得分！`);
          pointsScored += GAME_CONFIG.SCORING.BASE_RUNNER_SCORE;
          
          // 处理死声效果
          if (runner.effects && runner.effects.death) {
            effectProcessor.processDeathrattle(runner);
          }
          
          state.player.discard.push(runner);
          state.bases[i] = null;
        }
      }
    }
  }
  
  // 处理新打者的位置
  if (advancement < 4) { // 非全垒打
    const targetBase = advancement - 1; // 0=1B, 1=2B, 2=3B
    
    if (targetBase >= 0 && targetBase <= 2) {
      if (!state.bases[targetBase]) {
        console.log(`🏃 ${newBatter.name} 安全上 ${targetBase+1}垒`);
        state.bases[targetBase] = newBatter;
      } else {
        // 目标垒包被占用，尝试下一个空垒
        let placed = false;
        for (let i = targetBase + 1; i <= 2; i++) {
          if (!state.bases[i]) {
            console.log(`🏃 ${newBatter.name} 挤垒上 ${i+1}垒`);
            state.bases[i] = newBatter;
            placed = true;
            break;
          }
        }
        
        if (!placed) {
          // 满垒，新打者也得分
          console.log(`🏠 ${newBatter.name} 因满垒直接得分！`);
          pointsScored += GAME_CONFIG.SCORING.BASE_RUNNER_SCORE;
          
          // 处理死声效果
          if (newBatter.effects && newBatter.effects.death) {
            effectProcessor.processDeathrattle(newBatter);
          }
          
          state.player.discard.push(newBatter);
        }
      }
    }
  } else {
    // 全垒打，新打者直接得分
    console.log(`🏠 ${newBatter.name} 全垒打直接得分！`);
    
    // 处理死声效果
    if (newBatter.effects && newBatter.effects.death) {
      effectProcessor.processDeathrattle(newBatter);
    }
    
    state.player.discard.push(newBatter);
  }
  
  console.log('🏃 推进后状态:', state.bases.map((b, i) => b ? `${i+1}B: ${b.name}` : `${i+1}B: 空`));
  console.log(`🏃 本次跑垒得分: ${pointsScored}`);
  
  return pointsScored;
}

function executeActionCard(card, state, targetCard = null, targetIndex = -1) {
  let description = "";
  
  if (effectProcessor && card.effects?.play) {
    console.log('🎭 使用效果处理器执行战术卡:', card.name);
    
    if (targetCard) {
      card.effects.play.targetCard = targetCard;
      card.effects.play.targetIndex = targetIndex;
    }
    
    const result = effectProcessor.processEffect(card, card.effects.play, 'play');
    if (result.success) {
      description = result.description;
    } else {
      description = `${card.name} 执行失败: ${result.reason}`;
    }
  } else {
    description = `${card.name} 战术卡发动！`;
  }
  
  updateOutcomeText(description);
  return description;
}

function removeCardFromHand(state, cardIndex) {
  if (cardIndex < 0 || cardIndex >= state.player.hand.length) {
    console.warn('⚠️ 无效的卡牌索引:', cardIndex);
    return null;
  }
  
  const removedCard = state.player.hand.splice(cardIndex, 1)[0];
  
  // 处理死声效果
  if (removedCard.effects?.death) {
    const deathResult = effectProcessor.processDeathrattle(removedCard);
    if (deathResult.success) {
      console.log('💀 死声效果:', deathResult.description);
    }
  }
  
  state.player.discard.push(removedCard);
  console.log(`🗑️ ${removedCard.name} 已移到弃牌堆，手牌剩余: ${state.player.hand.length}张`);
  
  return removedCard;
}

function prepareCard(cardData) {
  const card = { ...cardData };
  
  // 初始化加成栏位
  card.permanentBonus = card.permanentBonus || {};
  card.tempBonus = card.tempBonus || {};
  
  // 计算 OVR
  if (card.type === 'batter') {
    card.ovr = calculateBatterOVR(card.stats);
  } else if (card.type === 'pitcher') {
    card.ovr = calculatePitcherOVR(card.stats);
  } else if (card.type === 'action') {
    card.ovr = card.rarity || "战术";
  }
  
  return card;
}

// ✅ 修复 13: 统一 OVR 计算
function calculateBatterOVR(stats) {
  const weights = { power: 0.3, hitRate: 0.3, contact: 0.2, speed: 0.2 };
  const weightedAverage = (
    stats.power * weights.power + 
    stats.hitRate * weights.hitRate + 
    stats.contact * weights.contact + 
    stats.speed * weights.speed
  ) / (weights.power + weights.hitRate + weights.contact + weights.speed);
  
  const ovr = Math.round(weightedAverage);
  return Math.max(40, Math.min(99, ovr));
}

function calculatePitcherOVR(stats) {
  const weights = { power: 0.3, velocity: 0.3, control: 0.2, technique: 0.2 };
  const weightedAverage = (
    stats.power * weights.power + 
    stats.velocity * weights.velocity + 
    stats.control * weights.control + 
    stats.technique * weights.technique
  ) / (weights.power + weights.velocity + weights.control + weights.technique);
  
  const ovr = Math.round(weightedAverage);
  return Math.max(40, Math.min(99, ovr));
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function updateOutcomeText(message) {
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = message;
    outcomeText.style.color = '#f39c12';
  }
}

function showErrorMessage(message) {
  const outcomeText = document.getElementById('outcome-text');
  if (outcomeText) {
    outcomeText.textContent = `❌ 错误: ${message}`;
    outcomeText.style.color = '#e74c3c';
  }
  console.error('🚨 显示错误讯息:', message);
}

// 目标选择相关函数 (简化版)
function needsTargetSelection(card) {
  const targetRequiredCards = ['一辈子...', '想成为人类', '满脑子想着自己'];
  return targetRequiredCards.includes(card.name);
}

function startTargetSelection(card, state, handlers) {
  awaitingTargetSelection = true;
  pendingActionCard = card;
  window.awaitingTargetSelection = true;
  window.pendingActionCard = card;
  
  updateOutcomeText(`选择 ${card.name} 的目标... (右键取消)`);
  highlightValidTargets(card, state);
  render(state, handlers);
}

function highlightValidTargets(card, state) {
  // 简化的高亮逻辑
  if (card.name === '一辈子...') {
    state.bases.forEach((baseCard, index) => {
      if (baseCard) {
        const baseIds = ['first-base', 'second-base', 'third-base'];
        const baseElement = document.getElementById(baseIds[index]);
        if (baseElement) {
          baseElement.classList.add('selectable-target');
        }
      }
    });
  }
}

function handleTargetSelection(baseIndex, state, handlers) {
  if (!pendingActionCard) return;
  
  const targetCard = state.bases[baseIndex];
  if (!targetCard) return;
  
  executeActionCard(pendingActionCard, state, targetCard, baseIndex);
  
  const cardIndex = state.player.hand.findIndex(card => card === pendingActionCard);
  if (cardIndex !== -1) {
    removeCardFromHand(state, cardIndex);
  }
  
  resetTargetSelection(state);
  render(state, handlers);
}

function handleHandCardSelection(cardIndex, state, handlers) {
  // 处理手牌目标选择
  if (!pendingActionCard) return;
  
  const targetCard = state.player.hand[cardIndex];
  if (!targetCard || targetCard.type !== 'batter') return;
  
  executeActionCard(pendingActionCard, state, targetCard, -1);
  
  const actionCardIndex = state.player.hand.findIndex(card => card === pendingActionCard);
  if (actionCardIndex !== -1) {
    removeCardFromHand(state, actionCardIndex);
  }
  
  resetTargetSelection(state);
  render(state, handlers);
}

function cancelTargetSelection(state, handlers) {
  updateOutcomeText(`已取消 ${pendingActionCard?.name || '战术卡'} 的使用`);
  resetTargetSelection(state);
  render(state, handlers);
}

function resetTargetSelection(state) {
  awaitingTargetSelection = false;
  pendingActionCard = null;
  state.selected = -1;
  
  window.awaitingTargetSelection = false;
  window.pendingActionCard = null;
  
  document.querySelectorAll('.base, .hand-card').forEach(element => {
    element.classList.remove('selectable-target');
  });
}

// CPU 和游戏流程函数
function runCpuTurn(state, handlers) {
  console.log('🤖 CPU回合开始');
  
  let cpuOuts = 0;
  const cpuResults = [];
  
  while (cpuOuts < 3) {
    const random = Math.random();
    let result;
    
    if (random < 0.25) {
      result = { type: 'K', description: 'CPU 三振出局', points: 0 };
      cpuOuts++;
    } else if (random < 0.35) {
      result = { type: 'OUT', description: 'CPU 出局', points: 0 };
      cpuOuts++;
    } else {
      result = { type: '1B', description: 'CPU 一垒安打', points: 1 };
      state.score.away += 1;
    }
    
    cpuResults.push(result);
  }
  
  const totalRuns = cpuResults.reduce((sum, r) => sum + r.points, 0);
  updateOutcomeText(`CPU回合结束：${totalRuns}分`);
  
  render(state, handlers);
  setTimeout(() => changeHalfInning(state, handlers), 800);
}

function changeHalfInning(state, handlers) {
  state.outs = 0;
  
  if (state.half === 'top') {
    state.half = 'bottom';
    state.playerTurn = true;
    updateOutcomeText('🎵 轮到MyGO!!!!!攻击！');
    
    // ✅ 修复：换局时确保手牌充足
    if (state.player.hand.length < 3) {
      const drawCount = Math.min(3 - state.player.hand.length, GAME_CONFIG.HAND.MAX_SIZE - state.player.hand.length);
      if (drawCount > 0) {
        console.log(`🔄 换局补充手牌: ${drawCount}张`);
        drawCards(state.player, drawCount);
      }
    }
  } else {
    state.half = 'top';
    state.currentInning++;
    
    if (state.currentInning > GAME_CONFIG.FLOW.INNINGS) {
      handleGameOver(state);
      return;
    }
    
    state.playerTurn = false;
    updateOutcomeText('⚾ 客队攻击中...');
    setTimeout(() => runCpuTurn(state, handlers), 1000);
  }
  
  render(state, handlers);
}

function handleGameOver(state) {
  state.over = true;
  
  const winner = state.score.home > state.score.away ? "MyGO!!!!!获胜！" : 
                state.score.away > state.score.home ? "Yankees获胜！" : "平手！";
  
  updateOutcomeText(`🎉 比赛结束！${winner} 比数 ${state.score.away}:${state.score.home}`);
  
  const restartButton = document.getElementById('restart-button');
  if (restartButton) {
    restartButton.style.display = 'block';
    restartButton.onclick = () => location.reload();
  }
}

// ✅ 新增：调试和监控功能
function debugGameState(state) {
  console.log('🔍 游戏状态调试信息:');
  console.log('  手牌数量:', state.player.hand.length);
  console.log('  牌库数量:', state.player.deck.length);
  console.log('  弃牌数量:', state.player.discard.length);
  console.log('  垒包状态:', state.bases.map((b, i) => b ? `${i+1}B: ${b.name}` : `${i+1}B: 空`));
  console.log('  分数:', `客队 ${state.score.away} - 主队 ${state.score.home}`);
  console.log('  局数:', `${state.currentInning}局${state.half === 'top' ? '上' : '下'}`);
  console.log('  出局数:', state.outs);
}

// ✅ 新增：性能监控
let performanceMonitor = {
  renderCount: 0,
  lastRenderTime: 0,
  avgRenderTime: 0,
  
  startRender() {
    this.lastRenderTime = performance.now();
  },
  
  endRender() {
    const renderTime = performance.now() - this.lastRenderTime;
    this.renderCount++;
    this.avgRenderTime = (this.avgRenderTime * (this.renderCount - 1) + renderTime) / this.renderCount;
    
    if (renderTime > 50) {
      console.warn(`⚠️ 渲染耗时过长: ${renderTime.toFixed(2)}ms`);
    }
  },
  
  getStats() {
    return {
      totalRenders: this.renderCount,
      avgRenderTime: this.avgRenderTime.toFixed(2),
      lastRenderTime: this.lastRenderTime
    };
  }
};

// ✅ 新增：错误恢复机制
function emergencyRecovery(state) {
  console.warn('🚨 启动紧急恢复机制...');
  
  // 确保手牌至少有3张
  if (state.player.hand.length === 0) {
    console.log('🔧 紧急补充手牌...');
    
    // 从弃牌堆恢复一些卡牌到牌库
    if (state.player.deck.length === 0 && state.player.discard.length > 0) {
      console.log('🔄 从弃牌堆恢复牌库...');
      state.player.deck = [...state.player.discard];
      state.player.discard = [];
      shuffle(state.player.deck);
    }
    
    // 强制抽牌
    const emergencyDraw = Math.min(3, state.player.deck.length);
    if (emergencyDraw > 0) {
      drawCards(state.player, emergencyDraw);
      console.log(`✅ 紧急抽取了 ${emergencyDraw} 张牌`);
    }
  }
  
  // 确保游戏状态合理
  if (state.outs > 3) {
    console.log('🔧 修正出局数...');
    state.outs = 3;
  }
  
  if (state.currentInning < 1) {
    console.log('🔧 修正局数...');
    state.currentInning = 1;
  }
  
  // 重新渲染
  if (currentHandlers && currentHandlers.render) {
    currentHandlers.render(state, currentHandlers);
  }
  
  console.log('✅ 紧急恢复完成');
}

// ✅ 新增：游戏状态验证
function validateGameState(state) {
  const errors = [];
  
  // 检查手牌
  if (!Array.isArray(state.player.hand)) {
    errors.push('手牌不是数组');
  } else if (state.player.hand.length > GAME_CONFIG.HAND.MAX_SIZE) {
    errors.push(`手牌数量超限: ${state.player.hand.length}/${GAME_CONFIG.HAND.MAX_SIZE}`);
  }
  
  // 检查牌库
  if (!Array.isArray(state.player.deck)) {
    errors.push('牌库不是数组');
  }
  
  // 检查弃牌堆
  if (!Array.isArray(state.player.discard)) {
    errors.push('弃牌堆不是数组');
  }
  
  // 检查垒包
  if (!Array.isArray(state.bases) || state.bases.length !== 3) {
    errors.push('垒包状态异常');
  }
  
  // 检查分数
  if (typeof state.score.home !== 'number' || typeof state.score.away !== 'number') {
    errors.push('分数不是数字');
  }
  
  // 检查局数和出局数
  if (state.currentInning < 1 || state.outs < 0 || state.outs > 3) {
    errors.push('局数或出局数异常');
  }
  
  if (errors.length > 0) {
    console.error('❌ 游戏状态验证失败:', errors);
    return false;
  }
  
  return true;
}

// 暴露调试功能到全局
window.debugGameState = debugGameState;
window.emergencyRecovery = emergencyRecovery;
window.validateGameState = validateGameState;
window.performanceMonitor = performanceMonitor;

console.log('🎮 准备启动 MyGO!!!!! TCG Enhanced Edition...');
console.log('🔧 调试功能已启用，可使用以下全局函数:');
console.log('  - window.debugGameState(gameState)');
console.log('  - window.emergencyRecovery(gameState)');
console.log('  - window.validateGameState(gameState)');
console.log('  - window.performanceMonitor.getStats()');

initializeGame();