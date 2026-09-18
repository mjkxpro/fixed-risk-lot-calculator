import { loadCachedRates, saveCachedRates } from './storage.js';

const FALLBACK_USD = { EUR: 1.10, GBP: 1.27, AUD: 0.67, NZD: 0.61, USD: 1, JPY: 150, CHF: 0.88, CAD: 1.36 };

function pairRate(from, to) {
  if (from === to) return 1;
  return FALLBACK_USD[to] / FALLBACK_USD[from];
}

export function fallbackRates(currencies = []) {
  const result = {};
  for (const from of currencies) for (const to of currencies) {
    if (from !== to && FALLBACK_USD[from] && FALLBACK_USD[to]) result[`${from}${to}`] = pairRate(from, to);
  }
  return result;
}

async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Rate API HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

export async function getRates(from, to) {
  const source = String(from).toUpperCase(); const target = String(to).toUpperCase();
  if (source === target) return { rates: {}, source: 'Live' };
  const pair = `${source}${target}`;
  const cached = loadCachedRates();
  try {
    const data = await fetchWithTimeout(`https://api.frankfurter.app/latest?from=${source}&to=${target}`);
    const rate = Number(data?.rates?.[target]);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid rate response');
    const next = { ...cached, [pair]: { rate, timestamp: Date.now() } };
    saveCachedRates(next);
    return { rates: { [pair]: rate }, source: 'Live' };
  } catch {
    const cachedEntry = cached[pair];
    if (Number.isFinite(cachedEntry?.rate) && cachedEntry.rate > 0) return { rates: { [pair]: cachedEntry.rate }, source: 'Cached' };
    return { rates: fallbackRates([source, target]), source: 'Fallback' };
  }
}
