/* Builds CSS-3D wireframe boxes for equipment cards. Reads data-w/h/d (px). */
(function () {
  'use strict';
  function buildBox(el) {
    var w = +el.getAttribute('data-w') || 80;
    var h = +el.getAttribute('data-h') || 50;
    var d = +el.getAttribute('data-d') || 44;
    var faces = [
      { t: 'rotateY(0deg)   translateZ(' + (d / 2) + 'px)', w: w, h: h },   // front
      { t: 'rotateY(180deg) translateZ(' + (d / 2) + 'px)', w: w, h: h },   // back
      { t: 'rotateY(90deg)  translateZ(' + (w / 2) + 'px)', w: d, h: h },   // right
      { t: 'rotateY(-90deg) translateZ(' + (w / 2) + 'px)', w: d, h: h },   // left
      { t: 'rotateX(90deg)  translateZ(' + (h / 2) + 'px)', w: w, h: d },   // top
      { t: 'rotateX(-90deg) translateZ(' + (h / 2) + 'px)', w: w, h: d }    // bottom
    ];
    faces.forEach(function (f) {
      var d2 = document.createElement('div');
      d2.className = 'face';
      d2.style.width = f.w + 'px';
      d2.style.height = f.h + 'px';
      d2.style.left = '50%'; d2.style.top = '50%';
      d2.style.marginLeft = (-f.w / 2) + 'px';
      d2.style.marginTop = (-f.h / 2) + 'px';
      d2.style.transform = f.t;
      el.appendChild(d2);
    });
    el.style.width = w + 'px';
    el.style.height = h + 'px';
  }
  document.querySelectorAll('.cube').forEach(buildBox);
})();
