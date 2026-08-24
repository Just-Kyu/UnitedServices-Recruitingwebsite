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
  // MUST match the CSS breakpoint pair (max-width:760 hides #truck-stage,
  // min-width:761 is desktop) — `< 760` left exactly-760px windows running the
  // full WebGL loop into a display:none canvas with a 0-width (NaN) aspect.
  var isMobile = innerWidth < 761;

  // Mobile gets the pure-CSS animated route map instead of the 3D truck — so
  // don't spin up WebGL, load the GLB, or run a render loop here at all.
  if (isMobile) return;

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

  // Lights: dim ambient + a key that ORBITS WITH THE CAMERA (so the shadow
  // direction rotates as you scroll) + a rim and a fill, both fixed so the
  // body never goes flat. All neutral white — the old warm key, steel-blue
  // rim and pink fill were tinting a black-and-white page.
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));
  var key = new THREE.DirectionalLight(0xffffff, 1.6);
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
  var rim = new THREE.DirectionalLight(0xffffff, 0.85);
  rim.position.set(-6, 3, -4);
  scene.add(rim);
  var fill = new THREE.DirectionalLight(0xffffff, 0.35);
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
    // Neutral greyscale studio — the site is black and white, and the old
    // navy floor + warm/cool strips were reflecting colour into the glass.
    //
    // These sources are deliberately BROAD. A previous pass made them narrow
    // to get crisp highlights, but a narrow source reflected in near-mirror
    // glass is a hairline — and hairlines across a windshield read as cracks.
    // Wide, soft softboxes give the pane a gradient to sit in instead.
    block(0x0a0a0a, 0,  -2,  0, 60, 0.1, 60);                   // floor — near black
    block(0x2a2a2a, 0,  11,  0, 60, 0.1, 60);                   // ceiling — dim
    block(0x171717, -9,  4,  0, 0.1, 8, 16);                    // left fill (dark)
    block(0x171717,  9,  4,  0, 0.1, 8, 16);                    // right fill (dark)
    block(0xdedede, -5,  8, -1, 3.2, 2.2, 14);                  // key softbox — broad
    block(0xc8c8c8,  6,  7,  3, 2.6, 1.8, 11);                  // fill softbox
    block(0xd6d6d6,  0,  9,  7, 12,  2.0, 3.0);                 // front softbox (windshield)

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

  // Drive-off finale state
  var lastCanvasFade = 0;              // last dissolve written to the canvas (0 = fully visible)
  var NOSE_DIR = -1;                   // +1 / -1 : which way along its length the truck drives
  var NOSE_ADJ = 0;                    // radians: fine-tune the heading to the true nose axis

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
      // The Meshopt build palette-bakes material names away: the whole
      // glasshouse (windshield + door panes + quarter windows — the original
      // "Glass" mesh) arrives as node Truck_1 with material
      // "PaletteMaterial002", opaque, nothing called "glass" anywhere. Match it
      // explicitly or NO pane in this build ever gets the glass treatment.
      if (tag.indexOf('palettematerial002') !== -1) return true;
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

    // One shared glass material for every pane: dark tinted automotive glass.
    //
    // The earlier "solid" tuning killed roughness and specular to stop a milky
    // wash — but matte IS paint, which is why it stopped reading as glass. The
    // real fix is SHARP rather than absent: near-zero roughness plus a real
    // specular response gives tight, curved highlights that track the body,
    // while the near-black tint keeps the pane dark face-on. Broad soft
    // reflections smear; narrow sharp ones read as glass. (The env map is
    // built from narrow strips for exactly this reason.)
    //
    // Colour is a true neutral — any blue in the hex tints the whole pane on
    // a black-and-white page.
    var glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x050505,
      metalness: 0.0,            // dielectric: reflections come via fresnel
      // Roughness is a balance, not a race to zero. At 0.05 the pane is a
      // near-perfect mirror, and against narrow light sources that produces
      // hairline-thin highlights that read as CRACKS across the glass. Enough
      // blur to spread them into soft bands, still glossy enough to be glass.
      roughness: 0.16,
      clearcoat: 1.0,            // second specular layer, like laminated glass
      clearcoatRoughness: 0.12,
      specularIntensity: 0.7,
      envMapIntensity: 0.30,
      // You have to be able to SEE INTO a windshield or it reads as a painted
      // panel with a gloss coat. This is what the cabin lining below exists
      // for — without something dark behind it, letting light through would
      // just expose the white inside of the far body shell.
      transparent: true,
      opacity: 0.80,
      depthWrite: false,
      side: THREE.DoubleSide     // the GLB panes are doubleSided; FrontSide would open holes
    });

    truck.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      o.castShadow = !isMobile;
      o.receiveShadow = !isMobile;
      var tag = nameTag(o.material, o.name);
      var mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(function (m, mi) {
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
          // Swap the pane to the shared physical glass material. Keep the GLB's
          // own smooth vertex normals — recomputing them from the
          // meshopt-simplified triangles (long, skinny) makes the reflections
          // wobble into angular streaks across the windshield. Only derive
          // normals if the file genuinely shipped without them.
          if (Array.isArray(o.material)) o.material[mi] = glassMat;
          else o.material = glassMat;
          if (o.geometry && o.geometry.attributes && !o.geometry.attributes.normal) {
            o.geometry.computeVertexNormals();
          }
        } else if (isLightish(mtag)) {
          if (!m.emissive) m.emissive = new THREE.Color();
          m.emissive.setHex(0xfff6e0);
          m.emissiveIntensity = 0.9;
        }
      });
    });

    // ── Cabin interior ──────────────────────────────────────────────────
    // The GLB is a hollow shell and every material ships doubleSided, so
    // through the glass you were seeing the WHITE backfaces of the far body
    // panel. Fix it at the source: render the body front-faces only, and add
    // one dark back-face pass over the same geometry.
    //
    // An earlier attempt cloned each glass pane and scaled it 0.8% inward,
    // but scaling runs toward the mesh ORIGIN, not along the surface — so on
    // panes whose origin sits off to one side the lining slid sideways and
    // peeked out past the glass edge. Those mismatched slivers are what read
    // as cracked panels. Sharing the body's exact geometry has no such gap.
    (function addCabinInterior() {
      var shells = [];
      truck.traverse(function (o) {
        if (o.isMesh && o.material && o.material !== glassMat) {
          var t = nameTag(o.material, o.name);
          if (!isWheelish(t) && !isLightish(t)) shells.push(o);
        }
      });
      shells.forEach(function (shell) {
        var mats = Array.isArray(shell.material) ? shell.material : [shell.material];
        mats.forEach(function (m) { m.side = THREE.FrontSide; });
        var inner = new THREE.Mesh(shell.geometry, new THREE.MeshStandardMaterial({
          color: 0x060606,
          roughness: 1.0,
          metalness: 0.0,
          side: THREE.BackSide
        }));
        inner.castShadow = false;
        inner.receiveShadow = false;
        shell.add(inner);          // same transform, so geometry matches exactly
      });
    })();

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

  // Scroll-coupled camera orbit — the truck stays put while the camera travels
  // front-3/4 → driver 3/4 → SIDE across the .hero-saga section, ending on a
  // clean side profile so the finale can drive the truck off screen-length.
  var saga = document.getElementById('hero-saga');
  var keyframes = [
    { angle: Math.atan2(6, 4.5),  radius: 7.5, height: 1.6,  look: 0.4 },  // front-3/4 (right-front)
    { angle: 1.75,                radius: 7.2, height: 1.5,  look: 0.35 }, // driver 3/4
    { angle: 2.55,                radius: 6.9, height: 1.3,  look: 0.22 }  // side profile (≈⊥ to the truck's length)
  ];
  var cameraProgress = 0;
  var dirty = true; // render-on-demand flag (mobile only renders when this is set)
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function sampleCamera(p) {
    p = Math.max(0, Math.min(1, p));
    var seg, t;
    if (p < 0.5) { seg = 0; t = p / 0.5; }
    else         { seg = 1; t = (p - 0.5) / 0.5; }
    var e = smoothstep(t);
    var a = keyframes[seg], b = keyframes[seg + 1];
    return {
      angle:  a.angle  + (b.angle  - a.angle)  * e,
      radius: a.radius + (b.radius - a.radius) * e,
      height: a.height + (b.height - a.height) * e,
      look:   a.look   + (b.look   - a.look)   * e
    };
  }
  var driveProgress = 0;
  function updateCameraProgress() {
    // Desktop only. Mobile holds a static framed shot (no scroll orbit) — a
    // sticky, scroll-driven WebGL canvas just won't composite smoothly on iOS.
    if (!saga || isMobile) { cameraProgress = 0; driveProgress = 0; return; }
    var rect = saga.getBoundingClientRect();
    var vh = innerHeight;
    // Timing (saga = 280svh, so the stage unpins at -rect.top = 1.8vh; the
    // matcher is pulled up -24svh, so its SOLID top edge starts rising over
    // the stage at -rect.top = 1.56vh). The orbit fills the first 1.12vh
    // (front → side, arriving as scene 3 lands); the truck then drives off
    // over 0.42vh and is FULLY faded by 1.54vh — just before the matcher's
    // edge reaches it. That ordering is what prevents the ugly horizontal
    // slice across the truck during the hand-off.
    var orbitable = vh * 1.12;
    // Reduced motion holds the static opening shot (no orbit, no drive-off
    // motion) but KEEPS the dissolve schedule below — otherwise the matcher
    // would rise over a parked, fully-opaque truck and slice it, the exact
    // artifact the dissolve exists to prevent.
    var next = reduce ? 0 : Math.max(0, Math.min(1, -rect.top / orbitable));
    if (next !== cameraProgress) { cameraProgress = next; dirty = true; }
    var drive = Math.max(0, Math.min(1, (-rect.top - orbitable) / (vh * 0.42)));
    if (drive !== driveProgress) { driveProgress = drive; dirty = true; }
  }
  window.addEventListener('scroll', updateCameraProgress, { passive: true });
  updateCameraProgress();

  // Finale: after the orbit finishes, the last stretch of hero scroll rolls the
  // truck OUT OF FRAME to the right and fades it — so it drives off as scene 3's
  // copy lands instead of parking on top of it. The camera keeps its scene-3
  // frame (no follow), so the truck genuinely exits screen-right.
  // Dissolve the canvas over the drive's last stretch (p 0.72 → 1), finishing
  // at p=1 — i.e. BEFORE the matcher section rises over the stage (see the
  // timing note in updateCameraProgress). Fade the CANVAS, not the materials:
  // per-material transparency made the doubleSided glass bleed through the
  // half-faded body as a gray wedge, and left the ground shadow at full
  // strength after the truck vanished (shadow maps ignore material opacity).
  // CSS opacity dissolves truck + glass + shadow as one image. Runs on every
  // desktop path — including reduced-motion, where it's the only exit effect.
  function updateCanvasDissolve() {
    var fade = smoothstep(Math.max(0, Math.min(1, (driveProgress - 0.72) / 0.28)));
    if (fade !== lastCanvasFade) applyCanvasFade(fade);
  }

  function driveOff() {
    updateCanvasDissolve();
    var p = driveProgress;
    if (p <= 0) {
      // Parked (top of the drive zone / scrolled back up): HARD-reset the
      // drive pose so nothing can get stuck small/off-center. (The dissolve
      // above already restored full opacity — fade is 0 here.)
      truckGroup.position.x = 0; truckGroup.position.z = 0; truckGroup.rotation.y = 0;
      return;
    }
    // Quadratic ease-in = constant acceleration, exactly how a truck pulls away
    // from a stop: it starts slow and smoothly gathers speed, crossing the frame
    // over the whole scene-3 scroll and clearing the edge right at the end. (The
    // old cubic launch blasted it off in the first 40% and left an empty stage.)
    var e = p * p;
    // Drive NOSE-FIRST along the truck's own length. Its nose points toward the
    // front-3/4 azimuth; scene-3's camera sits ~perpendicular to that, so this
    // motion carries the truck straight across frame showing its full side.
    var na = keyframes[0].angle + NOSE_ADJ;
    var nx = Math.cos(na), nz = Math.sin(na);
    var SPEED = 7;   // tuned so it's still clearing the edge at the very end of the scroll
    truckGroup.position.x = nx * SPEED * e * NOSE_DIR;
    truckGroup.position.z = nz * SPEED * e * NOSE_DIR;
    truckGroup.rotation.y = 0;
    // Gentle camera lead: the gaze drifts a touch after the departing truck then
    // eases back — adds life without yanking the frame.
    var follow = Math.sin(Math.min(1, p * 1.25) * Math.PI) * 0.18;
    camera.lookAt(nx * SPEED * e * NOSE_DIR * follow, camLook, nz * SPEED * e * NOSE_DIR * follow);

  }

  function resize() {
    isMobile = innerWidth < 761;   // keep in sync with the CSS 760/761 breakpoint pair
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
      // Reduced-motion desktop still dissolves before the matcher hand-off;
      // and if a resize flipped us to mobile mid-fade, driveProgress is 0 now
      // so this same call restores full opacity instead of leaving it stale.
      updateCanvasDissolve();
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
      // Key light orbits with the camera at a fixed -0.5 rad offset
      // (the "sun" is just to the left of camera POV). The shadow under
      // the truck rotates as you scroll instead of pointing the same way.
      var lightAngle = camAngle - 0.5;
      key.position.set(Math.cos(lightAngle) * 11, 9, Math.sin(lightAngle) * 11);
      driveOff();   // camera holds its scene-3 frame; the truck rolls out of it
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

  // Single owner of the canvas' inline opacity. Pre-reveal, dissolve state is
  // only RECORDED (lastCanvasFade) and the canvas stays hidden — so a page
  // restored deep in the saga can't unhide an unloaded stage or kill the
  // reveal's ease. Post-reveal, writes land directly; the first one drops the
  // reveal transition since scroll-driven opacity must track instantly.
  var revealed = false;
  function applyCanvasFade(fade) {
    lastCanvasFade = fade;
    if (!revealed) return;
    renderer.domElement.style.transition = 'none';
    renderer.domElement.style.opacity = 1 - fade;
  }

  // Fade in once loaded (loader event from site.js). Reveals to
  // 1 - lastCanvasFade, not a blind 1, so the 2s fallback can't flash a
  // dissolved truck back over the matcher section.
  renderer.domElement.style.opacity = 0;
  renderer.domElement.style.transition = 'opacity 1.2s ease';
  function reveal() {
    revealed = true;
    renderer.domElement.style.opacity = 1 - lastCanvasFade;
  }
  window.addEventListener('loader:done', reveal);
  setTimeout(reveal, 2000);

  resize();
  // Late-layout safety: re-measure after the saga's sticky/absolute children
  // have settled. Without this, the canvas can boot at 0×0 in some browsers.
  setTimeout(resize, 100);
  setTimeout(resize, 600);
  requestAnimationFrame(tick);
})();
