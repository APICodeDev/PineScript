# Liquidity Heatmap Analyzer (free-data edition)

Aplicación web (frontend puro) para análisis de liquidez aproximada en cripto usando **APIs públicas de Binance** y visualización con **Lightweight Charts**.

## Estructura

- `index.html`
- `assets/css/styles.css`
- `assets/js/app.js`
- `assets/js/chart.js`
- `assets/js/liquidity.js`
- `assets/js/api.js`
- `assets/js/ui.js`

## Ejecución local

Opción rápida con PHP embebido:

```bash
php -S localhost:8000
```

Luego abre `http://localhost:8000`.

También puedes usar cualquier servidor estático simple.

## Heurística de zonas de liquidez

Dado que con plan gratuito no hay acceso directo a un order book histórico institucional estilo TensorCharts/Bookmap, se implementa una aproximación defendible con OHLCV:

1. Detección de pivotes (`swing highs/lows`) con ventana local.
2. Cálculo de señales por nivel:
   - intensidad de mecha (rechazo),
   - volumen relativo de la vela,
   - repetición de toques (hits) mediante clustering de niveles cercanos.
3. Scoring por zona (0-100) combinando:
   - cercanía al precio actual,
   - reacciones históricas,
   - volumen relativo,
   - sesgo de tendencia (24h).
4. Selección de objetivo probable de barrido en corto plazo con balance entre:
   - lado superior/inferior,
   - tendencia,
   - fortaleza total de la zona.

Esto genera un **heatmap aproximado** de liquidez potencial (no liquidaciones reales tick a tick).

## Mejoras futuras sugeridas

- Añadir Bybit como fuente redundante/fallback.
- Integrar WebSocket de Binance para velas y ticker en tiempo real.
- Añadir multi-timeframe scoring (5m/15m/1h).
- Detectar “fair value gaps” e imbalances.
- Cache opcional vía PHP para reducir rate-limit en hosting compartido.
