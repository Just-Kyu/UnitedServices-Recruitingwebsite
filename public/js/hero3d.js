/* United Services Recruiting — hero Tesla Semi 3D
 *
 * Vanilla Three.js port of Hero3DTruck.jsx (Aleksei Rozumnyi's Tesla Semi,
 * CC-BY-4.0 — https://sketchfab.com/3d-models/tesla-semi-39ffc7c746184e0c9ebd5bbcd0b405dd).
 *
 * Loads /models/tesla-semi-web.glb (the uncompressed 2.7 MB variant). The
 * sibling tesla-semi.glb is Meshopt-compressed; the React original used
 * drei's useGLTF which auto-wires MeshoptDecoder, but we don't, so we load
 * the plain variant to keep vanilla GLTFLoader happy.
 *
 * Preserves the GLB's PBR materials (body, glass, lights, tires), tunes
 * glass + headlight emissives, lights the scene with a procedural
 * city-style envMap, then auto-rotates with mouse parallax.
 */
(function () {
  'use strict';

  // ── DEBUG: visible status panel (top-right) so we can diagnose without devtools ──
  // Remove this block once the truck is confirmed rendering.
  var dbg = document.createElement('div');
  dbg.style.cssText = 'position:fixed;top:8px;right:8px;z-index:99999;background:rgba(0,0,0,0.85);color:#7CC0FF;font:11px/1.4 ui-monospace,monospace;padding:8px 10px;border:1px solid #4DA3FF;border-radius:6px;max-width:340px;pointer-events:none;white-space:pre';
  document.documentElement.appendChild(dbg);
  var dbgState = {
    THREE: typeof THREE !== 'undefined' ? (THREE.REVISION || 'yes') : 'MISSING',
    GLTFLoader: (typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined') ? 'yes' : 'MISSING',
    mount: '?', mountSize: '?', canvas: 'no', glb: 'pending', error: ''
  };
  function dbgRender() {
    dbg.textContent =
      'THREE r' + dbgState.THREE
      + '\nGLTFLoader: ' + dbgState.GLTFLoader
      + '\n#truck-stage: ' + dbgState.mount
      + '\nMount size: ' + dbgState.mountSize
      + '\nCanvas: ' + dbgState.canvas
      + '\nGLB: ' + dbgState.glb
      + (dbgState.error ? '\nERR: ' + dbgState.error : '');
  }
  window.addEventListener('error', function (e) {
    dbgState.error = (e.message || '') + ' @ ' + ((e.filename || '?').split('/').pop()) + ':' + (e.lineno || '?');
    dbgRender();
  });
  dbgRender();

  if (typeof THREE === 'undefined') { dbgRender(); return; }
  if (typeof THREE.GLTFLoader === 'undefined') { dbgRender(); return; }
  var mount = document.getElementById('truck-stage');
  if (!mount) { dbgState.mount = 'MISSING'; dbgRender(); return; }
  dbgState.mount = 'found';
  dbgState.mountSize = mount.clientWidth + 'x' + mount.clientHeight;
  dbgRender();

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = innerWidth < 760;

  var scene = new THREE.Scene();

  var camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100);
  camera.position.set(4.5, 1.6, 6);
  camera.lookAt(0, 0, 0);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else renderer.outputEncoding = THREE.sRGBEncoding;
  mount.appendChild(renderer.domElement);
  dbgState.canvas = 'in DOM (' + mount.clientWidth + 'x' + mount.clientHeight + ')';
  dbgRender();

  // Lights mirror the React component
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  var key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(5, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x4DA3FF, 0.6);
  rim.position.set(-6, 3, -4);
  scene.add(rim);

  // Procedural environment map — stands in for drei's "city" preset.
  // A few warm/cool blocks above a dark navy floor give the metallic body
  // believable highlights without an external HDR fetch.
  function buildEnvMap() {
    var envScene = new THREE.Scene();
    function block(color, x, y, z, w, h, d) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: color }));
      m.position.set(x, y, z); envScene.add(m);
    }
    block(0x222a36, 0,  -2, 0, 50, 0.1, 50);                    // floor (deep navy)
    block(0x6e7a8a, 0,  10, 0, 50, 0.1, 50);                    // ceiling (silver-gray sky)
    block(0x9aa6b8, -8,  4,  0, 0.1, 6, 14);                    // left soft fill
    block(0x4e6280,  8,  4,  0, 0.1, 6, 14);                    // right cool fill
    block(0xffe6b3,  3,  6,  4, 1, 0.4, 3);                     // warm strip (front-right)
    block(0xc8d6ff, -4,  7, -3, 3, 0.4, 1);                     // cool strip (back-left)

    var pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    var tex = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
    return tex;
  }
  scene.environment = buildEnvMap();

  // Soft contact shadow under the truck (ContactShadows equivalent).
  var shadowGeo = new THREE.CircleGeometry(3.5, 48);
  var shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
  var contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = -1.4;
  scene.add(contactShadow);

  var truckGroup = new THREE.Group();
  scene.add(truckGroup);

  var loader = new THREE.GLTFLoader();
  loader.load('models/tesla-semi-web.glb', function (gltf) {
    var truck = gltf.scene;
    truck.scale.setScalar(1.5);
    truck.position.set(0, -0.7, 0);

    truck.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      o.castShadow = true;
      var mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(function (m) {
        m.envMapIntensity = 1.25;
        var name = (m.name || '').toLowerCase();
        if (name.indexOf('glass') !== -1) {
          m.transparent = true;
          m.opacity = 0.35;
          m.roughness = 0.05;
          m.metalness = 0.1;
        } else if (name.indexOf('light') !== -1) {
          m.emissive = new THREE.Color(0xfff6e0);
          m.emissiveIntensity = 0.6;
        }
      });
    });

    truckGroup.add(truck);
    dbgState.glb = 'LOADED (' + truck.children.length + ' meshes)';
    dbgRender();
  }, function (p) {
    if (p && p.total) { dbgState.glb = 'loading ' + Math.round(100 * p.loaded / p.total) + '%'; dbgRender(); }
  }, function (err) {
    console.warn('Tesla Semi model failed to load — drop tesla-semi-web.glb into public/models/.', err);
    dbgState.glb = 'FAILED: ' + (err && err.message ? err.message : (err && err.type) || 'unknown');
    dbgRender();
  });

  // Mouse parallax target (subtle, layered on top of the camera orbit)
  var pointer = { x: 0, y: 0 };
  if (!isMobile && !reduce) {
    window.addEventListener('mousemove', function (e) {
      pointer.x = (e.clientX / innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / innerHeight) * 2 + 1;
    });
  }

  // Scroll-coupled camera orbit — the truck stays put while the camera
  // travels from front-3/4 → side → rear-3/4 across the .hero-saga section.
  var saga = document.getElementById('hero-saga');
  var keyframes = [
    { angle: Math.atan2(6, 4.5),  radius: 7.5, height: 1.6, look: 0.4 }, // front-3/4 (right-front)
    { angle: Math.PI,             radius: 7.0, height: 1.5, look: 0.4 }, // side (driver door)
    { angle: Math.PI * 1.35,      radius: 7.5, height: 2.0, look: 0.4 }  // rear-3/4 (left-rear, slightly elevated)
  ];
  var cameraProgress = 0;
  function sampleCamera(p) {
    p = Math.max(0, Math.min(1, p));
    var seg, t;
    if (p < 0.5) { seg = 0; t = p / 0.5; }
    else         { seg = 1; t = (p - 0.5) / 0.5; }
    var e = t * t * (3 - 2 * t); // smoothstep
    var a = keyframes[seg], b = keyframes[seg + 1];
    return {
      angle:  a.angle  + (b.angle  - a.angle)  * e,
      radius: a.radius + (b.radius - a.radius) * e,
      height: a.height + (b.height - a.height) * e,
      look:   a.look   + (b.look   - a.look)   * e
    };
  }
  function updateCameraProgress() {
    if (!saga || isMobile || reduce) { cameraProgress = 0; return; }
    var rect = saga.getBoundingClientRect();
    var vh = innerHeight;
    // Camera completes its orbit over the first ~2 viewport heights of scroll
    // (one vh per scene transition); the remaining scroll holds at progress 1
    // so scene 3 reads cleanly before the matcher section.
    var orbitable = vh * 2;
    cameraProgress = Math.max(0, Math.min(1, -rect.top / orbitable));
  }
  window.addEventListener('scroll', updateCameraProgress, { passive: true });
  updateCameraProgress();

  function resize() {
    camera.aspect = mount.clientWidth / mount.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    updateCameraProgress();
    dbgState.mountSize = mount.clientWidth + 'x' + mount.clientHeight;
    dbgRender();
  }
  window.addEventListener('resize', resize);

  var prev = performance.now();
  var t0 = prev;
  var camAngle = keyframes[0].angle, camRadius = keyframes[0].radius;
  var camHeight = keyframes[0].height, camLook = keyframes[0].look;
  function tick(now) {
    var delta = Math.min((now - prev) / 1000, 0.05);
    prev = now;
    var t = (now - t0) / 1000;

    var floatBob = Math.sin(t * 0.8) * 0.02; // gentler than before; the truck reads as planted

    if (isMobile || reduce) {
      // Mobile/reduced-motion: lock to the opening front-3/4 frame.
      var f = keyframes[0];
      camera.position.set(Math.cos(f.angle) * f.radius, f.height, Math.sin(f.angle) * f.radius);
      camera.lookAt(0, f.look, 0);
      truckGroup.rotation.y = -0.35;
    } else {
      var target = sampleCamera(cameraProgress);
      var k = Math.min(1, delta * 6);
      camAngle  += (target.angle  - camAngle)  * k;
      camRadius += (target.radius - camRadius) * k;
      camHeight += (target.height - camHeight) * k;
      camLook   += (target.look   - camLook)   * k;
      var px = pointer.x * 0.35;
      var py = pointer.y * 0.15;
      camera.position.set(
        Math.cos(camAngle) * camRadius + px,
        camHeight + py,
        Math.sin(camAngle) * camRadius
      );
      camera.lookAt(0, camLook, 0);
      truckGroup.rotation.y = 0;
    }
    truckGroup.position.y = -0.7 + floatBob;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  // Fade in once loaded (loader event from site.js)
  renderer.domElement.style.opacity = 0;
  renderer.domElement.style.transition = 'opacity 1.2s ease';
  function reveal() { renderer.domElement.style.opacity = 1; }
  window.addEventListener('loader:done', reveal);
  setTimeout(reveal, 2000);

  resize();
  // Late-layout safety: re-measure after the saga's sticky/absolute children
  // have settled. Without this, the canvas can boot at 0×0 in some browsers.
  setTimeout(resize, 100);
  setTimeout(resize, 600);
  requestAnimationFrame(tick);
})();
