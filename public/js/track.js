/* United Services — conversion tracking
 *
 * GA4 counts page views on its own. What matters to this business is which
 * page produced a driver: an application, a tap on the phone number, a click
 * through to the form. Those are sent here as events so the Reports →
 * Engagement → Events panel shows them, and they can be marked as key events
 * in GA4 (Admin → Events → toggle "Mark as key event").
 */
(function () {
  'use strict';

  function track(name, params) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', name, params || {});
  }
  window.usrTrack = track;

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';

    if (href.indexOf('tel:') === 0) {
      track('phone_click', { link_url: href, page_path: location.pathname });
    } else if (href.indexOf('mailto:') === 0) {
      track('email_click', { link_url: href, page_path: location.pathname });
    } else if (/apply\.html/.test(href)) {
      // Which page sent them to the form is the number worth having: it tells
      // you which lane or state page is actually earning applications.
      track('apply_click', {
        page_path: location.pathname,
        link_text: (a.textContent || '').trim().slice(0, 40)
      });
    }
  }, { passive: true });
})();
