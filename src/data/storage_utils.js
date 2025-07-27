// Add to src/data/storage_utils.js
export const PLAYER_STATS_KEY = 'playerStats';

export function loadData(key, defaultValue) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn('Failed to load data:', error);
    return defaultValue;
  }
}

export function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn('Failed to save data:', error);
    return false;
  }
}