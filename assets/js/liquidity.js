function sma(values, period) {
  if (values.length < period) return values[values.length - 1] || 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function detectSwings(candles, left = 2, right = 2) {
  const swings = [];
  for (let i = left; i < candles.length - right; i += 1) {
    const c = candles[i];
    let highPivot = true;
    let lowPivot = true;
    for (let j = i - left; j <= i + right; j += 1) {
      if (j === i) continue;
      if (candles[j].high >= c.high) highPivot = false;
      if (candles[j].low <= c.low) lowPivot = false;
    }
    if (highPivot) swings.push({ type: 'high', price: c.high, index: i, time: c.time });
    if (lowPivot) swings.push({ type: 'low', price: c.low, index: i, time: c.time });
  }
  return swings;
}

function clusterLevels(levels, thresholdPct = 0.0018) {
  const clusters = [];
  levels.forEach((lvl) => {
    const found = clusters.find((c) => Math.abs(c.price - lvl.price) / lvl.price <= thresholdPct && c.type === lvl.type);
    if (!found) {
      clusters.push({ ...lvl, hits: 1, sum: lvl.price, volumeScore: lvl.volumeScore || 0 });
    } else {
      found.hits += 1;
      found.sum += lvl.price;
      found.price = found.sum / found.hits;
      found.volumeScore += lvl.volumeScore || 0;
    }
  });
  return clusters;
}

// Aproximación de "liquidez" con datos gratuitos:
// 1) pivotes (swing highs/lows) + mechas repetidas
// 2) permanencia del precio en bandas (consolidación)
// 3) volumen relativo en velas cercanas al nivel
// 4) scoring con cercanía al precio + sesgo tendencial
export function computeLiquidityZones(candles, tickerChangePct) {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const current = closes[closes.length - 1];
  const avgVol = sma(volumes, Math.min(80, volumes.length));
  const swings = detectSwings(candles);

  const rawLevels = swings.map((s) => {
    const c = candles[s.index];
    const wick = s.type === 'high' ? c.high - Math.max(c.close, c.open) : Math.min(c.close, c.open) - c.low;
    const range = c.high - c.low || 1;
    const wickScore = Math.max(0, wick / range);
    const volumeScore = c.volume / (avgVol || 1);
    return { type: s.type, price: s.price, wickScore, volumeScore, index: s.index };
  });

  const clustered = clusterLevels(rawLevels);
  const trend = tickerChangePct > 1 ? 'bullish' : tickerChangePct < -1 ? 'bearish' : 'neutral';

  const zones = clustered.map((z) => {
    const distPct = Math.abs(z.price - current) / current;
    const proximityScore = Math.max(0, 1 - distPct * 12);
    const reactionScore = Math.min(1, z.hits / 4);
    const volScore = Math.min(1, z.volumeScore / Math.max(1, z.hits) / 2);
    const side = z.price > current ? 'upper' : 'lower';
    const trendBias =
      trend === 'bullish' ? (side === 'upper' ? 1 : 0.8) : trend === 'bearish' ? (side === 'lower' ? 1 : 0.8) : 0.9;

    const strength = (proximityScore * 0.33 + reactionScore * 0.30 + volScore * 0.22 + trendBias * 0.15) * 100;

    return {
      price: z.price,
      side,
      type: z.type,
      hits: z.hits,
      strength,
      proximityScore,
      reactionScore,
      volScore,
      trendBias,
    };
  });

  const upperZones = zones.filter((z) => z.side === 'upper').sort((a, b) => b.strength - a.strength);
  const lowerZones = zones.filter((z) => z.side === 'lower').sort((a, b) => b.strength - a.strength);

  const imbalance = (upperZones[0]?.strength || 0) - (lowerZones[0]?.strength || 0);
  const preferredSide = trend === 'bullish' ? 'upper' : trend === 'bearish' ? 'lower' : imbalance >= 0 ? 'upper' : 'lower';

  const target = [...zones]
    .filter((z) => z.side === preferredSide)
    .sort((a, b) => b.strength - a.strength)[0] || [...zones].sort((a, b) => b.strength - a.strength)[0];

  return {
    zones: zones.sort((a, b) => b.strength - a.strength),
    target,
    trend,
    imbalance,
  };
}
