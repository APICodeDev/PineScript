const BINANCE_BASE = 'https://api.binance.com/api/v3';
const BYBIT_BASE = 'https://api.bybit.com';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

async function tryMany(requests) {
  let lastErr;
  for (const req of requests) {
    try {
      return await req();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('No data source available');
}

function canUseProxy() {
  return window.location.protocol.startsWith('http');
}

export async function getSymbols() {
  const fromBinance = (data) =>
    data.symbols
      .filter((s) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
      .map((s) => ({ symbol: s.symbol, baseAsset: s.baseAsset, source: 'binance' }));

  const fromBybit = (data) =>
    (data?.result?.list || [])
      .filter((s) => s.status === 'Trading' && s.quoteCoin === 'USDT')
      .map((s) => ({ symbol: s.symbol, baseAsset: s.baseCoin, source: 'bybit' }));

  return tryMany([
    async () => {
      if (!canUseProxy()) throw new Error('Proxy unavailable on file://');
      const data = await fetchJson('/api/proxy.php?action=symbols');
      return fromBinance(data);
    },
    async () => fromBinance(await fetchJson(`${BINANCE_BASE}/exchangeInfo`)),
    async () => fromBybit(await fetchJson(`${BYBIT_BASE}/v5/market/instruments-info?category=linear`)),
  ]);
}

export async function getKlines(symbol, interval = '5m', limit = 288) {
  const normalizeBinance = (data) =>
    data.map((k) => ({
      time: Math.floor(k[0] / 1000),
      open: +k[1],
      high: +k[2],
      low: +k[3],
      close: +k[4],
      volume: +k[5],
    }));

  const normalizeBybit = (data) =>
    (data?.result?.list || [])
      .map((k) => ({
        time: Math.floor(Number(k[0]) / 1000),
        open: +k[1],
        high: +k[2],
        low: +k[3],
        close: +k[4],
        volume: +k[5],
      }))
      .sort((a, b) => a.time - b.time);

  return tryMany([
    async () => {
      if (!canUseProxy()) throw new Error('Proxy unavailable on file://');
      const data = await fetchJson(`/api/proxy.php?action=klines&symbol=${symbol}&interval=${interval}&limit=${limit}`);
      return normalizeBinance(data);
    },
    async () => normalizeBinance(await fetchJson(`${BINANCE_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`)),
    async () => {
      const bybitInterval = interval === '5m' ? '5' : '15';
      const data = await fetchJson(`${BYBIT_BASE}/v5/market/kline?category=linear&symbol=${symbol}&interval=${bybitInterval}&limit=${limit}`);
      return normalizeBybit(data);
    },
  ]);
}

export async function getTicker24h(symbol) {
  const normalizeBybitTicker = (data) => {
    const t = data?.result?.list?.[0];
    if (!t) throw new Error('Ticker unavailable');
    return {
      symbol: t.symbol,
      lastPrice: t.lastPrice,
      priceChangePercent: (Number(t.price24hPcnt) * 100).toString(),
    };
  };

  return tryMany([
    async () => {
      if (!canUseProxy()) throw new Error('Proxy unavailable on file://');
      return fetchJson(`/api/proxy.php?action=ticker&symbol=${symbol}`);
    },
    async () => fetchJson(`${BINANCE_BASE}/ticker/24hr?symbol=${symbol}`),
    async () => normalizeBybitTicker(await fetchJson(`${BYBIT_BASE}/v5/market/tickers?category=linear&symbol=${symbol}`)),
  ]);
}
