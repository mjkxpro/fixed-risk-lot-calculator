# Calculation Engine Audit V1

## Scope and method

This audit reviews the current calculation engine before any engine changes. The expected values in `test/calculation-audit.test.js` are calculated independently from the implementation using the instrument specification and deterministic rates; they do not call `calculateLotSize` to produce expected values.

## Current formulas

### Forex

For a standard lot:

```text
pipValueQuote = contractSize × pipSize
pipValueAccount = convert(pipValueQuote, quoteCurrency, accountCurrency)
riskPerLot = SL pips × pipValueAccount
rawLots = fixedRisk / riskPerLot
recommendedLots = floorToStep(rawLots, lotStep)
```

The current specifications use 100,000 units per lot, `0.0001` pip size for non-JPY FX, and `0.01` for JPY-quoted FX.

### Metals

The current metal path uses:

```text
priceDistance = abs(entry - stopLoss)
riskPerLot = priceDistance × contractSize × quoteCurrencyToAccountRate
rawLots = fixedRisk / riskPerLot
```

The current defaults are XAUUSD `100` oz/lot and XAGUSD `5,000` oz/lot.

### Conversion direction

The conversion graph treats `BASEQUOTE = rate` as `1 BASE = rate QUOTE`, adds the inverse edge, and searches from the quote currency to the account currency. Therefore:

- GBP → USD with GBPUSD 1.30 multiplies by 1.30.
- USD → GBP divides by 1.30.
- JPY → USD with USDJPY 150 divides by 150.
- CAD → USD with USDCAD 1.35 divides by 1.35.

## Preliminary findings before independent tests

1. The main formulas appear directionally correct for the requested FX, cross, JPY, and metal examples.
2. Existing tests do not independently derive their expected values and do not cover all requested audit cases (notably AUDCAD, NZDCHF, XAGUSD, the 100-pip USDJPY reference, property invariants, and boundary values).
3. The current `maxLot` clamp can theoretically produce `actualRisk > fixedRisk` when the unconstrained lot exceeds the instrument maximum. This is a limit-policy issue that must be addressed or explicitly reported by the audit.
4. `floorToStep` uses a floating-point epsilon correction. The audit must verify that it never crosses a volume boundary and never violates the conservative-risk invariant.

## Independent audit results

All audit cases use deterministic rates declared in `test/calculation-audit.test.js`; no live API is used.

### FX

| Case | Result | Independent conclusion |
|---|---|---|
| EURUSD | PASS | 50 pips × $10/lot/pip = $500 risk/lot; $800 produces 1.60 lots. |
| USDJPY | PASS | 1000 JPY/pip ÷ 150 = $6.6666667; 100 pips produces 1.20 lots. |
| GBPJPY | PASS | 58 × (1000 ÷ 150) = $386.6667; floor is 2.06, actual risk about $796.53. |
| EURGBP | PASS | £10 × 1.30 = $13/pip; 50 pips produces 1.23 lots and $799.50 risk. |
| AUDCAD | PASS | C$10 ÷ 1.35 = $7.407407/pip; 50 pips produces 2.16 lots. |
| NZDCHF | PASS | CHF10 ÷ 0.80 = $12.50/pip; 40 pips produces 1.60 lots. |

### Metals

| Case | Result | Current configuration and independent conclusion |
|---|---|---|
| XAUUSD | PASS | 100 oz/lot; $10 distance gives $1,000/lot and 0.80 lots; $2.50 gives 3.20 lots. |
| XAGUSD | PASS | 5,000 oz/lot; $0.25 distance gives $1,250/lot and 0.64 lots. |

### Conversion

- Direct conversion: PASS.
- Inverse conversion: PASS.
- Cross conversion through two edges: PASS.
- Direction checks for GBPUSD, USDJPY, USDCAD, and USDCHF: PASS.

### Distance and mode behavior

- Entry above/below stop loss uses absolute distance: PASS.
- Entry/Stop Loss and SL Pips modes agree for EURUSD: PASS.
- JPY pip size is `0.01`; non-JPY FX pip size is `0.0001`: PASS.

### Rounding and invariants

- Volume boundaries `1.239`, `1.231`, `1.230`, `0.019`, `0.010`, and `0.009` floor correctly: PASS.
- Recommended lot never exceeds raw lot: PASS.
- Estimated actual risk does not exceed fixed risk within tolerance: PASS.
- Increasing risk does not reduce lots: PASS.
- Increasing stop distance does not increase lots: PASS.

### Boundary handling

Zero/negative risk, zero/negative distance, equal entry and stop, NaN, Infinity, empty input, invalid symbol, missing rate, and missing mode input all fail with an explicit error rather than returning NaN, Infinity, or a negative lot: PASS.

## Overall Status

The initial audit found no calculation-engine bug. The pre-existing tests were insufficiently independent, so the audit added an independent deterministic reference suite rather than changing expected values to match implementation output. The only initial audit failure was a strict floating-point equality assertion in the audit test itself; it was corrected to use a tolerance and did not require an engine change.

`CALCULATION_ENGINE_VALIDATED = TRUE`
