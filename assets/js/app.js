import { getSymbols, getKlines, getTicker24h } from './api.js';
import { initChart, renderCandles, drawLiquidityLines, getChartRefs } from './chart.js';
import { computeLiquidityZones } from './liquidity.js';
import { buildAnalysisPanel, showSuggestions, setLoading, showToast } from './ui.js';

const state = {
  symbols: [],
  symbol: 'BTCUSDT',
  candles: [],
  ticker: null,
  zones: [],
  target: null,
  refreshHandle: null,
};

function formatPrice(v) {
  if (!Number.isFinite(v)) return '-';
  if (v >= 1000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 5 })}`;
}

function updateHeatmapCanvas(zones) {
  const canvas = document.getElementById('heatmapCanvas');
  const { candleSeries } = getChartRefs();
  if (!candleSeries) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  zones.slice(0, 20).forEach((z) => {
    const y = candleSeries.priceToCoordinate(z.price);
    if (!Number.isFinite(y)) return;
    const band = 8 + (z.strength / 100) * 18;
    const grad = ctx.createLinearGradient(0, y - band, rect.width, y + band);
    if (z.side === 'upper') {
      grad.addColorStop(0, 'rgba(255, 140, 66, 0)');
      grad.addColorStop(0.5, `rgba(255, 140, 66, ${Math.min(0.32, z.strength / 260)})`);
      grad.addColorStop(1, 'rgba(255, 140, 66, 0)');
    } else {
      grad.addColorStop(0, 'rgba(53, 208, 255, 0)');
      grad.addColorStop(0.5, `rgba(53, 208, 255, ${Math.min(0.32, z.strength / 260)})`);
      grad.addColorStop(1, 'rgba(53, 208, 255, 0)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, y - band, rect.width, band * 2);
  });
  canvas.classList.add('visible');
}

function updateAnalysis() {
  const current = state.candles[state.candles.length - 1]?.close || 0;
  const change = Number(state.ticker?.priceChangePercent || 0);
  const trendStrength = `${Math.abs(change).toFixed(2)}%`;
  const up = state.zones.filter((z) => z.side === 'upper').sort((a, b) => a.price - b.price)[0];
  const down = state.zones
    .filter((z) => z.side === 'lower')
    .sort((a, b) => b.price - a.price)[0];

  const bias =
    state.target?.side === 'upper' ? 'bullish liquidity sweep' : state.target?.side === 'lower' ? 'bearish liquidity sweep' : 'neutral';

  buildAnalysisPanel(document.getElementById('analysisGrid'), {
    symbol: state.symbol,
    price: formatPrice(current),
    change24: `${change.toFixed(2)}%`,
    trend: state.target ? state.target.side.toUpperCase() : 'NEUTRAL',
    trendStrength,
    bias,
    target: state.target ? `${formatPrice(state.target.price)} (${state.target.strength.toFixed(1)})` : '-',
    nearestUp: up ? formatPrice(up.price) : '-',
    nearestDown: down ? formatPrice(down.price) : '-',
    updatedAt: new Date().toLocaleTimeString(),
  });

  const why = state.target
    ? `Objetivo seleccionado: <strong>${formatPrice(state.target.price)}</strong>. Score ${state.target.strength.toFixed(
        1
      )} por combinación de cercanía al precio, reacciones históricas, volumen relativo y sesgo tendencial.`
    : 'Sin target suficiente.';
  document.getElementById('targetExplanation').innerHTML = why;
}

async function loadSymbol(symbol) {
  state.symbol = symbol.toUpperCase();
  document.getElementById('chartTitle').textContent = `${state.symbol} · 24h`;
  document.getElementById('chartSubtitle').textContent = 'Actualizando datos de velas y liquidez...';
  document.getElementById('statusBadge').textContent = 'Syncing';
  setLoading(true);

  try {
    const [candles, ticker] = await Promise.all([getKlines(state.symbol), getTicker24h(state.symbol)]);
    state.candles = candles;
    state.ticker = ticker;
    renderCandles(candles);

    const liq = computeLiquidityZones(candles, Number(ticker.priceChangePercent));
    state.zones = liq.zones;
    state.target = liq.target;

    drawLiquidityLines(liq.zones, liq.target);
    updateHeatmapCanvas(liq.zones);
    updateAnalysis();

    document.getElementById('chartSubtitle').textContent = `Último precio: ${formatPrice(candles[candles.length - 1].close)}`;
    document.getElementById('statusBadge').textContent = 'Live';
  } catch (err) {
    console.error(err);
    showToast(`Error cargando ${state.symbol}. Revisa símbolo o conexión.`);
    document.getElementById('statusBadge').textContent = 'Error';
  } finally {
    setLoading(false);
  }
}

function attachEvents() {
  const search = document.getElementById('symbolSearch');
  const suggestions = document.getElementById('suggestions');

  search.addEventListener('input', () => {
    const q = search.value.trim().toUpperCase();
    if (!q) return showSuggestions(suggestions, [], () => {});
    const filtered = state.symbols.filter((s) => s.symbol.includes(q) || s.baseAsset.includes(q));
    showSuggestions(suggestions, filtered, (symbol) => {
      search.value = symbol;
      suggestions.classList.add('hidden');
      loadSymbol(symbol);
    });
  });

  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const symbol = search.value.trim().toUpperCase();
      if (symbol) loadSymbol(symbol);
      suggestions.classList.add('hidden');
    }
  });

  document.getElementById('refreshBtn').addEventListener('click', () => loadSymbol(state.symbol));
  window.addEventListener('resize', () => updateHeatmapCanvas(state.zones));
  setInterval(() => updateHeatmapCanvas(state.zones), 3000);
}

async function bootstrap() {
  initChart(document.getElementById('chartContainer'));
  attachEvents();
  try {
    state.symbols = await getSymbols();
  } catch (e) {
    showToast('No se pudieron cargar símbolos desde Binance.');
  }
  await loadSymbol(state.symbol);

  if (state.refreshHandle) clearInterval(state.refreshHandle);
  state.refreshHandle = setInterval(() => loadSymbol(state.symbol), 30000);
}

bootstrap();
