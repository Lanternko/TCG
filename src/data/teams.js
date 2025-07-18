// /src/data/teams.js
export const TEAMS = [
  {
    id: "NYY",
    name: "Yankees",
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
    actionCards: [], // Placeholder for future action cards
  },
  {
    id: "LAD",
    name: "Dodgers",
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
    actionCards: [], // Placeholder for future action cards
  },
  {
    id: "PHI",
    name: "Philosophers",
    batters: [
      {
        type: "batter",
        name: "Socrates",
        stats: { power: 85, hitRate: 95, contact: 90, speed: 60 },
        effects: {
          synergy: {
            condition: "onBase",
            effect: { target: "allFriendlyBatters", stat: "power", value: 10, duration: "turn" }
          }
        }
      },
      {
        type: "batter",
        name: "Plato",
        stats: { power: 90, hitRate: 85, contact: 88, speed: 65 },
        effects: {
          play: { target: "hand", stat: "hitRate", value: 5, duration: "inning" }
        }
      },
      {
        type: "batter",
        name: "Aristotle",
        stats: { power: 88, hitRate: 90, contact: 92, speed: 62 },
        effects: {
          death: { target: "deck", stat: "power", value: 2, duration: "permanent" }
        }
      },
      {
        type: "batter",
        name: "Heraclitus",
        stats: { power: 75, hitRate: 80, contact: 85, speed: 70 },
        effects: {
          aura: { condition: "onBase", target: "allFriendlyBatters", stat: "contact", value: 5 }
        }
      },
      {
        type: "batter",
        name: "Parmenides",
        stats: { power: 80, hitRate: 78, contact: 82, speed: 55 },
        effects: {
          play: { target: "enemyPitcher", stat: "technique", value: -10, duration: "atBat" }
        }
      },
      {
        type: "batter",
        name: "Zeno of Elea",
        stats: { power: 70, hitRate: 75, contact: 80, speed: 85 },
        effects: {
          synergy: {
            condition: "philosopherOnSecond",
            effect: { target: "runners", action: "advanceExtraBase", value: 1 }
          }
        }
      },
      {
        type: "batter",
        name: "Pythagoras",
        stats: { power: 78, hitRate: 82, contact: 75, speed: 75 },
        effects: {
          aura: { condition: "onBase", target: "self", stat: "doubleChance", value: 0.1 }
        }
      },
      {
        type: "batter",
        name: "Anaxagoras",
        stats: { power: 82, hitRate: 80, contact: 78, speed: 65 },
        effects: {
          death: { target: "hand", action: "drawExtra", value: 1, duration: "nextTurn" }
        }
      },
      {
        type: "batter",
        name: "Diogenes",
        stats: { power: 65, hitRate: 70, contact: 85, speed: 80 },
        effects: {
          play: { target: "discard", action: "shuffleToDeck", value: 1 }
        }
      }
    ],
    pitchers: [
      {
        type: "pitcher",
        name: "Thales of Miletus",
        stats: { power: 85, velocity: 90, control: 80, technique: 88 }
      },
      {
        type: "pitcher",
        name: "Empedocles",
        stats: { power: 88, velocity: 85, control: 85, technique: 90 }
      }
    ],
    actionCards: [
      {
        type: "action",
        name: "犧牲觸擊",
        stats: {},
        effects: {
          play: {
            action: "bunt",
            description: "嘗試推進壘上所有跑者一個壘包，但打者會出局。",
          }
        }
      },
      {
        type: "action",
        name: "盜壘指令",
        stats: {},
        effects: {
          play: {
            action: "steal",
            target: "runner_on_first",
            description: "命令一壘的跑者嘗試盜向二壘！",
          }
        }
      },
      {
        type: "action",
        name: "深度專注",
        stats: {},
        effects: {
          play: {
            action: "buff",
            target: "hand",
            stat: "contact",
            value: 15,
            duration: "turn",
            description: "本回合中，你手中所有打者的專注力大幅提升。",
          }
        }
      }
    ],
  },
// MyGO!!!!! TCG Team Data - 新增到 TEAMS 陣列中


  {
    id: "MGO",
    name: "MyGO!!!!!",
    description: "BanG Dream! It's MyGO!!!!! & Ave Mujica",
    theme: "MyGO", // 主題標識
    
    batters: [
      // === MyGO!!!!! 成員 ===
      {
        type: "batter",
        name: "燈 (Tomori)",
        instrument: "Vocal",
        band: "MyGO!!!!!",
        tags: ["MyGO", "Vocal", "Leader"],
        stats: { power: 95, hitRate: 75, contact: 60, speed: 70 },
        effects: {
          play: {
            keyword: "debuff",
            condition: "enemyHasSaki",
            target: "self",
            stat: "contact",
            value: 10,
            duration: "permanent",
            description: "若對手隊伍有祥子，燈的專注永久-10。"
          },
          synergy: {
            keyword: "buff",
            condition: "mygo3OnBase",
            target: "self", 
            stat: "power",
            value: 20,
            duration: "permanent",
            description: "當壘上有3名或更多MyGO!!!!!成員時，燈的力量+20。"
          }
        }
      },
      {
        type: "batter",
        name: "愛音 (Anon)", 
        instrument: "Guitar",
        band: "MyGO!!!!!",
        tags: ["MyGO", "Guitar", "Newcomer"],
        stats: { power: 70, hitRate: 75, contact: 85, speed: 90 },
        effects: {
          play: {
            keyword: "search",
            action: "searchMyGO",
            description: "從牌庫中抽一張MyGO!!!!!成員卡。"
          },
          synergy: {
            keyword: "buff",
            condition: "tomoriOnBase",
            target: "self",
            stat: "speed", 
            value: 15,
            duration: "turn",
            description: "當燈在壘上時，愛音的速度+15。"
          }
        }
      },
      {
        type: "batter",
        name: "樂奈 (Rāna)",
        instrument: "Guitar", 
        band: "MyGO!!!!!",
        tags: ["MyGO", "Guitar", "Skilled"],
        stats: { power: 85, hitRate: 98, contact: 50, speed: 65 },
        effects: {
          aura: {
            keyword: "buff",
            condition: "perGuitaristOnBase",
            target: "self",
            stat: "hitRate",
            value: 5,
            stackable: true,
            description: "壘上每有一位吉他手，樂奈的安打率+5。"
          },
          play: {
            keyword: "copy",
            action: "copyGuitaristSynergy", 
            theme: "MyGO",
            description: "隨機複製場上一位其他吉他手的羁絆效果。"
          }
        }
      },
      {
        type: "batter",
        name: "爽世 (Soyo)",
        instrument: "Bass",
        band: "MyGO!!!!!",
        tags: ["MyGO", "Bass", "Selfish"],
        stats: { power: 75, hitRate: 85, contact: 92, speed: 80 },
        effects: {
          play: {
            keyword: "buff",
            cost: { keyword: "discard", value: 1 },
            target: "self",
            stat: "power",
            value: 30,
            duration: "turn",
            optional: true,
            description: "可以選擇棄掉一張手牌，本回合爽世的力量+30。"
          },
          synergy: {
            keyword: "mixed",
            condition: "crychicOnBase",
            target: "self",
            effects: [
              { type: "debuff", stat: "contact", value: 15 },
              { type: "buff", stat: "hitRate", value: 10 }
            ],
            duration: "turn",
            description: "若壘上有祥子或睦，爽世的專注-15但安打率+10。"
          }
        }
      },
      {
        type: "batter",
        name: "立希 (Taki)",
        instrument: "Drums",
        band: "MyGO!!!!!",
        tags: ["MyGO", "Drums", "Support"],
        stats: { power: 68, hitRate: 92, contact: 88, speed: 55 },
        effects: {
          aura: {
            keyword: "buff",
            condition: "onBase",
            target: "allMyGOMembers",
            stat: "hitRate",
            value: 5,
            description: "壘上的MyGO!!!!!成員安打率+5。"
          },
          synergy: {
            keyword: "untargetable",
            condition: "tomoriOnBase",
            target: "self",
            description: "當燈在壘上時，立希不會成為對手技能的目標。"
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
        stats: { power: 92, hitRate: 88, contact: 95, speed: 98 },
        effects: {
          play: {
            keyword: "debuff",
            target: "allEnemyOnBase",
            stat: "contact",
            value: 10,
            duration: "turn",
            description: "對手所有在壘上的角色專注-10。"
          },
          synergy: {
            keyword: "special",
            condition: "mujica3OnBase",
            target: "enemy",
            effect: "drawOneLess",
            duration: "nextTurn",
            description: "當壘上有3名或更多Mujica成員時，對手下回合抽卡數-1。"
          }
        }
      },
      {
        type: "batter",
        name: "初華 (Uika)",
        instrument: "Vocal/Guitar", 
        band: "Mujica",
        tags: ["Mujica", "Vocal", "Guitar", "Doll"],
        stats: { power: 98, hitRate: 90, contact: 85, speed: 92 },
        effects: {
          play: {
            keyword: "disable",
            target: "chooseEnemyOnBase",
            effect: "disableSynergy",
            duration: "turn",
            description: "可指定一名對手壘上的角色，使其羁絆效果無效一回合。"
          },
          synergy: {
            keyword: "buff",
            condition: "sakiOnBase",
            target: "self",
            stat: "power",
            value: 15,
            duration: "turn",
            description: "若祥子在壘上，初華的力量+15。"
          }
        }
      },
      {
        type: "batter",
        name: "喵夢 (Nyamu)",
        instrument: "Drums",
        band: "Mujica",
        tags: ["Mujica", "Drums", "Cat"],
        stats: { power: 70, hitRate: 80, contact: 75, speed: 95 },
        effects: {
          aura: {
            keyword: "buff",
            condition: "onBase",
            target: "self",
            stat: "speed",
            value: "dynamicByScore",
            calculation: (gameState) => gameState.score.home,
            description: "根據我方獲得的總分數，提升自身的速度(每1分+1)。"
          },
          synergy: {
            keyword: "buff",
            condition: "enemyDrummerOnBase",
            target: "self",
            stat: "hitRate",
            value: 10,
            duration: "turn",
            description: "若對手壘上有鼓手，喵夢的安打率+10。"
          }
        }
      },
      {
        type: "batter",
        name: "睦 (Mutsuki)",
        instrument: "Guitar",
        band: "Mujica",
        tags: ["Mujica", "Guitar", "Silent"],
        stats: { power: 65, hitRate: 94, contact: 70, speed: 60 },
        effects: {
          passive: {
            keyword: "buff",
            condition: "inHand",
            target: "allGuitarists",
            stat: "hitRate",
            value: 5,
            description: "這張卡在手牌中時，我方所有吉他手的安打率+5。"
          },
          synergy: {
            keyword: "special",
            condition: "soyoOrSakiRetire",
            target: "self",
            effect: "returnToHand",
            description: "當爽世或祥子退場時，睦會跟著一起退場(返回手牌)。"
          }
        }
      },
      {
        type: "batter",
        name: "海鈴 (Umirin)",
        instrument: "Bass",
        band: "Mujica",
        tags: ["Mujica", "Bass", "Professional"],
        stats: { power: 70, hitRate: 96, contact: 90, speed: 72 },
        effects: {
          passive: {
            keyword: "immune",
            target: "self",
            immuneTo: ["speedEffects"],
            description: "海鈴不受任何對手的速度效果影響。"
          },
          synergy: {
            keyword: "buff",
            condition: "takiOnBase",
            target: "self",
            stat: "contact",
            value: 10,
            duration: "turn",
            description: "當立希在壘上時，海鈴的專注+10。"
          }
        }
      }
    ],

    pitchers: [
      {
        type: "pitcher",
        name: "CRYCHIC的回憶",
        band: "CRYCHIC",
        tags: ["Memory", "Past"],
        stats: { power: 85, velocity: 90, control: 80, technique: 88 },
        effects: {
          passive: {
            keyword: "aura",
            target: "allFriendly",
            stat: "contact",
            value: -5,
            description: "痛苦的回憶讓所有我方角色專注-5，但也激發了潛力。"
          }
        }
      },
      {
        type: "pitcher",
        name: "Ave Mujica的意志",
        band: "Mujica",
        tags: ["Dark", "Power"],
        stats: { power: 95, velocity: 88, control: 92, technique: 95 },
        effects: {
          passive: {
            keyword: "intimidate",
            target: "allEnemy",
            stat: "hitRate",
            value: -3,
            description: "黑暗的威壓讓對手所有角色安打率-3。"
          }
        }
      }
    ],

    actionCards: [
      {
        type: "action",
        name: "解散樂隊",
        band: "CRYCHIC",
        tags: ["Destruction", "Sacrifice"],
        rarity: "Legendary",
        cost: { type: "special", description: "摧毀所有壘包" },
        effects: {
          play: {
            keyword: "destroy",
            action: "destroyAllBasesForPermanentPower",
            theme: "MyGO",
            description: "摧毀所有壘包上的卡片。每摧毀一張，你牌庫中所有打者的力量永久+10。"
          }
        }
      },
      {
        type: "action",
        name: "It's MyGO!!!!!",
        band: "MyGO!!!!!",
        tags: ["Unity", "Burst"],
        rarity: "Rare",
        effects: {
          play: {
            keyword: "buff",
            target: "allMyGOOnBase",
            stat: "allStats",
            value: 15,
            duration: "turn",
            description: "本回合中，我方所有在壘上的MyGO!!!!!成員，所有數值+15。"
          }
        }
      },
      {
        type: "action",
        name: "滿腦子想著自己",
        band: "MyGO!!!!!",
        tags: ["Selfish", "Power"],
        rarity: "Rare",
        effects: {
          play: {
            keyword: "special",
            action: "soloistBoost",
            theme: "MyGO",
            description: "選擇手牌中的一名角色，該角色本回合力量+40，但手牌中其他角色專注-20。"
          }
        }
      },
      {
        type: "action",
        name: "一輩子",
        band: "MyGO!!!!!",
        tags: ["Determination", "Lock"],
        rarity: "Epic",
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
        name: "小祥小祥小祥",
        band: "Mujica",
        tags: ["Obsession", "Search"],
        rarity: "Common",
        effects: {
          play: {
            keyword: "search",
            action: "searchSaki",
            theme: "MyGO",
            description: "從你的牌庫中尋找「祥子」卡，並將其加入手牌。如果祥子已在場上或手牌中，則改為抽兩張卡。"
          }
        }
      },
      {
        type: "action",
        name: "想成為人類",
        band: "Mujica",
        tags: ["Transformation", "Purify"],
        rarity: "Rare",
        effects: {
          play: {
            keyword: "mixed",
            target: "chooseFromBase",
            effects: [
              { keyword: "purify", effect: "removeNegativeStatus" },
              { keyword: "setTo", stat: "speed", value: 99, duration: "turn" }
            ],
            description: "選擇壘上的一名角色，移除其所有負面狀態。本回合其速度數值視為99。"
          }
        }
      },
      {
        type: "action",
        name: "我要成為神",
        band: "Mujica",
        tags: ["Godhood", "Sacrifice"],
        rarity: "Legendary",
        cost: { keyword: "sacrifice", target: "MyGOMember", count: 1 },
        effects: {
          play: {
            keyword: "sacrifice",
            action: "sacrificeForGodhood",
            theme: "MyGO",
            description: "從手牌中棄掉一張MyGO!!!!!角色卡，你牌庫及手牌中所有的「祥子」卡，力量永久+20。"
          }
        }
      },
      {
        type: "action",
        name: "樂器練習",
        band: "General",
        tags: ["Training", "Buff"],
        rarity: "Common",
        effects: {
          play: {
            keyword: "buff",
            target: "chooseFromHand",
            stat: "chooseOne",
            value: 10,
            duration: "turn",
            description: "選擇手牌中的一名角色和一項數值，該數值本回合+10。"
          }
        }
      },
      {
        type: "action",
        name: "舞台燈光",
        band: "General",
        tags: ["Performance", "Aura"],
        rarity: "Common",
        effects: {
          play: {
            keyword: "buff",
            target: "allOnBase",
            stat: "hitRate",
            value: 5,
            duration: "inning",
            description: "本局中，所有壘上角色的安打率+5。"
          }
        }
      }
    ]
  }
  ];

export function getTeamById(teamId) {
  return TEAMS.find(team => team.id === teamId);
}