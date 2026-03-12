export function show(el) {
  if (!el) return;
  el.classList.remove('hidden');
}

export function hide(el) {
  if (!el) return;
  el.classList.add('hidden');
}

export function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s == null ? '' : String(s);
  return div.innerHTML;
}

