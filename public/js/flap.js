/* Split-flap board — the For Carriers page's signature move, standing in for
 * the old site's flipping chrome logo. A row of Solari-style cells cycles
 * through the driver classes we place, each letter clattering through a few
 * characters before landing, with a stagger across the row so the word
 * ripples in like a real departure board.
 *
 * Pure black-and-white by construction: black cells, white letters, hairline
 * split across the middle. Click/tap the board to advance it yourself.
 * Reduced motion: the first word is rendered statically and nothing moves.
 */

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-· ';
const FLIP_MS = 70;      // one flap
const SPINS_MIN = 2;     // flaps before landing (near cells)
const STAGGER = 55;      // per-cell delay left→right
const HOLD_MS = 2600;    // how long a landed word stays

export function initFlap(board, words) {
  if (!board || !words || !words.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const width = Math.max(...words.map(w => w.length));
  const pad = w => {
    const total = width - w.length;
    const left = Math.floor(total / 2);
    return ' '.repeat(left) + w + ' '.repeat(total - left);
  };

  board.textContent = '';
  const cells = [];
  for (let i = 0; i < width; i++) {
    const c = document.createElement('span');
    c.className = 'flap__cell';
    c.textContent = ' ';
    board.appendChild(c);
    cells.push(c);
  }

  let word = 0;
  const setWord = idx => {
    const target = pad(words[idx]);
    for (let i = 0; i < width; i++) cells[i].textContent = target[i];
  };

  if (reduce) { setWord(0); return; }

  let timers = [];
  const clear = () => { for (const t of timers) clearTimeout(t); timers = []; };

  function flipCell(cell, ch, delay) {
    const spins = SPINS_MIN + Math.floor(Math.random() * 3);
    for (let s = 0; s <= spins; s++) {
      timers.push(setTimeout(() => {
        cell.classList.remove('is-flipping');
        // restart the flip animation
        void cell.offsetWidth;
        cell.classList.add('is-flipping');
        cell.textContent = s === spins ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }, delay + s * FLIP_MS));
    }
  }

  function showNext() {
    clear();
    word = (word + 1) % words.length;
    const target = pad(words[word]);
    for (let i = 0; i < width; i++) {
      if (cells[i].textContent !== target[i]) flipCell(cells[i], target[i], i * STAGGER);
    }
  }

  setWord(0);

  let running = null;
  const start = () => { if (running == null) running = setInterval(showNext, HOLD_MS); };
  const stop = () => { if (running != null) { clearInterval(running); running = null; clear(); } };

  // Only clatter while someone can see it.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => e.isIntersecting ? start() : stop(), { threshold: 0.2 }).observe(board);
  } else start();

  // Tap to deal the next word yourself.
  board.addEventListener('click', () => { showNext(); });
  board.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showNext(); }
  });
}
