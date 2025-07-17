export function render(state, handlers) {
  const $app = document.getElementById('app');
  $app.innerHTML = /* html */`
    <!-- 頂部 -->
    <div class="top-bar">${topBar(state)}</div>
    <!-- 球場 -->
    <div class="field">${diamond(state)}</div>
    <!-- 按鈕 -->
    <div class="action-area">
      <button id="btn" ${state.over ? 'disabled' : ''}>
        ${buttonLabel(state)}
      </button>
    </div>
    <!-- 手牌 -->
    <div class="hand">${hand(state)}</div>
  `;

  // 綁事件
  document.querySelectorAll('.card-hand').forEach((el, i) =>
    el.onclick = () => handlers.select(i));
  document.getElementById('btn').onclick = handlers.button;
}

/* 各段 HTML 片段函式 (topBar/diamond/hand/buttonLabel) 請依需求拆寫 */
function topBar(state){ return `<div>${state.score.away}-${state.score.home}</div>`; }
function diamond(){ return `<div class="diamond"></div>`; }
function hand(state){ return state.player.hand.map(c=>`<div>${c.name}</div>`).join(''); }
function buttonLabel(state){ return state.selected===-1?'選擇卡牌':'確認出牌'; }
