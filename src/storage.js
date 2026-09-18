const STORAGE_KEY = 'fixed-risk-lot-calculator-settings';

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

export function saveSettings(settings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* private mode */ }
}

export function loadCachedRates() {
  const settings = loadSettings();
  return settings.cachedRates || {};
}

export function saveCachedRates(rates) {
  const settings = loadSettings();
  saveSettings({ ...settings, cachedRates: rates });
}
