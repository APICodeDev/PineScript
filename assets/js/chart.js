let chart;
let candleSeries;
let volumeSeries;
let targetLine;
let zoneLines = [];

export function initChart(container) {
  chart = LightweightCharts.createChart(container, {
    layout: { background: { color: '#0a1020' }, textColor: '#a6b2d3' },
    grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
    rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
    timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true, secondsVisible: false },
    crosshair: { mode: 1 },
  });

  candleSeries = chart.addCandlestickSeries({
    upColor: '#18d89c',
    downColor: '#ff5d76',
    wickUpColor: '#18d89c',
    wickDownColor: '#ff5d76',
    borderVisible: false,
  });

  volumeSeries = chart.addHistogramSeries({
    priceFormat: { type: 'volume' },
    priceScaleId: '',
    color: 'rgba(53, 208, 255, 0.35)',
  });
  volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

  window.addEventListener('resize', () => {
    chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
  });
  chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });

  return { chart, candleSeries };
}

export function renderCandles(candles) {
  candleSeries.setData(candles);
  volumeSeries.setData(
    candles.map((c) => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(22, 227, 160, 0.45)' : 'rgba(255, 93, 118, 0.45)',
    }))
  );
  chart.timeScale().fitContent();
}

export function drawLiquidityLines(zones, target) {
  zoneLines.forEach((l) => candleSeries.removePriceLine(l));
  zoneLines = [];
  if (targetLine) candleSeries.removePriceLine(targetLine);

  zones.slice(0, 16).forEach((z) => {
    const line = candleSeries.createPriceLine({
      price: z.price,
      color: z.side === 'upper' ? `rgba(255,140,66,${Math.min(0.85, z.strength / 115)})` : `rgba(53,208,255,${Math.min(0.85, z.strength / 115)})`,
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dotted,
      axisLabelVisible: false,
      title: `LQ ${z.strength.toFixed(0)}`,
    });
    zoneLines.push(line);
  });

  if (target) {
    targetLine = candleSeries.createPriceLine({
      price: target.price,
      color: '#ffe082',
      lineWidth: 2,
      axisLabelVisible: true,
      title: 'Probable liquidity target',
    });
  }
}

export function getChartRefs() {
  return { chart, candleSeries };
}
