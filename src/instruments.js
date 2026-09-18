const FX_SYMBOLS = [
  'EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDJPY', 'USDCHF', 'USDCAD',
  'EURJPY', 'EURGBP', 'EURCHF', 'EURAUD', 'EURCAD', 'EURNZD',
  'GBPJPY', 'GBPCHF', 'GBPAUD', 'GBPCAD', 'GBPNZD',
  'AUDJPY', 'AUDCHF', 'AUDCAD', 'AUDNZD',
  'NZDJPY', 'NZDCHF', 'NZDCAD', 'CADJPY', 'CADCHF', 'CHFJPY'
];

export const INSTRUMENTS = Object.fromEntries([
  ...FX_SYMBOLS.map((symbol) => [symbol, {
    symbol,
    type: 'forex',
    baseCurrency: symbol.slice(0, 3),
    quoteCurrency: symbol.slice(3),
    contractSize: 100_000,
    pipSize: symbol.endsWith('JPY') ? 0.01 : 0.0001,
    lotStep: 0.01,
    minLot: 0.01,
    maxLot: 1_000
  }]),
  ['XAUUSD', {
    symbol: 'XAUUSD', type: 'metal', baseCurrency: 'XAU', quoteCurrency: 'USD',
    contractSize: 100, pipSize: 0.01, lotStep: 0.01, minLot: 0.01, maxLot: 1_000,
    priceDistance: true
  }],
  ['XAGUSD', {
    symbol: 'XAGUSD', type: 'metal', baseCurrency: 'XAG', quoteCurrency: 'USD',
    contractSize: 5_000, pipSize: 0.01, lotStep: 0.01, minLot: 0.01, maxLot: 1_000,
    priceDistance: true
  }]
]);

export function getInstrument(symbol) {
  const normalized = String(symbol ?? '').trim().toUpperCase();
  const instrument = INSTRUMENTS[normalized];
  if (!instrument) throw new Error(`Unsupported symbol: ${normalized || '(empty)'}`);
  return instrument;
}

export function getPipSize(symbol) {
  return getInstrument(symbol).pipSize;
}

export const SUPPORTED_SYMBOLS = Object.keys(INSTRUMENTS);
