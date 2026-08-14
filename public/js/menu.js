/* Mobile menu overlay: traps focus while open, closes on Escape, and returns
 * focus to the button that opened it. */

export function initMenu() {
  const menu = document.getElementById('menu');
  const openBtn = document.getElementById('burger');
  const closeBtn = document.getElementById('menu-close');
  if (!menu || !openBtn) return;

  let lastFocused = null;
  const focusables = () => menu.querySelectorAll('a[href], button:not([disabled])');

  function open() {
    lastFocused = document.activeElement;
    menu.dataset.open = 'true';
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    (focusables()[0] || menu).focus();
  }

  function close() {
    menu.dataset.open = 'false';
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  openBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  for (const a of menu.querySelectorAll('a')) a.addEventListener('click', close);

  document.addEventListener('keydown', e => {
    if (menu.dataset.open !== 'true') return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    const items = Array.from(focusables());
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}
