import { CONFIG } from './config.js';
import { loadData, PLAYER_STATS_KEY } from './storage_utils.js';
import { TEAMS, getTeamById as getBaseTeamById } from './teams.js';

// OVR 計算函數 (來自你的檔案)
function calculateBatterOVR(stats) {
    const w = CONFIG.ovrWeights.batter;
    const score = (stats.power * w.power) + (stats.hitRate * w.hitRate) + (stats.contact * w.contact) + (stats.speed * w.speed);
    const ovr = Math.round(score * w.scale + w.base);
    return Math.min(99, Math.max(40, ovr));
}
function calculatePitcherOVR(stats) {
    const w = CONFIG.ovrWeights.pitcher;
    const score = (stats.power * w.power) + (stats.velocity * w.velocity) + (stats.control * w.control) + (stats.technique * w.technique);
    const ovr = Math.round(score * w.scale + w.base);
    return Math.min(99, Math.max(40, ovr));
}

// 建立一個處理過的球員物件
function createProcessedPlayer(playerData) {
    const newPlayer = { ...playerData };
    if (newPlayer.type === 'batter') {
        newPlayer.ovr = calculateBatterOVR(newPlayer.stats);
    } else if (newPlayer.type === 'pitcher') {
        newPlayer.ovr = calculatePitcherOVR(newPlayer.stats);
    }
    return newPlayer;
}

export function createPlayer(name, type, baseStats = {}, careerStats = {}, teamId = null) {
    const p = { name, type, teamId };
    Object.assign(p, baseStats);

    if (type === 'batter') {
        p.careerAtBats = careerStats.careerAtBats || 0;
        p.careerHits = careerStats.careerHits || 0;
        p.careerHomeRuns = careerStats.careerHomeRuns || 0;
        p.careerRunsBattedIn = careerStats.careerRunsBattedIn || 0;
        p.atBats = 0;
        p.hits = 0;
        p.runsBattedIn = 0;
        p.gameHomeRuns = 0;
        p.atBatHistory = [];
        p.performanceString = '0-0';
    } else if (type === 'pitcher') {
        p.role = baseStats.role || 'Reliever'; // role 來自 baseStats
        p.maxStamina = baseStats.maxStamina ?? (p.role === 'Starter' ? 100 : p.role === 'Reliever' ? 60 : 40);
        p.careerOutsRecorded = careerStats.careerOutsRecorded || 0;
        p.careerRunsAllowed = careerStats.careerRunsAllowed || 0;
        p.careerStrikeouts = careerStats.careerStrikeouts || 0;
        p.careerWins = careerStats.careerWins || 0;
        p.careerLosses = careerStats.careerLosses || 0;
        p.currentStamina = p.maxStamina;
        p.gameStrikeouts = 0;
        p.gameOutsRecorded = 0;
        p.gameRunsAllowed = 0;
    }

    if (type === 'batter') p.ovr = calculateBatterOVR(p);
    else if (type === 'pitcher') p.ovr = calculatePitcherOVR(p);
    return p;
}


// 主要的隊伍準備函數
export function prepareTeamsData(awayTeamId, homeTeamId) {
    const structureTeam = (teamId) => {
        const baseTeam = getBaseTeamById(teamId);
        if (!baseTeam) return null;

        const processedBatters = baseTeam.batters.map(createProcessedPlayer);
        const processedPitchers = baseTeam.pitchers.map(createProcessedPlayer);
        // 戰術卡不需要處理，直接複製
        const actionCards = baseTeam.actionCards ? [...baseTeam.actionCards] : [];

        return {
            ...baseTeam,
            batters: processedBatters,
            pitchers: processedPitchers,
            actionCards: actionCards,
        };
    };

    return {
        away: structureTeam(awayTeamId),
        home: structureTeam(homeTeamId)
    };
}



export function getDefaultTeamIds() {
    const awayId = TEAMS.length > 0 ? TEAMS[0].id : "NYY"; // 預設為 NYY
    const homeId = TEAMS.length > 1 ? TEAMS[1].id : "LAD"; // 預設為 LAD
    return { awayTeamId: awayId, homeTeamId: homeId };
}