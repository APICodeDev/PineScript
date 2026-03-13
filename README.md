# Liquidity Heatmap Analyzer (free-data edition)

Aplicación web (frontend + proxy PHP opcional) para análisis de liquidez aproximada en cripto usando **APIs públicas gratuitas**.

## ¿Necesita tokens/API keys?

**No.** Esta versión funciona con endpoints públicos de Binance y fallback de Bybit, sin claves privadas.

## Estructura

- `index.html`
- `api/proxy.php` (opcional pero recomendado para evitar bloqueos CORS/regionales)
- `assets/css/styles.css`
- `assets/js/app.js`
- `assets/js/chart.js`
- `assets/js/liquidity.js`
- `assets/js/api.js`
- `assets/js/ui.js`

## Ejecución local (recomendada)

```bash
php -S localhost:8000
```

Luego abre `http://localhost:8000`.

> Si abres el `index.html` con `file://`, muchos navegadores bloquean llamadas API y no verás datos.

## Flujo de datos implementado

1. Front intenta `api/proxy.php` (servidor local/hosting PHP).
2. Si no está disponible, intenta Binance directo en frontend.
3. Si Binance falla, usa Bybit como fallback.

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

- Integrar WebSocket para actualización tick-level más fluida.
- Añadir multi-timeframe scoring (5m/15m/1h).
- Detectar FVG/imbalances con mayor precisión.
- Cache ligero en `proxy.php` para reducir rate-limit en hosting compartido.
