// src/data/teams.js - Enhanced with new card designs
console.log('📦 載入增強版 Teams 資料...');

export const TEAMS = [
  {
    id: "MGO",
    name: "MyGO!!!!!",
    description: "BanG Dream! It's MyGO!!!!! & Ave Mujica - Enhanced Edition",
    theme: "MyGO",
    
    batters: [
      // === MyGO!!!!! 成員 ===
      {
        type: "batter",
        name: "燈 (Tomori)",
        instrument: "Vocal",
        band: "MyGO!!!!!",
        tags: ["MyGO", "Vocal", "Leader"],
        position: "主力",
        stats: { power: 85, hitRate: 75, contact: 70, speed: 75 },
        effects: {
          synergy: {
            keyword: "buff",
            condition: "mygoMembersOnBase",
            target: "self",
            stat: "power",
            value: 12, // 調整為每人+12 (原設計+15)
            stackable: true,
            duration: "atBat",
            description: "【詩超絆】打擊時，我方壘上每有一名MyGO!!!!!跑者，燈本次打擊的力量+12。"
          },
          aura: {
            keyword: "buff",
            condition: "onBase",
            target: "allMyGOBatters",
            stat: "contact",
            value: 5,
            stackable: true,
            description: "【我想成為人類】當燈在壘上時，我方打擊區的打者，會因場上每一名MyGO!!!!!成員，獲得專注+5的加成。"
          }
        }
      },
      {
        type: "batter",
        name: "愛音 (Anon)", 
        instrument: "Guitar",
        band: "MyGO!!!!!",
        tags: ["MyGO", "Guitar", "Newcomer"],
        position: "功能",
        stats: { power: 65, hitRate: 80, contact: 85, speed: 90 },
        effects: {
          play: {
            keyword: "draw",
            action: "drawCard",
            value: 1,
            description: "【還來得及嗎？】抽一張卡。"
          },
          synergy: {
            keyword: "draw",
            condition: "tomoriOnBase",
            action: "drawCard",
            value: 1,
            description: "【我們，是MyGO!!!!!】打擊時，若壘上有「燈」，則額外再抽一張卡。"
          }
        }
      },
      {
        type: "batter",
        name: "樂奈 (Rāna)",
        instrument: "Guitar", 
        band: "MyGO!!!!!",
        tags: ["MyGO", "Guitar", "Skilled"],
        position: "上壘卡",
        stats: { power: 70, hitRate: 88, contact: 75, speed: 82 },
        effects: {
          play: {
            keyword: "conditional_buff",
            condition: "basesEmpty",
            target: "self",
            stat: "hitRate",
            value: 25, // 調整為+25 (原設計+40)
            duration: "atBat",
            description: "【無人之境】若壘上無人，則本次打擊的安打率+25。"
          }
        }
      },
      {
        type: "batter",
        name: "爽世 (Soyo)",
        instrument: "Bass",
        band: "MyGO!!!!!",
        tags: ["MyGO", "Bass", "Selfish"],
        position: "羈絆",
        stats: { power: 75, hitRate: 85, contact: 82, speed: 78 },
        effects: {
          synergy: {
            keyword: "buff",
            condition: "mygoMembersOnBase",
            target: "self",
            stat: "hitRate",
            value: 10,
            stackable: true,
            duration: "turn",
            description: "【為什麼要演奏春日影】壘包上有MyGO!!!!!成員時，每一張為自己提供暫時10點安打率。"
          }
        }
      },
      {
        type: "batter",
        name: "立希 (Taki)",
        instrument: "Drums",
        band: "MyGO!!!!!",
        tags: ["MyGO", "Drums", "Support"],
        position: "功能",
        stats: { power: 68, hitRate: 88, contact: 90, speed: 65 },
        effects: {
          play: {
            keyword: "target_buff",
            action: "buffMyGOInHand",
            target: "chooseMyGOFromHand",
            stat: "power",
            value: 20,
            duration: "nextPlay",
            description: "【就照我說的做！】選擇你手牌中的一張MyGO!!!!!角色卡，下次打出前，該卡牌的力量+20。"
          }
        }
      },

      // === Ave Mujica 成員 ===
      {
        type: "batter",
        name: "祥子 (Saki)",
        instrument: "Keyboard",
        band: "Mujica",
        tags: ["Mujica", "Keyboard", "God"],
        position: "主力",
        stats: { power: 90, hitRate: 88, contact: 92, speed: 85 },
        effects: {
          passive: {
            keyword: "power_on_death",
            condition: "anyCharacterDies",
            target: "self",
            stat: "power",
            value: 2, // 調整為+2 (原設計+3)
            permanent: true,
            description: "【遺忘的義務】當任何一名角色（包含敵我雙方）被犧牲或出局時，祥子（無論位置）獲得力量永久+2。"
          },
          play: {
            keyword: "double_bonus",
            action: "addPermanentToBase",
            target: "self",
            description: "【世界的中心】本次打擊時，祥子的基礎數值，會加上她已獲得的永久加成值。"
          }
        }
      },
      {
        type: "batter",
        name: "初華 (Uika)",
        instrument: "Vocal/Guitar", 
        band: "Mujica",
        tags: ["Mujica", "Vocal", "Guitar", "Doll"],
        position: "羈絆",
        stats: { power: 85, hitRate: 90, contact: 88, speed: 80 },
        effects: {
          synergy: {
            keyword: "copy_stats",
            condition: "sakiOnBase",
            target: "self",
            action: "copySakiStats",
            description: "【你是我的...】打擊時，若壘上有「祥子」，則初華本次打擊的數值完全複製祥子當前的所有數值（包含永久加成）。"
          },
          death: {
            keyword: "resurrect",
            action: "returnManaToHand",
            target: "mana",
            description: "【給我回來】出局時，將棄牌堆中的真奈放回手上。"
          }
        }
      },
      {
        type: "batter",
        name: "喵夢 (Nyamu)",
        instrument: "Drums",
        band: "Mujica",
        tags: ["Mujica", "Drums", "Cat"],
        position: "功能",
        stats: { power: 70, hitRate: 82, contact: 78, speed: 88 },
        effects: {
          play: {
            keyword: "conditional_effect",
            condition: "scoreComparison",
            actions: [
              {
                condition: "leading",
                keyword: "draw",
                value: 1,
                description: "若我方目前的得分高於對手，抽一張卡。"
              },
              {
                condition: "trailing",
                keyword: "debuff",
                target: "enemyPitcher",
                stat: "control",
                value: -20,
                duration: "turn",
                description: "若低於對手，則改為對方的投手控球本回合-20。"
              }
            ],
            description: "【百萬訂閱】若我方目前的得分高於對手，抽一張卡。若低於對手，則改為對方的投手控球本回合-20。"
          }
        }
      },
      {
        type: "batter",
        name: "海鈴 (Umirin)",
        instrument: "Bass",
        band: "Mujica",
        tags: ["Mujica", "Bass", "Professional"],
        position: "上壘卡",
        stats: { power: 72, hitRate: 92, contact: 90, speed: 70 },
        effects: {
          play: {
            keyword: "deck_peek",
            action: "peekAndRearrange",
            value: 3,
            description: "【準備萬全】你可以檢視你牌庫頂的3張牌，然後將它們以任意順序放回牌庫頂。"
          },
          death: {
            keyword: "buff_next",
            action: "buffNextCard",
            target: "nextHandCard",
            stat: "contact",
            value: 20,
            description: "【經驗傳承】當海鈴出局時，你手牌中下一張打出的卡牌，其專注+20。"
          }
        }
      },
      {
        type: "batter",
        name: "真奈 (Mana)",
        instrument: "Guitar",
        band: "中立",
        tags: ["Neutral", "Guitar", "Champion"],
        position: "上壘卡",
        stats: { power: 78, hitRate: 95, contact: 85, speed: 80 }, // 調整為95 (原設計99)
        effects: {
          passive: {
            keyword: "no_synergy",
            description: "【五冠選手】此卡牌無「羈絆」效果，作為補償其基礎安打率為遊戲中最高(95)。"
          },
          death: {
            keyword: "power_transfer",
            action: "boostUika",
            target: "uika",
            stat: "allStats",
            value: 5,
            permanent: true,
            description: "【二人一體】被棄牌時，初華獲得永久三圍+5。"
          }
        }
      },
      {
        type: "batter", 
        name: "睦 (Mutsuki)",
        instrument: "Guitar",
        band: "Mujica",
        tags: ["Mujica", "Guitar", "Silent"],
        position: "死聲",
        stats: { power: 75, hitRate: 88, contact: 82, speed: 70 },
        effects: {
          death: {
            keyword: "power_transfer",
            action: "boostMortis",
            target: "mortis",
            stat: "power",
            value: 10,
            permanent: true,
            description: "【......】當睦出局時，Mortis的力量永久+10。"
          }
        }
      },
      {
        type: "batter",
        name: "Mortis",
        instrument: "Unknown",
        band: "Mujica", 
        tags: ["Mujica", "Unknown", "Death"],
        position: "死聲",
        stats: { power: 80, hitRate: 85, contact: 75, speed: 75 },
        effects: {
          death: {
            keyword: "power_transfer",
            action: "boostMutsuki",
            target: "mutsuki",
            stat: "power", 
            value: 10,
            permanent: true,
            description: "【迴響】當Mortis出局時，「睦」，其力量永久+10。"
          }
        }
      }
    ],

    pitchers: [
      {
        type: "pitcher",
        name: "三角 凜凜子",
        band: "支援",
        tags: ["Support", "Gentle"],
        position: "先發投手",
        stats: { power: 80, velocity: 85, control: 92, technique: 88 },
        effects: {
          aura: {
            keyword: "buff",
            target: "allFriendlyBatters",
            stats: {
              hitRate: 5,
              contact: 10
            },
            description: "【一緒に迷子】我方所有打者的安打率+5，專注+10。"
          }
        }
      },
      {
        type: "pitcher", 
        name: "森 美奈美",
        band: "支援",
        tags: ["Support", "Reality"],
        position: "中繼投手",
        stats: { power: 85, velocity: 90, control: 85, technique: 82 },
        effects: {
          aura: {
            keyword: "buff",
            target: "allFriendlyBatters", 
            stats: {
              hitRate: 15
            },
            description: "【いつもありがとう】我方所有打者的安打率+15。"
          }
        }
      },
      {
        type: "pitcher",
        name: "豐川 定治", 
        band: "支援",
        tags: ["Support", "Dignity"],
        position: "終結投手",
        stats: { power: 90, velocity: 95, control: 80, technique: 85 },
        effects: {
          aura: {
            keyword: "buff",
            target: "allFriendlyBatters",
            stats: {
              power: 20
            },
            description: "【このままじゃ終われない】我方所有打者的力量+20。"
          }
        }
      }
    ],

    actionCards: [
      // === 基礎戰術卡 ===
      {
        type: "action",
        name: "迷星叫",
        band: "MyGO!!!!!",
        tags: ["Draw"],
        rarity: "Common",
        effects: {
          play: {
            keyword: "conditional_draw",
            action: "drawBaseOnMyGO",
            baseValue: 1,
            bonusPerMyGO: 1,
            maxBonus: 3,
            description: "抽一張卡。我方壘上每有一名MyGO!!!!!跑者，就額外再抽一張卡。（最多額外抽3張）"
          }
        }
      },
      {
        type: "action",
        name: "春日影",
        band: "MyGO!!!!!",
        tags: ["Buff", "Temporary"],
        rarity: "Rare",
        effects: {
          play: {
            keyword: "max_stats",
            target: "currentBatter",
            stats: {
              hitRate: 99,
              contact: 99
            },
            duration: "atBat",
            description: "選擇一名我方正在打擊區的打者。本次打擊中，該打者的安打率與專注視為99。"
          }
        }
      },
      {
        type: "action",
        name: "黒の誕生",
        band: "Mujica",
        tags: ["Buff", "Power"],
        rarity: "Rare", 
        effects: {
          play: {
            keyword: "power_boost",
            target: "currentBatter",
            stat: "power",
            value: 20, // 調整為+20 (原設計+30)
            duration: "atBat",
            description: "選擇一名我方正在打擊區的打者。本次打擊中，該打者的力量+20。"
          }
        }
      },
      {
        type: "action",
        name: "迷途的樂章", 
        band: "MyGO!!!!!",
        tags: ["Utility"],
        rarity: "Common",
        effects: {
          play: {
            keyword: "discard_draw",
            action: "discardThenDraw",
            discardCount: 1,
            drawCount: 1,
            description: "選擇並棄掉你的一張手牌。然後，抽一張卡。"
          }
        }
      },
      {
        type: "action",
        name: "獻身的假面",
        band: "Mujica",
        tags: ["Debuff", "Sacrifice"],
        rarity: "Rare",
        effects: {
          play: {
            keyword: "sacrifice_debuff",
            cost: {
              type: "discard",
              count: 1
            },
            target: "enemyPitcher",
            stat: "allStats",
            value: -20,
            duration: "untilNextTurn",
            description: "選擇並棄掉你的一張手牌。直到你的下個回合開始前，對方的投手所有數值-20。"
          }
        }
      },
      {
        type: "action",
        name: "神さま、バカ",
        band: "Mujica", 
        tags: ["Draw", "Utility"],
        rarity: "Common",
        effects: {
          play: {
            keyword: "deck_cycle",
            action: "putBackThenDraw",
            putBackCount: 1,
            drawCount: 2,
            description: "將你的一張手牌放回你的牌庫底。然後，抽兩張卡。"
          }
        }
      },

      // === 特殊戰術卡 ===
      {
        type: "action",
        name: "抹茶芭菲",
        band: "中立",
        tags: ["Buff", "Rana"],
        rarity: "Common",
        effects: {
          play: {
            keyword: "target_specific",
            target: "rana",
            location: "anywhere",
            stat: "allStats",
            value: 15,
            duration: "turn",
            bonusEffect: {
              keyword: "draw",
              value: 1
            },
            description: "選擇一張我方的「樂奈」（無論位置），直到回合結束，其所有數值+15。抽一張卡。"
          }
        }
      },

      // === 傳說戰術卡 ===
      {
        type: "action",
        name: "一輩子...",
        band: "中立",
        tags: ["Lock", "Permanent"],
        rarity: "Legendary",
        effects: {
          play: {
            keyword: "lock",
            action: "lockCharacter",
            target: "chooseFromBase",
            effect: "permanentLock",
            description: "選擇壘上的一名我方角色，使其進入「鎖定」狀態。該角色無法再前進、得分，但也不會因任何效果或出局而被移除，其光環效果將持續存在。"
          }
        }
      },
      {
        type: "action",
        name: "CRYCHIC",
        band: "中立",
        tags: ["Legendary", "Resource"],
        rarity: "Legendary",
        requirements: {
          condition: "discardPileDiversity",
          minDifferentCards: 5
        },
        effects: {
          play: {
            keyword: "deck_rebuild",
            action: "shuffleDiscardIntoDeck",
            bonusEffect: {
              keyword: "increase_hand_limit",
              value: 1,
              permanent: true
            },
            description: "僅當你的棄牌堆中有至少5張不同的角色卡時才能發動。將你棄牌堆中所有角色卡洗入你的牌庫。然後，你的手牌上限永久+1。"
          }
        }
      },
      {
        type: "action",
        name: "解散樂隊",
        band: "MyGO!!!!!",
        tags: ["Destruction", "Sacrifice"],
        rarity: "Legendary",
        effects: {
          play: {
            keyword: "sacrifice_all_bases",
            action: "destroyAllBasesForPermanentPower",
            bonusPerDestroyed: 5, // 調整為+5 (原設計+5)
            description: "將我方所有壘包上的跑者全部送入棄牌堆。每因此法棄掉一名跑者，你手牌中所有的角色卡，其所有數值永久+5。"
          }
        }
      },

      // === 高級戰術卡 (暫時註解，第二階段實作) ===
      /*
      {
        type: "action",
        name: "Oblivionis",
        band: "Mujica",
        tags: ["Fusion", "Legendary"],
        rarity: "Legendary",
        requirements: {
          condition: "fusionRequirement",
          cards: [
            { name: "睦", minPower: 100 },
            { name: "Mortis", minPower: 100 }
          ]
        },
        effects: {
          play: {
            keyword: "fusion",
            action: "fuseMutuskiMortis",
            result: "若葉睦",
            description: "僅當存在力量值≥100的「睦」與「Mortis」時可發動。將遊戲中所有的「睦」與「Mortis」移除，並將衍生的傳說角色「若葉睦」加入手牌。"
          }
        }
      },
      {
        type: "action", 
        name: "歸來的玩偶",
        band: "Mujica",
        tags: ["Revival", "Legendary"],
        rarity: "Legendary",
        effects: {
          play: {
            keyword: "resurrect",
            target: "mortis",
            location: "discardPile",
            placement: "chooseBase",
            cost: {
              type: "skipNextBat",
              description: "跳過下一個打擊階段"
            },
            description: "從你的棄牌堆中，選擇一張「Mortis」並將她放置到我方任意一個空的壘包上。如果你這麼做，你必須跳過你的下一個打擊階段。"
          }
        }
      }
      */
    ]
  },
  
  // 保留原有的對手隊伍
  {
    id: "NYY", 
    name: "Yankees",
    description: "經典棒球隊伍",
    batters: [
      { type: 'batter', name: "Aaron Judge", stats: { power: 98, hitRate: 90, contact: 82, speed: 60 } },
      { type: 'batter', name: "Anthony Volpe", stats: { power: 65, hitRate: 78, contact: 75, speed: 92 } },
      { type: 'batter', name: "DJ LeMahieu", stats: { power: 55, hitRate: 80, contact: 88, speed: 50 } },
      { type: 'batter', name: "Cody Bellinger", stats: { power: 80, hitRate: 82, contact: 79, speed: 85 } },
      { type: 'batter', name: "Austin Wells", stats: { power: 78, hitRate: 65, contact: 70, speed: 55 } },
      { type: 'batter', name: "Paul Goldschmidt", stats: { power: 88, hitRate: 92, contact: 85, speed: 58 } },
    ],
    pitchers: [
      { type: 'pitcher', name: "Gerrit Cole", stats: { power: 99, velocity: 95, control: 88, technique: 90 } },
      { type: 'pitcher', name: "Carlos Rodón", stats: { power: 90, velocity: 92, control: 80, technique: 85 } },
    ],
    actionCards: [
      {
        
      }
    ]
  },
  
  {
    id: "LAD",
    name: "Dodgers", 
    description: "洛杉磯道奇隊",
    batters: [
      { type: 'batter', name: "Mookie Betts", stats: { power: 85, hitRate: 94, contact: 92, speed: 90 } },
      { type: 'batter', name: "Shohei Ohtani", stats: { power: 100, hitRate: 95, contact: 88, speed: 89 } },
      { type: 'batter', name: "Freddie Freeman", stats: { power: 88, hitRate: 96, contact: 98, speed: 65 } },
      { type: 'batter', name: "Will Smith", stats: { power: 82, hitRate: 85, contact: 90, speed: 55 } },
    ],
    pitchers: [
      { type: 'pitcher', name: "Y. Yamamoto", stats: { power: 90, velocity: 96, control: 98, technique: 95 } },
      { type: 'pitcher', name: "Tyler Glasnow", stats: { power: 98, velocity: 100, control: 75, technique: 90 } },
    ],
    actionCards: [
      {
        type: "action",
        name: "Perfect Game",
        effects: {
          play: {
            keyword: "buff",
            target: "allFriendly",
            stat: "hitRate",
            value: 10,
            duration: "inning",
            description: "本局中，所有我方打者安打率+10。"
          }
        }
      }
    ]
  }
];

// 導出函數保持不變
export function getTeamById(teamId) {
  const team = TEAMS.find(team => team.id === teamId);
  if (!team) {
    console.warn(`⚠️ 找不到隊伍: ${teamId}`);
    return null;
  }
  console.log(`✅ 找到隊伍: ${team.name} (${team.id})`);
  return team;
}

export function getAllTeams() {
  return TEAMS;
}

export function getMyGOTeam() {
  return getTeamById("MGO");
}

export function teamExists(teamId) {
  return TEAMS.some(team => team.id === teamId);
}

// 新增：獲取所有MyGO隊伍的隊名
export const ALL_TEAMS = TEAMS;

console.log(`✅ Enhanced Teams 資料載入完成: ${TEAMS.length} 個隊伍`);
console.log('🎸 新增功能:');
console.log('  - 戰吼效果 (愛音、樂奈、立希、喵夢、海鈴)');
console.log('  - 光環效果 (燈、投手卡)');
console.log('  - 羈絆效果 (爽世、初華)');
console.log('  - 死聲效果 (睦、Mortis、真奈)');
console.log('  - 新戰術卡 (迷星叫、春日影、黒の誕生等)');

TEAMS.forEach(team => {
  console.log(`  - ${team.name} (${team.id}): ${team.batters.length} 打者, ${team.pitchers.length} 投手, ${team.actionCards?.length || 0} 戰術卡`);
});