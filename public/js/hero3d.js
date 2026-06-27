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
  if (typeof THREE === 'undefined') { console.warn('THREE not loaded'); return; }
  if (typeof THREE.GLTFLoader === 'undefined') { console.warn('GLTFLoader not loaded'); return; }
  var mount = document.getElementById('truck-stage');
  if (!mount) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = innerWidth < 760;

  var scene = new THREE.Scene();

  // Wider FOV on mobile portrait so the truck fits in frame without
  // cropping to the front grille. Desktop stays telephoto for cinematic
  // compression.
  var fov = isMobile ? 52 : 38;
  var camera = new THREE.PerspectiveCamera(fov, mount.clientWidth / mount.clientHeight, 0.1, 100);
  camera.position.set(4.5, 1.6, 6);
  camera.lookAt(0, 0, 0);

  // Mobile GPUs choke on MSAA + a 2048 shadow map + 2× DPR re-rendered every
  // frame during a sticky scroll — that was the lag. On mobile we drop AA,
  // drop shadows, render at a lower pixel ratio, and (further down) only render
  // while the user is actually scrolling.
  var renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(isMobile ? Math.min(devicePixelRatio, 1.5) : Math.min(devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // Lower exposure for a more cinematic, less washed-out body.
  renderer.toneMappingExposure = 0.78;
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else renderer.outputEncoding = THREE.sRGBEncoding;
  mount.appendChild(renderer.domElement);

  // Lights: dim ambient + a warm key that ORBITS WITH THE CAMERA (so the
  // shadow direction rotates as you scroll) + a steel-blue rim + a soft
  // warm pink fill (both fixed, so the body never goes flat).
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));
  var key = new THREE.DirectionalLight(0xffe6c2, 1.6);
  key.position.set(5, 8, 5);
  key.target.position.set(0, -0.4, 0);
  key.castShadow = !isMobile;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1; key.shadow.camera.far = 36;
  key.shadow.camera.left = -10; key.shadow.camera.right = 10;
  key.shadow.camera.top = 10; key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0001;
  scene.add(key);
  scene.add(key.target);
  var rim = new THREE.DirectionalLight(0x4DA3FF, 0.85);
  rim.position.set(-6, 3, -4);
  scene.add(rim);
  var fill = new THREE.DirectionalLight(0xff7aa3, 0.35); // soft warm pink fill
  fill.position.set(-4, 1.5, 5);
  scene.add(fill);

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

  // Invisible ground plane that *only* catches the directional light's shadow.
  // ShadowMaterial means nothing is drawn except where the truck shadow falls,
  // so we don't see a floating dark disc when the camera orbits to the side.
  var groundGeo = new THREE.PlaneGeometry(60, 60);
  var groundMat = new THREE.ShadowMaterial({ opacity: 0.62 });
  var ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.4;
  ground.receiveShadow = true;
  ground.visible = !isMobile;   // shadows are off on mobile, so skip the shadow-catcher entirely
  scene.add(ground);

  var truckGroup = new THREE.Group();
  scene.add(truckGroup);

  // Framing state, measured from the model once it loads. Used to center the
  // truck deterministically on mobile (instead of hand-guessed camera numbers
  // that left it floating in a corner).
  var framed = false;
  var fitCenter = new THREE.Vector3(); // truck's geometric center (local space)
  var truckRadius = 1;                 // bounding-sphere radius — frames the WHOLE truck
  var FIT_W = 0.86;                    // truck spans ~86% of the portrait width, fully visible
  var STATIC_BIAS = 0.46;              // truck sits ~centered (a hair high) in its mobile block

  var loader = new THREE.GLTFLoader();
  // Use the Meshopt-compressed GLB (~348 KB) instead of the uncompressed
  // 2.7 MB variant. Requires THREE.MeshoptDecoder to be loaded before
  // hero3d.js — see <script> tags in index.html.
  if (typeof MeshoptDecoder !== 'undefined') {
    loader.setMeshoptDecoder(MeshoptDecoder);
  } else if (typeof THREE.MeshoptDecoder !== 'undefined') {
    loader.setMeshoptDecoder(THREE.MeshoptDecoder);
  }
  loader.load('models/tesla-semi.glb', function (gltf) {
    var truck = gltf.scene;
    truck.scale.setScalar(1.5);
    truck.position.set(0, -0.7, 0);

    function nameTag(m, nodeName) {
      return ((m.name || '') + ' ' + (nodeName || '')).toLowerCase();
    }
    function isWheelish(tag) {
      return tag.indexOf('tire') !== -1 ||
             tag.indexOf('tyre') !== -1 ||
             tag.indexOf('wheel') !== -1 ||
             tag.indexOf('rubber') !== -1 ||
             tag.indexOf('rim') !== -1 ||
             tag.indexOf('hub') !== -1 ||
             tag.indexOf('brake') !== -1 ||
             tag.indexOf('caliper') !== -1;
    }
    function isRimish(tag) {
      // Aluminum/chrome part of the wheel, vs. the rubber tire
      return tag.indexOf('rim') !== -1 ||
             tag.indexOf('hub') !== -1 ||
             tag.indexOf('alloy') !== -1 ||
             tag.indexOf('spoke') !== -1;
    }
    function isGlassish(tag, m) {
      if (tag.indexOf('glass') !== -1) return true;
      if (tag.indexOf('window') !== -1) return true;
      if (tag.indexOf('windshield') !== -1) return true;
      if (tag.indexOf('windscreen') !== -1) return true;
      if (tag.indexOf('pane') !== -1) return true;
      // Conservative fallback: smooth, originally-transparent — but never on wheels.
      if (!isWheelish(tag) &&
          m.transparent && m.opacity > 0 && m.opacity < 0.95 &&
          (m.roughness === undefined || m.roughness < 0.2)) return true;
      return false;
    }
    function isLightish(tag) {
      return tag.indexOf('light') !== -1 || tag.indexOf('lamp') !== -1 || tag.indexOf('headlamp') !== -1;
    }

    truck.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      o.castShadow = !isMobile;
      o.receiveShadow = !isMobile;
      var tag = nameTag(o.material, o.name);
      var mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(function (m) {
        m.envMapIntensity = 1.45;
        var mtag = nameTag(m, o.name);

        if (isWheelish(mtag)) {
          // Wheels: tires read as matte black rubber, rims/hubs as polished
          // aluminum. Without this they got swept up by the glass fallback
          // and turned invisible against the dark scene.
          m.transparent = false;
          m.opacity = 1;
          if (isRimish(mtag)) {
            if (m.color) m.color.setHex(0xb8c2cc);
            if (typeof m.roughness === 'number') m.roughness = 0.35;
            if (typeof m.metalness === 'number') m.metalness = 0.9;
            m.envMapIntensity = 1.8;
          } else {
            if (m.color) m.color.setHex(0x1a1a1c);
            if (typeof m.roughness === 'number') m.roughness = 0.88;
            if (typeof m.metalness === 'number') m.metalness = 0.05;
            m.envMapIntensity = 0.8;
          }
        } else if (isGlassish(mtag, m)) {
          // Dark mirror windshield (matches the reference: nearly black,
          // only the env-map highlight reads through as a sky reflection).
          m.transparent = false;
          if (m.color) m.color.setHex(0x080a10);
          if (typeof m.roughness === 'number') m.roughness = 0.04;
          if (typeof m.metalness === 'number') m.metalness = 0.85;
          m.envMapIntensity = 2.8;
        } else if (isLightish(mtag)) {
          if (!m.emissive) m.emissive = new THREE.Color();
          m.emissive.setHex(0xfff6e0);
          m.emissiveIntensity = 0.9;
        }
      });
    });

    // Measure the truck BEFORE parenting it, so the box is in the truck's own
    // local space — independent of truckGroup's animated y-bob. (If we measured
    // after add(), the running y-bob would get baked in and then double-counted
    // when tick() re-applies it.)
    var box = new THREE.Box3().setFromObject(truck);
    box.getCenter(fitCenter);
    var _sphere = new THREE.Sphere();
    box.getBoundingSphere(_sphere);
    truckRadius = Math.max(0.001, _sphere.radius);
    framed = true;

    truckGroup.add(truck);
    dirty = true; // model is in — request a render (matters for the on-demand mobile path)
  }, undefined, function (err) {
    console.warn('Tesla Semi model failed to load. Confirm tesla-semi.glb is in public/models/ and MeshoptDecoder is loaded.', err);
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
  var dirty = true; // render-on-demand flag (mobile only renders when this is set)
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
    // Desktop only. Mobile holds a static framed shot (no scroll orbit) — a
    // sticky, scroll-driven WebGL canvas just won't composite smoothly on iOS.
    if (!saga || isMobile || reduce) { cameraProgress = 0; return; }
    var rect = saga.getBoundingClientRect();
    var vh = innerHeight;
    // Camera completes its orbit over the first ~2 viewport heights of scroll
    // (one vh per scene transition); the remaining scroll holds at progress 1
    // so scene 3 reads cleanly before the matcher section.
    var orbitable = vh * 2;
    var next = Math.max(0, Math.min(1, -rect.top / orbitable));
    if (next !== cameraProgress) { cameraProgress = next; dirty = true; }
  }
  window.addEventListener('scroll', updateCameraProgress, { passive: true });
  updateCameraProgress();

  function resize() {
    isMobile = innerWidth < 760;
    camera.fov = isMobile ? 52 : 38;
    camera.aspect = mount.clientWidth / mount.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    updateCameraProgress();
    dirty = true;
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

    // No idle float on mobile — it would force a render every frame and defeat
    // the render-on-demand path. The truck just tracks scroll there.
    var floatBob = isMobile ? 0 : Math.sin(t * 0.8) * 0.02;

    if (isMobile || reduce) {
      // Mobile: a single static, centered front-3/4 shot — NO orbit, NO scroll
      // coupling. The canvas sits in a normal (non-sticky) block and scrolls
      // away like an image, so there's no per-frame WebGL work during scroll
      // and nothing to stutter. Framed from the bounding sphere so the whole
      // truck is visible and centered in its block.
      var sAngle = keyframes[0].angle;
      if (framed) {
        var sCy = fitCenter.y + (-0.7);
        var sVHalf = (camera.fov * Math.PI / 180) / 2;
        var sHHalf = Math.atan(Math.tan(sVHalf) * camera.aspect);
        var sMinHalf = Math.min(sVHalf, sHHalf); // fit the SMALLER dimension so the whole truck shows
        var sDist = truckRadius / (FIT_W * Math.tan(sMinHalf));
        var sLift = (0.5 - STATIC_BIAS) * 2 * (sDist * Math.tan(sVHalf)); // ~centered in block
        camera.position.set(fitCenter.x + Math.cos(sAngle) * sDist, sCy, fitCenter.z + Math.sin(sAngle) * sDist);
        camera.lookAt(fitCenter.x, sCy - sLift, fitCenter.z);
      } else {
        camera.position.set(Math.cos(sAngle) * 12, 1.4, Math.sin(sAngle) * 12);
        camera.lookAt(0, 0, 0);
      }
      truckGroup.rotation.y = 0;
      key.position.set(Math.cos(sAngle - 0.5) * 11, 9, Math.sin(sAngle - 0.5) * 11);
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
      // Key light orbits with the camera at a fixed -0.5 rad offset
      // (the "sun" is just to the left of camera POV). The shadow under
      // the truck rotates as you scroll instead of pointing the same way.
      var lightAngle = camAngle - 0.5;
      key.position.set(Math.cos(lightAngle) * 11, 9, Math.sin(lightAngle) * 11);
    }
    truckGroup.position.y = -0.7 + floatBob;

    // Desktop renders continuously (parallax + float). Mobile renders only when
    // something changed (scroll/resize/model-load) so the GPU isn't pegged
    // during a sticky scroll — that was the lag.
    if (!isMobile || dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
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
