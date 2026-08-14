/* Shared selection state. The trailer row, the matcher chips and the board
 * all read and write this one object, so they can never disagree about what
 * the driver picked. */

const listeners = new Set();
let selection = [];

export const store = {
  get: () => selection.slice(),
  has: key => selection.includes(key),
  toggle(key) {
    selection = selection.includes(key) ? selection.filter(k => k !== key) : selection.concat(key);
    emit();
  },
  add(key) {
    if (!selection.includes(key)) { selection = selection.concat(key); emit(); }
  },
  clear() { selection = []; emit(); },
  subscribe(fn) { listeners.add(fn); fn(selection.slice()); return () => listeners.delete(fn); }
};

function emit() {
  for (const fn of listeners) fn(selection.slice());
}
