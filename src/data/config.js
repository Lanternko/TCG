export const CONFIG = {
  innings: 9,
  handSize: 5,
  scoring: { homeRun: 10, triple: 3, double: 2, single: 1 },
  norm: {
    pitcherPowerSO: 0.0025,
    velocitySO: 0.002,
    velocityHit: -0.0015,
    techHR: -0.0013,
    controlBB: -0.0023,
    pitcherPowerHR: -0.0002,
    batterContactSO: -0.0033,
    batterPowerHR: 0.0017,
    batterHitRate: 0.0022,
  },
  // --- 新增 ---
  ovrWeights: {
    batter: { power: 0.3, hitRate: 0.3, contact: 0.2, speed: 0.2, scale: 1.5, base: 25 },
    pitcher: { power: 0.3, velocity: 0.3, control: 0.2, technique: 0.2, staminaEffect: 0.5, scale: 1.5, base: 25 }
  }
};
