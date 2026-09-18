import { calculateLotSize } from './calculator.js';
import { SUPPORTED_SYMBOLS, getInstrument } from './instruments.js';
import { getRates } from './rates.js';
import { loadSettings, saveSettings } from './storage.js';

const $ = (id) => document.getElementById(id);
const form = $('calculator-form');
const state = { ...loadSettings(), symbol: loadSettings().symbol || 'EURUSD', fixedRisk: loadSettings().fixedRisk || 800, accountCurrency: loadSettings().accountCurrency || 'USD', mode: loadSettings().mode || 'entry' };

function populateSymbols(filter = '') {
  const query = filter.trim().toUpperCase();
  const items = SUPPORTED_SYMBOLS.filter((symbol) => symbol.includes(query));
  $('symbol-results').innerHTML = items.map((symbol) => `<button type="button" data-symbol="${symbol}">${symbol}</button>`).join('') || '<span class="empty">No symbols found</span>';
}

function setMode(mode) {
  state.mode = mode; $('mode-entry').classList.toggle('active', mode === 'entry'); $('mode-pips').classList.toggle('active', mode === 'pips');
  $('entry-fields').hidden = mode !== 'entry'; $('pips-field').hidden = mode !== 'pips';
  calculate();
}

function selectedSymbol() { return state.symbol || 'EURUSD'; }

async function calculate() {
  const symbol = selectedSymbol(); const instrument = getInstrument(symbol); const risk = $('risk').value;
  const common = { symbol, risk, accountCurrency: $('account-currency').value };
  const input = state.mode === 'entry' ? { ...common, entry: $('entry').value, stopLoss: $('stop-loss').value } : { ...common, slPips: $('sl-pips').value };
  if (!risk || (state.mode === 'entry' && (!$('entry').value || !$('stop-loss').value)) || (state.mode === 'pips' && !$('sl-pips').value)) { renderEmpty(); return; }
  try {
    $('rate-source').textContent = 'Rates: loading…';
    const { rates, source } = await getRates(instrument.quoteCurrency, common.accountCurrency);
    const result = calculateLotSize({ ...input, rates }); result.rateSource = source;
    renderResult(result, instrument);
  } catch (error) { renderError(error.message); }
  saveSettings({ ...state, fixedRisk: $('risk').value, accountCurrency: $('account-currency').value });
}

function renderResult(result, instrument) {
  $('lot-size').textContent = result.lots.toFixed(2);
  $('fixed-risk-result').textContent = formatMoney(Number($('risk').value), result.accountCurrency);
  $('distance-result').textContent = `${result.displayDistance.toFixed(instrument.priceDistance ? 2 : 1)} ${instrument.priceDistance ? 'price' : 'pips'}`;
  $('actual-risk').textContent = formatMoney(result.actualRisk, result.accountCurrency);
  $('risk-per-lot').textContent = formatMoney(result.riskPerLot, result.accountCurrency);
  $('rate-source').textContent = `Rates: ${result.rateSource}`;
  $('result-card').classList.remove('error', 'muted');
}
function renderEmpty() { $('lot-size').textContent = '—'; $('distance-result').textContent = '—'; $('actual-risk').textContent = '—'; $('risk-per-lot').textContent = '—'; $('rate-source').textContent = 'Enter values to calculate'; }
function renderError(message) { renderEmpty(); $('rate-source').textContent = message; $('result-card').classList.add('error'); }
function formatMoney(value, currency) { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value); }
function updateCurrencyPrefix() { $('currency-prefix').textContent = new Intl.NumberFormat(undefined, { style: 'currency', currency: $('account-currency').value, maximumFractionDigits: 0 }).formatToParts(0).find((part) => part.type === 'currency')?.value || $('account-currency').value; }

$('symbol-search').addEventListener('input', (event) => { populateSymbols(event.target.value); $('symbol-results').hidden = false; });
$('symbol-results').addEventListener('click', (event) => { const symbol = event.target.dataset.symbol; if (!symbol) return; state.symbol = symbol; $('symbol-search').value = symbol; $('symbol-results').hidden = true; calculate(); });
document.addEventListener('click', (event) => { if (!event.target.closest('.symbol-picker')) $('symbol-results').hidden = true; });
document.querySelectorAll('input, select').forEach((element) => element.addEventListener('input', calculate));
$('account-currency').addEventListener('change', updateCurrencyPrefix);
$('mode-entry').addEventListener('click', () => setMode('entry')); $('mode-pips').addEventListener('click', () => setMode('pips'));

$('symbol-search').value = state.symbol; $('risk').value = state.fixedRisk; $('account-currency').value = state.accountCurrency; updateCurrencyPrefix(); populateSymbols(); setMode(state.mode);
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
