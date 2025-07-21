// 新增：集中管理遊戲參數配置
export const GAME_CONFIG = {
  // 手牌相關
  HAND: {
    MAX_SIZE: 7,              // 手牌上限
    STARTING_DRAW: 5,         // 起始手牌數
    DRAW_PER_TURN: 2,         // 每回合抽牌數
    DRAW_AFTER_PLAY: 1,       // 打出卡牌後抽牌數
  },
  
  // 得分相關
  SCORING: {
    HOME_RUN: 10,             // 全壘打得分
    TRIPLE: 3,                // 三壘安打得分
    DOUBLE: 2,                // 二壘安打得分
    SINGLE: 1,                // 一壘安打得分
    WALK: 1,                  // 保送得分
    BASE_RUNNER_SCORE: 1,     // 跑者回本壘得分
  },
  
  // 個別卡片的 Buff 數值
  BUFFS: {
    TOMORI_SYNERGY: 12,       // 燈的詩超絆每人加成
    TOMORI_AURA: 5,           // 燈的光環加成
    SOYO_SYNERGY: 10,         // 爽世的羈絆加成
    RANA_NO_BASE: 25,         // 樂奈無人之境加成
    SAKI_POWER_ON_DEATH: 2,   // 祥子死亡加成
    TAKI_TARGET_BUFF: 20,     // 立希目標加成
    MANA_DEATH_BOOST: 5,      // 真奈死聲加成
    MUTSUKI_MORTIS_BOOST: 10, // 睦/Mortis死聲加成
    DISBAND_BAND_BOOST: 5,    // 解散樂隊每人加成
  },
  
  // 遊戲流程
  FLOW: {
    INNINGS: 9,               // 局數
    OUTS_PER_INNING: 3,       // 每局出局數
    CPU_DRAW_PENALTY: 1,      // Mujica威壓抽牌懲罰
  }
};