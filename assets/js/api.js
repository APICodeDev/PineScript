const BINANCE_BASE = 'https://api.binance.com/api/v3';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function getSymbols() {
  const data = await fetchJson(`${BINANCE_BASE}/exchangeInfo`);
  return data.symbols
    .filter((s) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
    .map((s) => ({ symbol: s.symbol, baseAsset: s.baseAsset }));
}

export async function getKlines(symbol, interval = '5m', limit = 288) {
  const data = await fetchJson(`${BINANCE_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  return data.map((k) => ({
    time: Math.floor(k[0] / 1000),
    open: +k[1],
    high: +k[2],
    low: +k[3],
    close: +k[4],
    volume: +k[5],
  }));
}

export async function getTicker24h(symbol) {
  return fetchJson(`${BINANCE_BASE}/ticker/24hr?symbol=${symbol}`);
}
