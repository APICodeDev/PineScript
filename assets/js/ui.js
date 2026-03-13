export function buildAnalysisPanel(container, model) {
  const items = [
    ['Activo', model.symbol],
    ['Precio actual', model.price],
    ['Cambio 24h', model.change24],
    ['Tendencia estimada', model.trend],
    ['Fuerza de tendencia', model.trendStrength],
    ['Sesgo', model.bias],
    ['Objetivo probable', model.target],
    ['Nivel superior cercano', model.nearestUp],
    ['Nivel inferior cercano', model.nearestDown],
    ['Última actualización', model.updatedAt],
  ];
  container.innerHTML = items
    .map(([k, v]) => `<article class="item"><div class="k">${k}</div><div class="v">${v}</div></article>`)
    .join('');
}

export function showSuggestions(listEl, symbols, onPick) {
  if (!symbols.length) {
    listEl.classList.add('hidden');
    listEl.innerHTML = '';
    return;
  }
  listEl.innerHTML = symbols
    .slice(0, 14)
    .map((s) => `<li data-symbol="${s.symbol}">${s.symbol} <small>· ${s.baseAsset}</small></li>`)
    .join('');
  listEl.classList.remove('hidden');
  listEl.querySelectorAll('li').forEach((li) => {
    li.addEventListener('click', () => onPick(li.dataset.symbol));
  });
}

export function setLoading(isLoading) {
  document.getElementById('loadingOverlay').classList.toggle('hidden', !isLoading);
}

export function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2600);
}
