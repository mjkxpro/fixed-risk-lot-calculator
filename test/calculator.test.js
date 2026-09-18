import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLotSize, convertCurrency, floorToStep } from '../src/calculator.js';

const USD_RATES = { USDJPY: 150, GBPUSD: 1.25, EURUSD: 1.10, USDCHF: 0.90, USDCAD: 1.35, AUDUSD: 0.67, NZDUSD: 0.61 };

test('EURUSD uses standard USD pip value', () => {
  const result = calculateLotSize({ symbol: 'EURUSD', risk: 800, entry: 1.18, stopLoss: 1.175, rates: USD_RATES });
  assert.equal(result.displayDistance, 50);
  assert.equal(result.lots, 1.6);
  assert.equal(result.actualRisk, 800);
});

test('Entry above or below stop loss gives the same absolute distance', () => {
  const a = calculateLotSize({ symbol: 'GBPUSD', risk: 800, entry: 1.18, stopLoss: 1.175, rates: USD_RATES });
  const b = calculateLotSize({ symbol: 'GBPUSD', risk: 800, entry: 1.175, stopLoss: 1.18, rates: USD_RATES });
  assert.equal(a.lots, b.lots);
});

test('JPY pairs use 0.01 pip size and convert JPY to USD', () => {
  const result = calculateLotSize({ symbol: 'USDJPY', risk: 800, entry: 150, stopLoss: 149.5, rates: USD_RATES });
  assert.equal(result.displayDistance, 50);
  assert.ok(Math.abs(result.riskPerLot - 333.3333333333333) < 1e-10);
  assert.equal(result.lots, 2.4);
});

test('crosses convert quote currency through a currency graph', () => {
  const result = calculateLotSize({ symbol: 'GBPJPY', risk: 800, entry: 201.85, stopLoss: 202.43, rates: USD_RATES });
  assert.equal(result.displayDistance, 58);
  assert.equal(result.lots, 2.06);
  assert.ok(result.actualRisk <= 800);
});

test('EURGBP converts GBP to USD', () => {
  const result = calculateLotSize({ symbol: 'EURGBP', risk: 800, slPips: 40, rates: USD_RATES });
  assert.equal(result.lots, 1.6);
});

test('metals use their own contract sizes', () => {
  const result = calculateLotSize({ symbol: 'XAUUSD', risk: 800, entry: 3650, stopLoss: 3640, rates: USD_RATES });
  assert.equal(result.lots, 0.8);
  assert.equal(result.displayDistance, 10);
  assert.equal(result.riskPerLot, 1000);
});

test('rounding floors so estimated risk never exceeds fixed risk', () => {
  assert.equal(floorToStep(1.637, 0.01), 1.63);
  const result = calculateLotSize({ symbol: 'EURUSD', risk: 817, slPips: 50, rates: USD_RATES });
  assert.equal(result.lots, 1.63);
  assert.ok(result.actualRisk <= 817);
});

test('conversion supports inverse rates', () => {
  assert.equal(convertCurrency(100, 'USD', 'EUR', { EURUSD: 1.1 }), 100 / 1.1);
});

test('invalid, zero, and missing-rate inputs fail safely', () => {
  assert.throws(() => calculateLotSize({ symbol: 'EURUSD', risk: 800, entry: 1, stopLoss: 1, rates: USD_RATES }));
  assert.throws(() => calculateLotSize({ symbol: 'GBPJPY', risk: 800, slPips: 40, rates: {} }));
  assert.throws(() => calculateLotSize({ symbol: 'EURUSD', risk: 0, slPips: 40, rates: USD_RATES }));
});
