/* Pay estimator.
 *
 * This is the one place on the site that shows a dollar figure, so it is
 * scrupulous about what it claims: GROSS, before deductions, from numbers the
 * driver picked themselves. It never presents an average, a typical, or an
 * "earn up to" — those are earnings claims we cannot substantiate. */

const fmt = n => '$' + Math.round(n).toLocaleString('en-US');

export function initCalculator() {
  const cpm = document.getElementById('cpm');
  const miles = document.getElementById('miles');
  if (!cpm || !miles) return;

  const cpmOut = document.getElementById('cpm-out');
  const milesOut = document.getElementById('miles-out');
  const bandOut = document.getElementById('miles-band');
  const week = document.getElementById('out-week');
  const month = document.getElementById('out-month');
  const year = document.getElementById('out-year');

  function band(mi) {
    if (mi >= 3500) return 'Team range';
    if (mi >= 2700) return 'Solo — high side';
    return 'Solo — conservative';
  }

  function render() {
    const c = Number(cpm.value) / 100;
    const mi = Number(miles.value);
    const w = c * mi;

    cpmOut.textContent = `$${c.toFixed(2)}/mi`;
    milesOut.textContent = `${mi.toLocaleString('en-US')} mi`;
    bandOut.textContent = band(mi);

    week.textContent = fmt(w);
    month.textContent = fmt(w * 52 / 12);
    year.textContent = fmt(w * 52);

    // Screen readers get the formatted value, not the raw slider number.
    cpm.setAttribute('aria-valuetext', `$${c.toFixed(2)} per mile`);
    miles.setAttribute('aria-valuetext', `${mi.toLocaleString('en-US')} miles per week, ${band(mi)}`);
  }

  cpm.addEventListener('input', render);
  miles.addEventListener('input', render);
  render();
}
