/* United Services Recruiting — hero Tesla Semi 3D (premium pass)
 *
 * Vanilla Three.js port of Hero3DTruck.jsx (Aleksei Rozumnyi's Tesla Semi,
 * CC-BY-4.0 — https://sketchfab.com/3d-models/tesla-semi-39ffc7c746184e0c9ebd5bbcd0b405dd).
 *
 * Loads /models/tesla-semi-web.glb (the uncompressed 2.7 MB variant). The
 * sibling tesla-semi.glb is Meshopt-compressed; we'd need MeshoptDecoder
 * for that one, so we stick with the plain GLB.
 *
 * On top of the base model:
 *   - tinted reflective glass on windows (anything that reads as glass-ish)
 *   - emissive headlights so the lamps glow against the navy hero
 *   - boosted envMap so chrome reads as chrome
 *   - continuously spinning wheels (so the truck reads as driving)
 *   - animated road-grid shader plane underneath (streaming back along +X)
 *   - particle streaks flowing past the camera, suggesting speed
 *   - scene fog for atmospheric depth
 *   - scroll-coupled camera orbit (front-3/4 → side → rear-3/4) across the hero saga
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
  // Atmospheric depth — pulls the far end of the road into the navy hero bg.
  scene.fog = new THREE.FogExp2(0x080B12, 0.06);

  var camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 200);
  camera.position.set(4.5, 1.6, 6);
  camera.lookAt(0, 0, 0);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else renderer.outputEncoding = THREE.sRGBEncoding;
  mount.appendChild(renderer.domElement);

  // ── Lights ────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  var key = new THREE.DirectionalLight(0xfff2dd, 1.7);
  key.position.set(5, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1; key.shadow.camera.far = 30;
  key.shadow.camera.left = -8; key.shadow.camera.right = 8;
  key.shadow.camera.top = 8; key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0001;
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x4DA3FF, 0.9);
  rim.position.set(-6, 3, -4);
  scene.add(rim);
  var underLight = new THREE.PointLight(0x4DA3FF, 0.6, 8, 2);
  underLight.position.set(0, -0.5, 0);
  scene.add(underLight);

  // ── Procedural envMap (city-like) ─────────────────────────────────────
  function buildEnvMap() {
    var envScene = new THREE.Scene();
    function block(color, x, y, z, w, h, d) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: color }));
      m.position.set(x, y, z); envScene.add(m);
    }
    block(0x1a2536, 0,  -2, 0, 60, 0.1, 60);
    block(0x6e7a8a, 0,  12, 0, 60, 0.1, 60);
    block(0x9aa6b8, -8,  4,  0, 0.1, 7, 16);
    block(0x4e6280,  8,  4,  0, 0.1, 7, 16);
    block(0xffeac0,  3,  6,  4, 1.2, 0.4, 3);
    block(0xc8d6ff, -4,  7, -3, 3, 0.4, 1.2);
    block(0xffeac0,  6,  3,  -8, 0.4, 4, 1);
    block(0xc8d6ff, -8,  5,  6, 0.4, 4, 1);

    var pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    var tex = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
    return tex;
  }
  scene.environment = buildEnvMap();

  // ── Animated road grid below the truck ────────────────────────────────
  var roadUniforms = { time: { value: 0 }, color: { value: new THREE.Color(0x4DA3FF) } };
  var roadMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: roadUniforms,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform float time;',
      'uniform vec3 color;',
      'varying vec2 vUv;',
      'void main(){',
      '  vec2 g = vUv * vec2(8.0, 40.0);',
      '  g.y -= time * 6.0;',
      '  vec2 gf = abs(fract(g) - 0.5);',
      '  float lineX = 1.0 - smoothstep(0.0, 0.04, gf.x);',
      '  float lineY = 1.0 - smoothstep(0.0, 0.06, gf.y);',
      '  float lines = max(lineX * 0.4, lineY * 0.7);',
      '  float fadeY = 1.0 - smoothstep(0.0, 0.5, abs(vUv.y - 0.5) * 2.0);',
      '  float fadeX = 1.0 - smoothstep(0.7, 1.0, abs(vUv.x - 0.5) * 2.0);',
      '  float a = lines * fadeY * fadeX * 0.55;',
      '  gl_FragColor = vec4(color, a);',
      '}'
    ].join('\n')
  });
  var road = new THREE.Mesh(new THREE.PlaneGeometry(70, 26, 1, 1), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.rotation.z = Math.PI / 2;
  road.position.y = -1.42;
  scene.add(road);

  // Soft elliptical contact shadow under the truck
  var shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false });
  var contactShadow = new THREE.Mesh(new THREE.CircleGeometry(3.6, 48), shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = -1.38;
  scene.add(contactShadow);

  // ── Speed-streak particles ─────────────────────────────────────────────
  var streakCount = isMobile ? 240 : 700;
  var streakGeo = new THREE.BufferGeometry();
  var streakPos = new Float32Array(streakCount * 3);
  var streakSpeed = new Float32Array(streakCount);
  for (var i = 0; i < streakCount; i++) {
    streakPos[i * 3]     = (Math.random() - 0.5) * 60;
    streakPos[i * 3 + 1] = Math.random() * 6 + 0.5;
    streakPos[i * 3 + 2] = (Math.random() - 0.5) * 22;
    streakSpeed[i] = 4 + Math.random() * 8;
  }
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  var streakMat = new THREE.PointsMaterial({
    color: 0xb6d4ff, size: 0.04, transparent: true, opacity: 0.65,
    sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  var streaks = new THREE.Points(streakGeo, streakMat);
  scene.add(streaks);

  // ── Load the truck ─────────────────────────────────────────────────────
  var truckGroup = new THREE.Group();
  scene.add(truckGroup);
  var wheels = [];
  var headlights = [];

  function isLikelyGlassMaterial(m, nodeName) {
    var n = ((m.name || '') + ' ' + nodeName).toLowerCase();
    if (n.indexOf('glass') !== -1) return true;
    if (n.indexOf('window') !== -1) return true;
    if (n.indexOf('windshield') !== -1) return true;
    if (n.indexOf('shield') !== -1) return true;
    if (n.indexOf('pane') !== -1) return true;
    if (typeof m.transmission === 'number' && m.transmission > 0.1) return true;
    if (m.transparent && m.opacity > 0 && m.opacity < 0.95 && (m.roughness === undefined || m.roughness < 0.25)) return true;
    return false;
  }
  function isLikelyLightMaterial(m, nodeName) {
    var n = ((m.name || '') + ' ' + nodeName).toLowerCase();
    return n.indexOf('light') !== -1 || n.indexOf('lamp') !== -1 || n.indexOf('headlamp') !== -1 || n.indexOf('headlight') !== -1;
  }
  function isLikelyWheelNode(o) {
    var n = (o.name || '').toLowerCase();
    return n.indexOf('wheel') !== -1 || n.indexOf('tire') !== -1 || n.indexOf('rim') !== -1;
  }

  var loader = new THREE.GLTFLoader();
  loader.load('models/tesla-semi-web.glb', function (gltf) {
    var truck = gltf.scene;
    truck.scale.setScalar(1.5);
    truck.position.set(0, -0.7, 0);

    truck.traverse(function (o) {
      if (isLikelyWheelNode(o)) wheels.push(o);

      if (!o.isMesh || !o.material) return;
      o.castShadow = true;
      o.receiveShadow = true;
      var mats = Array.isArray(o.material) ? o.material : [o.material];

      mats.forEach(function (m) {
        m.envMapIntensity = 1.7;

        if (isLikelyGlassMaterial(m, o.name)) {
          m.transparent = true;
          m.opacity = 0.62;
          if (m.color) m.color.setHex(0x12253d);
          if (typeof m.roughness === 'number') m.roughness = 0.03;
          if (typeof m.metalness === 'number') m.metalness = 0.25;
          m.envMapIntensity = 2.4;
          m.depthWrite = false;
          m.side = THREE.DoubleSide;
        } else if (isLikelyLightMaterial(m, o.name)) {
          if (!m.emissive) m.emissive = new THREE.Color();
          m.emissive.setHex(0xfff2c8);
          m.emissiveIntensity = 1.6;
          headlights.push(m);
        }
      });
    });

    truckGroup.add(truck);
  }, undefined, function (err) {
    console.warn('Tesla Semi model failed to load — drop tesla-semi-web.glb into public/models/.', err);
  });

  // ── Mouse parallax (subtle, on top of the scroll-orbit) ─────────────────
  var pointer = { x: 0, y: 0 };
  if (!isMobile && !reduce) {
    window.addEventListener('mousemove', function (e) {
      pointer.x = (e.clientX / innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / innerHeight) * 2 + 1;
    });
  }

  // ── Scroll-coupled camera orbit (front-3/4 → side → rear-3/4) ──────────
  var saga = document.getElementById('hero-saga');
  var keyframes = [
    { angle: Math.atan2(6, 4.5),  radius: 7.5, height: 1.6, look: 0.3 },
    { angle: Math.PI,             radius: 7.0, height: 1.5, look: 0.3 },
    { angle: Math.PI * 1.35,      radius: 7.5, height: 2.0, look: 0.3 }
  ];
  var cameraProgress = 0;
  function sampleCamera(p) {
    p = Math.max(0, Math.min(1, p));
    var seg, t;
    if (p < 0.5) { seg = 0; t = p / 0.5; }
    else         { seg = 1; t = (p - 0.5) / 0.5; }
    var e = t * t * (3 - 2 * t);
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
  }
  window.addEventListener('resize', resize);

  // ── Animation loop ─────────────────────────────────────────────────────
  var prev = performance.now();
  var t0 = prev;
  var camAngle = keyframes[0].angle, camRadius = keyframes[0].radius;
  var camHeight = keyframes[0].height, camLook = keyframes[0].look;

  var speed = reduce ? 0 : 8;                    // virtual road speed (units/sec)
  var wheelRadius = 0.66;                        // approximate post-scale wheel radius
  var wheelOmega = speed / wheelRadius;          // rolling angular velocity

  function tick(now) {
    var delta = Math.min((now - prev) / 1000, 0.05);
    prev = now;
    var t = (now - t0) / 1000;

    var floatBob = Math.sin(t * 0.9) * 0.018;
    truckGroup.position.y = -0.7 + floatBob;

    if (!reduce) {
      for (var i = 0; i < wheels.length; i++) {
        wheels[i].rotation.x += wheelOmega * delta;
      }
    }

    roadUniforms.time.value = t;
    if (headlights.length) {
      var pulse = 1.4 + Math.sin(t * 2.0) * 0.15;
      for (var h = 0; h < headlights.length; h++) headlights[h].emissiveIntensity = pulse;
    }

    if (!reduce) {
      var pos = streakGeo.attributes.position.array;
      for (var s = 0; s < streakCount; s++) {
        var ix = s * 3;
        pos[ix] -= streakSpeed[s] * delta;
        if (pos[ix] < -30) {
          pos[ix] = 30;
          pos[ix + 1] = Math.random() * 6 + 0.5;
          pos[ix + 2] = (Math.random() - 0.5) * 22;
        }
      }
      streakGeo.attributes.position.needsUpdate = true;
    }

    if (isMobile || reduce) {
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
      var px = pointer.x * 0.3;
      var py = pointer.y * 0.12;
      camera.position.set(
        Math.cos(camAngle) * camRadius + px,
        camHeight + py,
        Math.sin(camAngle) * camRadius
      );
      camera.lookAt(0, camLook, 0);
      truckGroup.rotation.y = 0;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  renderer.domElement.style.opacity = 0;
  renderer.domElement.style.transition = 'opacity 1.2s ease';
  function reveal() { renderer.domElement.style.opacity = 1; }
  window.addEventListener('loader:done', reveal);
  setTimeout(reveal, 2000);

  resize();
  setTimeout(resize, 100);
  setTimeout(resize, 600);
  requestAnimationFrame(tick);
})();
