// /src/data/teams.js
export const TEAMS = [
  {
    id: "NYY",
    name: "Yankees",
    batters: [
      { type: 'batter', name: "Aaron Judge", stats: { power: 98, hitRate: 90, contact: 82, speed: 60, ovr: 98 } },
      { type: 'batter', name: "Anthony Volpe", stats: { power: 65, hitRate: 78, contact: 75, speed: 92, ovr: 85 } },
      { type: 'batter', name: "DJ LeMahieu", stats: { power: 55, hitRate: 80, contact: 88, speed: 50, ovr: 82 } },
      { type: 'batter', name: "Cody Bellinger", stats: { power: 80, hitRate: 82, contact: 79, speed: 85, ovr: 88 } },
      { type: 'batter', name: "Austin Wells", stats: { power: 78, hitRate: 65, contact: 70, speed: 55, ovr: 79 } },
      { type: 'batter', name: "Paul Goldschmidt", stats: { power: 88, hitRate: 92, contact: 85, speed: 58, ovr: 92 } },
    ],
    pitchers: [
      { type: 'pitcher', name: "Gerrit Cole", stats: { power: 99, velocity: 95, control: 88, technique: 90, ovr: 99 } },
      { type: 'pitcher', name: "Carlos Rodón", stats: { power: 90, velocity: 92, control: 80, technique: 85, ovr: 89 } },
    ],
    actionCards: [], // Placeholder for future action cards
  },
  {
    id: "LAD",
    name: "Dodgers",
    batters: [
      { type: 'batter', name: "Mookie Betts", stats: { power: 85, hitRate: 94, contact: 92, speed: 90, ovr: 97 } },
      { type: 'batter', name: "Shohei Ohtani", stats: { power: 100, hitRate: 95, contact: 88, speed: 89, ovr: 99 } },
      { type: 'batter', name: "Freddie Freeman", stats: { power: 88, hitRate: 96, contact: 98, speed: 65, ovr: 96 } },
      { type: 'batter', name: "Will Smith", stats: { power: 82, hitRate: 85, contact: 90, speed: 55, ovr: 89 } },
    ],
    pitchers: [
      { type: 'pitcher', name: "Y. Yamamoto", stats: { power: 90, velocity: 96, control: 98, technique: 95, ovr: 96 } },
      { type: 'pitcher', name: "Tyler Glasnow", stats: { power: 98, velocity: 100, control: 75, technique: 90, ovr: 94 } },
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
      stats: { power: 85, hitRate: 95, contact: 90, speed: 60, ovr: 94 },
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
      stats: { power: 90, hitRate: 85, contact: 88, speed: 65, ovr: 92 },
      effects: {
        play: { target: "hand", stat: "hitRate", value: 5, duration: "inning" }
      }
    },
    {
      type: "batter",
      name: "Aristotle",
      stats: { power: 88, hitRate: 90, contact: 92, speed: 62, ovr: 93 },
      effects: {
        death: { target: "deck", stat: "power", value: 2, duration: "permanent" }
      }
    },
    {
      type: "batter",
      name: "Heraclitus",
      stats: { power: 75, hitRate: 80, contact: 85, speed: 70, ovr: 85 },
      effects: {
        aura: { condition: "onBase", target: "allFriendlyBatters", stat: "contact", value: 5 }
      }
    },
    {
      type: "batter",
      name: "Parmenides",
      stats: { power: 80, hitRate: 78, contact: 82, speed: 55, ovr: 83 },
      effects: {
        play: { target: "enemyPitcher", stat: "technique", value: -10, duration: "atBat" }
      }
    },
    {
      type: "batter",
      name: "Zeno of Elea",
      stats: { power: 70, hitRate: 75, contact: 80, speed: 85, ovr: 82 },
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
      stats: { power: 78, hitRate: 82, contact: 75, speed: 75, ovr: 84 },
      effects: {
        aura: { condition: "onBase", target: "self", stat: "doubleChance", value: 0.1 }
      }
    },
    {
      type: "batter",
      name: "Anaxagoras",
      stats: { power: 82, hitRate: 80, contact: 78, speed: 65, ovr: 83 },
      effects: {
        death: { target: "hand", action: "drawExtra", value: 1, duration: "nextTurn" }
      }
    },
    {
      type: "batter",
      name: "Diogenes",
      stats: { power: 65, hitRate: 70, contact: 85, speed: 80, ovr: 80 },
      effects: {
        play: { target: "discard", action: "shuffleToDeck", value: 1 }
      }
    }
  ],
  pitchers: [
    {
      type: "pitcher",
      name: "Thales of Miletus",
      stats: { power: 85, velocity: 90, control: 80, technique: 88, ovr: 90 }
    },
    {
      type: "pitcher",
      name: "Empedocles",
      stats: { power: 88, velocity: 85, control: 85, technique: 90, ovr: 92 }
    }
  ],
  actionCards: [
    {
      type: "action", // 類型改為 action
      name: "犧牲觸擊",
      ovr: "戰術",
      stats: {}, // 戰術卡通常沒有自己的屬性
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
      ovr: "戰術",
      stats: {},
      effects: {
        play: {
          action: "steal",
          target: "runner_on_first", // 指定目標
          description: "命令一壘的跑者嘗試盜向二壘！",
        }
      }
    },
    {
      type: "action",
      name: "深度專注",
      ovr: "戰術",
      stats: {},
      effects: {
        play: {
          action: "buff",
          target: "hand", // 目標是手牌
          stat: "contact",
          value: 15,
          duration: "turn", // 效果持續一回合
          description: "本回合中，你手中所有打者的專注力大幅提升。",
        }
      }
    }
  ],
    }
  ];
  
export function getTeamById(teamId) {
  return TEAMS.find(team => team.id === teamId);
}