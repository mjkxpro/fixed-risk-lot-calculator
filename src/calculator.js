import { getInstrument } from './instruments.js';

export function floorToStep(value, step) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return NaN;
  const decimals = Math.max(0, (String(step).split('.')[1] || '').length);
  const result = Math.floor((value + Number.EPSILON) / step) * step;
  return Number(result.toFixed(decimals));
}

function assertPositive(name, value) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be greater than zero`);
}

function normalizeRates(rates = {}) {
  return Object.fromEntries(Object.entries(rates).map(([key, value]) => [key.toUpperCase(), Number(value)]));
}

/** Convert a currency using direct or inverse pair rates, with a small graph search. */
export function convertCurrency(amount, from, to, rates = {}) {
  assertPositive('Amount', amount);
  const source = String(from).toUpperCase();
  const target = String(to).toUpperCase();
  if (source === target) return amount;
  const normalized = normalizeRates(rates);
  const graph = new Map();
  for (const [pair, rawRate] of Object.entries(normalized)) {
    const rate = Number(rawRate);
    if (!/^[A-Z]{6}$/.test(pair) || !Number.isFinite(rate) || rate <= 0) continue;
    const base = pair.slice(0, 3); const quote = pair.slice(3);
    if (!graph.has(base)) graph.set(base, []);
    if (!graph.has(quote)) graph.set(quote, []);
    graph.get(base).push([quote, rate]);
    graph.get(quote).push([base, 1 / rate]);
  }
  const queue = [[source, 1]]; const visited = new Set([source]);
  while (queue.length) {
    const [currency, factor] = queue.shift();
    for (const [next, edgeRate] of graph.get(currency) || []) {
      const nextFactor = factor * edgeRate;
      if (next === target) return amount * nextFactor;
      if (!visited.has(next)) { visited.add(next); queue.push([next, nextFactor]); }
    }
  }
  throw new Error(`Missing conversion rate: ${source} to ${target}`);
}

function roundDistance(instrument, distance) {
  const value = instrument.priceDistance ? distance : distance / instrument.pipSize;
  return Number(value.toFixed(8));
}

/**
 * Calculate a conservative lot size. FX risk is derived from pip value;
 * metals use price distance multiplied by contract size.
 */
export function calculateLotSize({ symbol, risk, entry, stopLoss, slPips, accountCurrency = 'USD', rates = {} }) {
  const instrument = getInstrument(symbol);
  const fixedRisk = Number(risk);
  assertPositive('Fixed risk', fixedRisk);
  const hasEntryStop = entry !== undefined && entry !== '' && stopLoss !== undefined && stopLoss !== '';
  const hasPips = slPips !== undefined && slPips !== '';
  if (hasEntryStop === hasPips) throw new Error('Provide either entry/stop loss or SL distance');

  let rawDistance = hasEntryStop ? Math.abs(Number(entry) - Number(stopLoss)) : Number(slPips);
  assertPositive('Stop loss distance', rawDistance);
  if (!hasEntryStop && !instrument.priceDistance) rawDistance *= instrument.pipSize;
  const displayDistance = roundDistance(instrument, rawDistance);
  const account = String(accountCurrency).toUpperCase();
  const pipValueInQuote = instrument.type === 'forex' ? instrument.pipSize * instrument.contractSize : instrument.contractSize;
  const pipValueInAccount = convertCurrency(pipValueInQuote, instrument.quoteCurrency, account, rates);
  const riskPerLot = instrument.priceDistance
    ? rawDistance * pipValueInAccount
    : displayDistance * pipValueInAccount;
  assertPositive('Risk per lot', riskPerLot);
  const unroundedLots = fixedRisk / riskPerLot;
  const lots = floorToStep(unroundedLots, instrument.lotStep);
  if (!Number.isFinite(lots) || lots < instrument.minLot) {
    return { symbol: instrument.symbol, lots: 0, unroundedLots, riskPerLot, actualRisk: 0, displayDistance, accountCurrency: account, rateSource: 'provided' };
  }
  return {
    symbol: instrument.symbol,
    lots: Math.min(lots, instrument.maxLot),
    unroundedLots,
    riskPerLot,
    actualRisk: Math.min(lots, instrument.maxLot) * riskPerLot,
    displayDistance,
    accountCurrency: account,
    rateSource: 'provided'
  };
}
