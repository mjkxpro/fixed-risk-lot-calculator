import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLotSize, convertCurrency, floorToStep } from '../src/calculator.js';

// These are intentionally independent reference calculations. Expected lots are
// derived here from the stated contract/pip formulas, not from calculator.js.
const RATES = {
  EURUSD: 1.2,
  GBPUSD: 1.3,
  USDJPY: 150,
  USDCHF: 0.8,
  USDCAD: 1.35,
  AUDUSD: 0.65,
  NZDUSD: 0.6
};

const floorHundredth = (value) => Math.floor((value + 1e-12) * 100) / 100;
const refForex = ({ risk, pips, quotePipValue, quoteToUsd }) => {
  const riskPerLot = pips * quotePipValue * quoteToUsd;
  const rawLots = risk / riskPerLot;
  return { riskPerLot, rawLots, lots: floorHundredth(rawLots), actualRisk: floorHundredth(rawLots) * riskPerLot };
};

test('audit reference: EURUSD is 1.60 lots at 50 pips', () => {
  const expected = refForex({ risk: 800, pips: 50, quotePipValue: 10, quoteToUsd: 1 });
  const actual = calculateLotSize({ symbol: 'EURUSD', risk: 800, entry: 1.18, stopLoss: 1.175, rates: RATES });
  assert.equal(expected.lots, 1.6); assert.equal(actual.lots, expected.lots);
  assert.ok(Math.abs(actual.riskPerLot - expected.riskPerLot) < 1e-10);
  assert.ok(Math.abs(actual.actualRisk - expected.actualRisk) < 1e-10);
});

test('audit reference: USDJPY uses JPY to USD division', () => {
  const expected = refForex({ risk: 800, pips: 100, quotePipValue: 1000, quoteToUsd: 1 / 150 });
  const actual = calculateLotSize({ symbol: 'USDJPY', risk: 800, entry: 150, stopLoss: 149, rates: RATES });
  assert.equal(expected.lots, 1.2); assert.equal(actual.lots, expected.lots);
  assert.ok(Math.abs(actual.riskPerLot - 666.6666666666666) < 1e-9);
});

test('audit reference: GBPJPY is 2.06 lots and not 2.07', () => {
  const expected = refForex({ risk: 800, pips: 58, quotePipValue: 1000, quoteToUsd: 1 / 150 });
  const actual = calculateLotSize({ symbol: 'GBPJPY', risk: 800, entry: 201.85, stopLoss: 202.43, rates: RATES });
  assert.equal(expected.lots, 2.06); assert.equal(actual.lots, expected.lots);
  assert.ok(Math.abs(actual.actualRisk - 796.5333333333333) < 1e-8);
  assert.ok(actual.lots <= expected.rawLots && actual.actualRisk <= 800 + 1e-10);
});

test('audit reference: EURGBP converts GBP to USD by multiplication', () => {
  const expected = refForex({ risk: 800, pips: 50, quotePipValue: 10, quoteToUsd: 1.3 });
  const actual = calculateLotSize({ symbol: 'EURGBP', risk: 800, entry: 0.86, stopLoss: 0.855, rates: RATES });
  assert.equal(expected.lots, 1.23); assert.equal(actual.lots, expected.lots);
  assert.ok(Math.abs(actual.actualRisk - 799.5) < 1e-10);
});

test('audit reference: AUDCAD converts CAD to USD by dividing USDCAD', () => {
  const expected = refForex({ risk: 800, pips: 50, quotePipValue: 10, quoteToUsd: 1 / 1.35 });
  const actual = calculateLotSize({ symbol: 'AUDCAD', risk: 800, slPips: 50, rates: RATES });
  assert.ok(Math.abs(expected.riskPerLot - 370.3703703703703) < 1e-10);
  assert.equal(expected.lots, 2.16); assert.equal(actual.lots, expected.lots);
});

test('audit reference: NZDCHF converts CHF to USD by dividing USDCHF', () => {
  const expected = refForex({ risk: 800, pips: 40, quotePipValue: 10, quoteToUsd: 1 / 0.8 });
  const actual = calculateLotSize({ symbol: 'NZDCHF', risk: 800, slPips: 40, rates: RATES });
  assert.equal(expected.riskPerLot, 500); assert.equal(expected.lots, 1.6); assert.equal(actual.lots, expected.lots);
});

test('audit reference: metals use price distance times their configured contract size', () => {
  const gold = calculateLotSize({ symbol: 'XAUUSD', risk: 800, entry: 3650, stopLoss: 3640, rates: RATES });
  const goldSmall = calculateLotSize({ symbol: 'XAUUSD', risk: 800, entry: 3650, stopLoss: 3647.5, rates: RATES });
  const silver = calculateLotSize({ symbol: 'XAGUSD', risk: 800, entry: 30, stopLoss: 29.75, rates: RATES });
  assert.equal(gold.lots, Math.floor((800 / (10 * 100)) * 100) / 100);
  assert.equal(goldSmall.lots, Math.floor((800 / (2.5 * 100)) * 100) / 100);
  assert.equal(silver.lots, Math.floor((800 / (0.25 * 5000)) * 100) / 100);
});

test('audit: entry direction reversal and SL-pips mode are equivalent', () => {
  const forward = calculateLotSize({ symbol: 'EURUSD', risk: 800, entry: 1.18, stopLoss: 1.175, rates: RATES });
  const reverse = calculateLotSize({ symbol: 'EURUSD', risk: 800, entry: 1.175, stopLoss: 1.18, rates: RATES });
  const pips = calculateLotSize({ symbol: 'EURUSD', risk: 800, slPips: 50, rates: RATES });
  assert.deepEqual([reverse.displayDistance, reverse.lots, reverse.riskPerLot], [forward.displayDistance, forward.lots, forward.riskPerLot]);
  assert.deepEqual([pips.displayDistance, pips.lots, pips.riskPerLot], [forward.displayDistance, forward.lots, forward.riskPerLot]);
});

test('audit: direct, inverse, and cross conversion directions', () => {
  assert.equal(convertCurrency(10, 'GBP', 'USD', { GBPUSD: 1.3 }), 13);
  assert.equal(convertCurrency(13, 'USD', 'GBP', { GBPUSD: 1.3 }), 10);
  assert.equal(convertCurrency(1000, 'JPY', 'USD', { USDJPY: 150 }), 1000 / 150);
  assert.equal(convertCurrency(10, 'CAD', 'USD', { USDCAD: 1.35 }), 10 / 1.35);
  assert.ok(Math.abs(convertCurrency(10, 'GBP', 'USD', { GBPJPY: 180, USDJPY: 150 }) - (10 * 180 / 150)) < 1e-12);
});

test('audit: volume floor boundaries never round upward', () => {
  for (const [input, expected] of [[1.239, 1.23], [1.231, 1.23], [1.23, 1.23], [0.019, 0.01], [0.01, 0.01], [0.009, 0]]) {
    assert.equal(floorToStep(input, 0.01), expected);
  }
});

test('audit: valid-input invariants hold over deterministic cases', () => {
  const distances = [5, 10, 25, 50, 100];
  const risks = [100, 800, 2500, 10_000];
  for (const risk of risks) for (const pips of distances) {
    const result = calculateLotSize({ symbol: 'GBPJPY', risk, slPips: pips, rates: RATES });
    assert.ok(result.lots >= 0 && Number.isFinite(result.lots));
    assert.ok(result.actualRisk >= 0 && result.actualRisk <= risk + 1e-9);
  }
  const byRisk = risks.map((risk) => calculateLotSize({ symbol: 'EURUSD', risk, slPips: 50, rates: RATES }).lots);
  const byDistance = distances.map((pips) => calculateLotSize({ symbol: 'EURUSD', risk: 800, slPips: pips, rates: RATES }).lots);
  assert.deepEqual(byRisk, [0.2, 1.6, 5, 20]);
  for (let i = 1; i < byDistance.length; i += 1) assert.ok(byDistance[i] <= byDistance[i - 1]);
});

test('audit: invalid, empty, extreme, and missing-rate inputs fail safely', () => {
  const invalid = [
    { symbol: 'EURUSD', risk: 0, slPips: 10 },
    { symbol: 'EURUSD', risk: -1, slPips: 10 },
    { symbol: 'EURUSD', risk: 800, entry: 1, stopLoss: 1 },
    { symbol: 'EURUSD', risk: 800, slPips: 0 },
    { symbol: 'EURUSD', risk: 800, slPips: -1 },
    { symbol: 'EURUSD', risk: 'not-a-number', slPips: 10 },
    { symbol: 'EURUSD', risk: 800, slPips: Infinity },
    { symbol: 'NOPE', risk: 800, slPips: 10 }
  ];
  for (const input of invalid) assert.throws(() => calculateLotSize({ ...input, rates: RATES }));
  assert.throws(() => calculateLotSize({ symbol: 'GBPJPY', risk: 800, slPips: 10, rates: {} }));
  assert.throws(() => calculateLotSize({ symbol: 'EURUSD', risk: 800, rates: RATES }));
});
