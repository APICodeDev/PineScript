# Solución al error de `box.new()` por índice `left` demasiado antiguo

El error:

> `Bar index value of the left argument (...) in box.new() is too far from the current bar index. Try using time instead.`

aparece porque en este bloque dibujas en `barstate.islast` cajas cuyo `left = s.start_bar` puede quedar muy atrás del `bar_index` actual.

## Cambio mínimo (sin tocar el resto de la lógica)

En la sección **"Dibujar Setups Automáticos"**, justo antes de crear las cajas, añade un índice seguro:

```pine
int safe_left = math.max(s.start_bar, bar_index - 499)
```

Y reemplaza `s.start_bar` por `safe_left` en ambos `box.new(...)` de ese bloque.

### Quedaría así

```pine
// Dibujar Setups Automáticos
if barstate.islast
    for i = 0 to (active_setups.size() > 0 ? active_setups.size() - 1 : -1)
        TradeSetup s = active_setups.get(i)
        bool is_long = s.tp > s.sl
        float rr = math.abs(s.tp - s.entry) / math.abs(s.entry - s.sl)
        int safe_left = math.max(s.start_bar, bar_index - 499)

        // Caja de Profit
        box.new(safe_left, s.tp, bar_index + future_ext, s.entry,
             bgcolor=color.new(color.green, 80), border_color=color.new(color.green, 40),
             text=str.format("AUTO TP\nR:R {0, number, #.##}", rr), text_size=size.tiny, text_color=color.white)

        // Caja de Stop
        box.new(safe_left, s.entry, bar_index + future_ext, s.sl,
             bgcolor=color.new(color.red, 80), border_color=color.new(color.red, 40),
             text="AUTO SL", text_size=size.tiny, text_color=color.white)
```

## Por qué funciona

TradingView limita cuán lejos puede estar `left` cuando usas coordenadas por `bar_index`. Al acotar a `bar_index - 499`, evitas superar ese rango y no cambias la lógica de setup, TP, SL ni el resto del script.
