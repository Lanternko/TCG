// ===== 新增檔案：src/utils/target_selection.js =====

/**
 * 目標選擇工具模組
 * 處理戰術卡的目標選擇邏輯
 */

/**
 * 檢查卡牌是否需要目標選擇
 * @param {Object} card - 卡牌物件
 * @returns {boolean} 是否需要目標選擇
 */
export function needsTargetSelection(card) {
  const targetRequiredCards = [
    '一輩子',
    '想成為人類',
    '滿腦子想著自己'
  ];
  
  return targetRequiredCards.includes(card.name);
}

/**
 * 高亮有效目標
 * @param {Object} card - 戰術卡
 * @param {Object} state - 遊戲狀態
 */
export function highlightValidTargets(card, state) {
  // 清除舊的高亮
  clearTargetHighlights();
  
  switch (card.name) {
    case '一輩子':
      // 高亮所有有角色的壘包
      state.bases.forEach((baseCard, index) => {
        if (baseCard) {
          const baseElement = document.getElementById(getBaseElementId(index));
          if (baseElement) {
            baseElement.classList.add('selectable-target');
          }
        }
      });
      break;
      
    case '想成為人類':
      // 高亮有負面狀態的角色（簡化為所有角色）
      state.bases.forEach((baseCard, index) => {
        if (baseCard) {
          const baseElement = document.getElementById(getBaseElementId(index));
          if (baseElement) {
            baseElement.classList.add('selectable-target');
          }
        }
      });
      break;
      
    case '滿腦子想著自己':
      // 需要選擇手牌中的角色（這裡暫時不實現）
      console.log('滿腦子想著自己：需要選擇手牌角色');
      break;
  }
}

/**
 * 清除目標高亮
 */
export function clearTargetHighlights() {
  document.querySelectorAll('.base').forEach(base => {
    base.classList.remove('selectable-target');
  });
}

/**
 * 獲取壘包元素ID
 * @param {number} baseIndex - 壘包索引 (0=1B, 1=2B, 2=3B)
 * @returns {string} 元素ID
 */
function getBaseElementId(baseIndex) {
  const baseIds = ['first-base', 'second-base', 'third-base'];
  return baseIds[baseIndex];
}

/**
 * 驗證目標選擇是否有效
 * @param {Object} card - 戰術卡
 * @param {number} targetIndex - 目標壘包索引
 * @param {Object} state - 遊戲狀態
 * @returns {boolean} 選擇是否有效
 */
export function isValidTarget(card, targetIndex, state) {
  const targetCard = state.bases[targetIndex];
  
  if (!targetCard) {
    return false;
  }
  
  switch (card.name) {
    case '一輩子':
      // 任何壘上的角色都可以被鎖定
      return true;
      
    case '想成為人類':
      // 任何角色都可以被淨化
      return true;
      
    default:
      return false;
  }
}

/**
 * 獲取目標選擇提示文字
 * @param {Object} card - 戰術卡
 * @returns {string} 提示文字
 */
export function getTargetSelectionHint(card) {
  switch (card.name) {
    case '一輩子':
      return '點擊要鎖定的角色所在壘包';
      
    case '想成為人類':
      return '點擊要淨化的角色所在壘包';
      
    case '滿腦子想著自己':
      return '選擇手牌中的一名角色';
      
    default:
      return '選擇目標';
  }
}