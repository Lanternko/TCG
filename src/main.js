// src/main.js
import { createGameState } from './engine/game_state.js';
import { render } from './ui/ui.js';
import { simulateAtBat } from './engine/sim.js';

// 創建 state
const state = createGameState();
render(state, handlers);


render(state, {
  select: idx => { state.selected = idx; render(state, handlers); },
  button: () => playTurn(),
});

function initDecks() {
  state.player.deck = [...state.player.team.batters];
  shuffle(state.player.deck);
  state.cpu.deck = [...state.cpu.team.batters];
  state.cpu.activePitcher = state.cpu.team.pitchers[0];
  draw(state.player, state.cfg.handSize);
}

function playTurn() {
  if (state.selected === -1 || !state.playerTurn) return;
  const card = state.player.hand[state.selected];
  let result;

  // Apply play effect
  if (card.effects && card.effects.play) {
    state.activeEffects.push({ cardName: card.name, type: "play", ...card.effects.play });
  }

  // Simulate at-bat
  result = simulateAtBat(card, state.cpu.activePitcher, state);

  // Process result
  processAtBatOutcome(result, card);

  // Apply death effect if out
  if ((result.type === 'K' || result.type === 'OUT') && card.effects && card.effects.death) {
    if (card.name === "Aristotle") {
      state.player.deck.forEach(c => c.stats.power += card.effects.death.value);
      state.player.hand.forEach(c => c.stats.power += card.effects.death.value);
    } else if (card.name === "Anaxagoras") {
      state.activeEffects.push({ cardName: card.name, type: "death", ...card.effects.death });
    }
  }

  // Apply aura effect if card advances to base
  if (result.adv > 0 && card.effects && card.effects.aura) {
    state.activeEffects.push({ cardName: card.name, type: "aura", ...card.effects.aura });
  }

  // Handle Diogenes' shuffle effect
  if (card.effects && card.effects.play && card.name === "Diogenes") {
    if (state.player.discard.length > 0) {
      const randomIndex = Math.floor(Math.random() * state.player.discard.length);
      state.player.deck.push(state.player.discard.splice(randomIndex, 1)[0]);
      shuffle(state.player.deck);
    }
  }

  state.player.hand.splice(state.selected, 1);
  state.player.discard.push(card);
  draw(state.player, 1);
  state.selected = -1;

  // Clear temporary effects at end of turn
  state.activeEffects = state.activeEffects.filter(e => e.duration !== "atBat" && e.duration !== "turn");

  // Clear inning-long effects at end of inning
  if (state.outs >= 3) {
    state.activeEffects = state.activeEffects.filter(e => e.duration !== "inning");
    changeHalfInning();
  }

  render(state, handlers);
}

function processAtBatOutcome(result, card) {
    document.getElementById('outcome-text').textContent = result.description;
    let pointsScored = 0;

    if (result.type === 'K' || result.type === 'OUT') {
        state.outs++;
    } else {
        // 根據結果類型計算分數
        switch (result.type) {
            case 'HR': pointsScored = state.cfg.scoring.homeRun; break;
            case '3B': pointsScored = state.cfg.scoring.triple; break;
            case '2B': pointsScored = state.cfg.scoring.double; break;
            case '1B': pointsScored = state.cfg.scoring.single; break;
        }
        
        // 更新分數 (此處為簡化邏輯，你的版本可能有更複雜的跑者推進計分)
        const currentScorer = state.half === 'top' ? 'away' : 'home';
        state.score[currentScorer] += pointsScored;

        // 更新壘包 (簡化邏輯：只顯示打者)
        state.bases = [null, null, null];
        if (result.adv > 0 && result.adv < 4) {
            state.bases[result.adv - 1] = card;
        }
    }
}

function changeHalfInning() {
  state.outs = 0;
  state.bases = [null, null, null];
  document.getElementById('outcome-text').textContent = "攻守交換！";

  if (state.half === 'top') {
    state.half = 'bottom';
    state.playerTurn = false;
    simulateCpuTurn();
  } else {
    state.half = 'top';
    state.currentInning++;
    state.playerTurn = true;
    document.getElementById('outcome-text').textContent = "輪到你打擊！";
  }

  if (state.currentInning > state.cfg.innings) {
    state.over = true;
    document.getElementById('btn').textContent = "比賽結束";
    document.getElementById('btn').disabled = true;
  }
  render(state, handlers);
}

function simulateCpuTurn() {
  document.getElementById('btn').disabled = true;
  document.getElementById('outcome-text').textContent = "對手正在打擊...";

  let cpuOuts = 0;
  let cpuBatterIndex = 0;
  const playerPitcher = state.player.team.pitchers[0];

  const interval = setInterval(() => {
    if (cpuOuts >= 3) {
      clearInterval(interval);
      changeHalfInning();
      return;
    }
    const batter = state.cpu.deck[cpuBatterIndex % state.cpu.deck.length];
    const result = simulateAtBat(batter, playerPitcher, state);

    if (result.type === 'K' || result.type === 'OUT') {
      cpuOuts++;
    } else {
      let points = 0;
      switch (result.type) {
        case 'HR': points = state.cfg.scoring.homeRun; break;
        case '3B': points = state.cfg.scoring.triple; break;
        case '2B': points = state.cfg.scoring.double; break;
        case '1B': points = state.cfg.scoring.single; break;
      }
      state.score.home += points;
    }
    cpuBatterIndex++;
    render(state, handlers);
  }, 750);
}

function draw(player, numToDraw) {
  for (let i = 0; i < numToDraw; i++) {
    if (player.deck.length === 0) {
      if (player.discard.length === 0) return; // 沒牌可抽了
      // 重洗棄牌堆
      player.deck = [...player.discard];
      player.discard = [];
      shuffle(player.deck);
    }
    if (player.hand.length < player.team.handSize && player.deck.length > 0) {
      player.hand.push(player.deck.pop());
    }
  }
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

// 定義 handlers
const handlers = {
  select: (idx) => {
    // 只有在玩家回合才能選擇
    if (state.playerTurn) {
      state.selected = (state.selected === idx) ? -1 : idx; // 點擊已選中的卡牌可取消選擇
      render(state, handlers);
    }
  },
  button: () => {
    if (state.over || !state.playerTurn) return;
    
    // 如果按鈕是 Play Ball (遊戲開始)
    if (!state.cpu.activePitcher) { 
        initDecks();
        document.getElementById('outcome-text').textContent = "輪到你打擊！";
        render(state, handlers);
        return;
    }
    
    // 如果是確認出牌
    if (state.selected !== -1) {
      playTurn();
    }
  },
};
