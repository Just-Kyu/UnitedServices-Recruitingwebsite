/* United Services Recruiting — shared site behaviors */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Loader: assembling-U ---------- */
  function runLoader() {
    var loader = document.getElementById('loader');
    if (!loader) return;
    var img = loader.querySelector('img');
    var bar = loader.querySelector('.load-bar i');
    // Full intro only once per browsing session — replaying 1.75s of loader
    // on every internal navigation made switching pages feel laggy.
    var seen = false;
    try { seen = sessionStorage.getItem('usr-seen') === '1'; sessionStorage.setItem('usr-seen', '1'); } catch (_) {}
    if (reduce || seen) {
      if (img) { img.style.opacity = 1; }
      setTimeout(finish, seen ? 120 : 300);
      return;
    }
    // animate logo halves assembling via clip + transform using a wrapper trick:
    if (img) {
      img.animate([
        { opacity: 0, transform: 'translateY(18px) scale(.82) rotateX(35deg)', filter: 'blur(6px)' },
        { opacity: 1, transform: 'translateY(0) scale(1) rotateX(0deg)', filter: 'blur(0)' }
      ], { duration: 1100, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'forwards' });
    }
    if (bar) {
      bar.animate([{ width: '0%' }, { width: '100%' }], { duration: 1500, easing: 'cubic-bezier(0.65,0,0.35,1)', fill: 'forwards' });
    }
    setTimeout(finish, 1750);
    function finish() {
      loader.classList.add('done');
      document.body.classList.remove('loading');
      window.dispatchEvent(new Event('loader:done'));
      setTimeout(function () { if (loader && loader.parentNode) loader.parentNode.removeChild(loader); }, 900);
    }
  }

  /* ---------- Custom cursor ---------- */
  function initCursor() {
    if (!fine || reduce) return;
    document.body.classList.add('cursor-on');
    var dot = document.createElement('div'); dot.className = 'cursor-dot';
    var ring = document.createElement('div'); ring.className = 'cursor-ring';
    document.body.appendChild(dot); document.body.appendChild(ring);
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
    });
    function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    }
    loop();
    var hot = 'a,button,.chip,.matcher-chip,[data-cursor]';
    document.addEventListener('mouseover', function (e) { if (e.target.closest(hot)) ring.classList.add('hot'); });
    document.addEventListener('mouseout', function (e) { if (e.target.closest(hot)) ring.classList.remove('hot'); });
  }

  /* ---------- Magnetic buttons ---------- */
  function initMagnetic() {
    if (!fine || reduce) return;
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      var strength = parseFloat(el.getAttribute('data-magnetic')) || 0.35;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2);
        var y = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + x * strength + 'px,' + y * strength + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- Reveal on scroll (rect-based, robust) ---------- */
  function initReveal() {
    var els = [].slice.call(document.querySelectorAll('.reveal'));
    if (reduce) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var ticking = false;
    function check() {
      var vh = window.innerHeight;
      for (var i = els.length - 1; i >= 0; i--) {
        var el = els[i];
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) { el.classList.add('in'); els.splice(i, 1); }
      }
      ticking = false;
    }
    function onScroll() { if (!ticking) { requestAnimationFrame(check); ticking = true; } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('load', check);
    window.addEventListener('loader:done', check);
    check();
    setTimeout(check, 400);
    // ultimate fallback
    setTimeout(function () { els.forEach(function (e) { e.classList.add('in'); }); }, 4000);
  }

  /* ---------- Count-up ---------- */
  function animateCount(el, to, dur, fmt) {
    if (reduce) { el.textContent = fmt ? fmt(to) : to; return; }
    var start = null, from = 0;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      var v = Math.round(from + (to - from) * e);
      el.textContent = fmt ? fmt(v) : v;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    setTimeout(function () { el.textContent = fmt ? fmt(to) : to; }, dur + 250); // fallback if rAF throttled
  }
  function initCounters() {
    var nodes = [].slice.call(document.querySelectorAll('[data-count]'));
    if (!nodes.length) return;
    function fire(n) {
      var to = +n.getAttribute('data-count');
      var suffix = n.getAttribute('data-suffix') || '';
      var dec = n.getAttribute('data-dec');
      if (dec) { decimalCount(n, to, 1500, suffix); }
      else { animateCount(n, to, 1500, function (v) { return v.toLocaleString() + suffix; }); }
    }
    var ticking = false;
    function check() {
      var vh = window.innerHeight;
      for (var i = nodes.length - 1; i >= 0; i--) {
        var r = nodes[i].getBoundingClientRect();
        // 0.98: hero stats sit low in the first viewport on shorter screens —
        // at 0.85 they never fired without a scroll and stayed at "0+".
        if (r.top < vh * 0.98 && r.bottom > 0) { fire(nodes[i]); nodes.splice(i, 1); }
      }
      ticking = false;
    }
    function onScroll() { if (!ticking) { requestAnimationFrame(check); ticking = true; } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('load', check);
    window.addEventListener('loader:done', check);
    check();
    setTimeout(check, 400);
  }
  function decimalCount(el, to, dur, suffix) {
    if (reduce) { el.textContent = to.toFixed(1) + suffix; return; }
    var start = null;
    function step(t) { if (!start) start = t; var p = Math.min((t - start) / dur, 1); var e = 1 - Math.pow(1 - p, 3); el.textContent = (to * e).toFixed(1) + suffix; if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
    setTimeout(function () { el.textContent = to.toFixed(1) + suffix; }, dur + 250);
  }

  /* ---------- Navbar ---------- */
  function initNav() {
    var shell = document.querySelector('.nav-shell');
    if (shell) {
      var onScroll = function () { shell.classList.toggle('shrink', window.scrollY > 30); };
      onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    }
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.querySelector('.m-menu');
    if (toggle && menu) {
      toggle.addEventListener('click', function () { menu.classList.add('open'); document.body.style.overflow = 'hidden'; });
      var close = menu.querySelector('.m-close');
      function shut() { menu.classList.remove('open'); document.body.style.overflow = ''; }
      if (close) close.addEventListener('click', shut);
      menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', shut); });
    }
  }

  /* ---------- Parallax (data-parallax) ---------- */
  function initParallax() {
    if (reduce) return;
    var items = [].slice.call(document.querySelectorAll('[data-parallax]'));
    if (!items.length) return;
    var ticking = false;
    function update() {
      var vh = innerHeight;
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var center = r.top + r.height / 2;
        var off = (center - vh / 2) / vh; // -0.5..0.5-ish
        var amt = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        el.style.transform = 'translateY(' + (off * amt * 100) + 'px)';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
    update();
  }

  document.addEventListener('DOMContentLoaded', function () {
    runLoader();
    initCursor();
    initMagnetic();
    initReveal();
    initCounters();
    initNav();
    initParallax();
  });

  window.USR = { animateCount: animateCount, reduce: reduce, fine: fine };
})();
