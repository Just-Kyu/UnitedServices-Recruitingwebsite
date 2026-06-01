/* United Services Recruiting — hero wireframe truck (Three.js r149 UMD)
   Glowing silver-blue line truck on near-black navy, auto-rotate + mouse parallax. */
(function () {
  'use strict';
  if (typeof THREE === 'undefined') { console.warn('THREE not loaded'); return; }
  var mount = document.getElementById('truck-stage');
  if (!mount) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = innerWidth < 760;

  var COL = { steel: 0x6db4ff, silver: 0xc7d0db, dim: 0x47678f, white: 0xeaf2ff };

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 200);
  camera.position.set(7.4, 3.0, 10.5);
  camera.lookAt(0, 0.4, 0);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  mount.appendChild(renderer.domElement);

  var truck = new THREE.Group();
  scene.add(truck);

  function mat(color, opacity) {
    return new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity == null ? 1 : opacity });
  }
  function boxEdges(w, h, d, color, opacity) {
    var g = new THREE.BoxGeometry(w, h, d);
    var e = new THREE.EdgesGeometry(g);
    return new THREE.LineSegments(e, mat(color, opacity));
  }
  function ring(radius, seg, color, opacity) {
    var pts = [];
    for (var i = 0; i <= seg; i++) { var a = (i / seg) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0)); }
    var g = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(g, mat(color, opacity));
  }

  // ---- Trailer (rear, silver) ----
  var trailer = boxEdges(6.2, 2.7, 2.5, COL.silver, 0.55);
  trailer.position.set(-1.7, 1.35, 0);
  truck.add(trailer);
  // trailer rib lines
  for (var rx = -4.0; rx <= 0.6; rx += 0.92) {
    var rib = boxEdges(0.01, 2.7, 2.5, COL.dim, 0.4);
    rib.position.set(rx, 1.35, 0); truck.add(rib);
  }

  // ---- Cab (front, steel-blue, brighter) ----
  var cab = boxEdges(1.9, 2.05, 2.35, COL.steel, 0.95);
  cab.position.set(2.85, 1.05, 0);
  truck.add(cab);
  // windshield slab
  var wind = boxEdges(0.55, 0.95, 2.0, COL.white, 1);
  wind.position.set(3.55, 1.55, 0);
  wind.rotation.z = -0.32;
  truck.add(wind);
  // hood
  var hood = boxEdges(1.0, 0.95, 2.2, COL.steel, 0.9);
  hood.position.set(4.25, 0.5, 0);
  truck.add(hood);
  // connector between cab & trailer
  var neck = boxEdges(0.7, 0.5, 1.6, COL.dim, 0.6);
  neck.position.set(1.75, 0.6, 0);
  truck.add(neck);

  // ---- Wheels ----
  var wheelDefs = [-3.6, -2.4, 1.95, 3.55];
  wheelDefs.forEach(function (wx, i) {
    [-1.28, 1.28].forEach(function (wz) {
      var r = i >= 2 ? 0.62 : 0.66;
      var w = ring(r, 26, i >= 2 ? COL.steel : COL.silver, 0.85);
      w.position.set(wx, r, wz); w.rotation.y = Math.PI / 2;
      truck.add(w);
      var hubR = ring(r * 0.42, 16, COL.dim, 0.7);
      hubR.position.set(wx, r, wz); hubR.rotation.y = Math.PI / 2;
      truck.add(hubR);
    });
  });

  // ---- Underglow / chassis line ----
  var chassis = boxEdges(8.6, 0.12, 1.4, COL.dim, 0.5);
  chassis.position.set(-0.3, 0.34, 0);
  truck.add(chassis);

  // center truck group
  truck.position.y = -0.6;
  truck.rotation.y = -0.35;

  // ---- Ground grid ----
  var grid = new THREE.GridHelper(46, 46, 0x2b4a72, 0x16263f);
  grid.material.transparent = true; grid.material.opacity = 0.22;
  grid.position.y = -0.3;
  scene.add(grid);

  // ---- Particle field ----
  var pCount = isMobile ? 360 : 1100;
  var pGeo = new THREE.BufferGeometry();
  var pos = new Float32Array(pCount * 3);
  for (var i = 0; i < pCount; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 1] = Math.random() * 16 - 2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  var pMat = new THREE.PointsMaterial({ color: 0x9fb3d0, size: 0.05, transparent: true, opacity: 0.6, sizeAttenuation: true });
  var points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // ---- Interaction ----
  var targetRX = 0, targetRY = 0, curRX = 0, curRY = 0;
  if (!isMobile && !reduce) {
    window.addEventListener('mousemove', function (e) {
      targetRY = (e.clientX / innerWidth - 0.5) * 0.5;
      targetRX = (e.clientY / innerHeight - 0.5) * 0.22;
    });
  }
  var scrollRot = 0;
  window.addEventListener('scroll', function () {
    var h = innerHeight;
    scrollRot = Math.min(window.scrollY / h, 1) * 0.9;
  }, { passive: true });

  function resize() {
    var w = mount.clientWidth, h = mount.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  var t0 = performance.now();
  var started = false;
  function renderFrame() {
    var t = (performance.now() - t0) / 1000;
    var spin = reduce ? 0 : t * 0.12;
    truck.rotation.y = -0.35 + spin + scrollRot + targetRY * 0.6;
    curRX += (targetRX - curRX) * 0.06;
    truck.rotation.x = curRX;
    truck.position.y = -0.6 + Math.sin(t * 0.7) * 0.06;
    points.rotation.y = t * 0.012;
    renderer.render(scene, camera);
  }
  function animate() {
    requestAnimationFrame(animate);
    renderFrame();
  }
  resize();
  renderFrame();              // immediate first paint (survives rAF throttling)
  animate();
  // extra safety paints in case rAF is throttled early
  setTimeout(renderFrame, 120);
  setTimeout(renderFrame, 500);
  // fade in
  renderer.domElement.style.opacity = 0;
  renderer.domElement.style.transition = 'opacity 1.2s ease';
  function reveal() { renderer.domElement.style.opacity = 1; }
  window.addEventListener('loader:done', reveal);
  setTimeout(reveal, 2000);
})();
