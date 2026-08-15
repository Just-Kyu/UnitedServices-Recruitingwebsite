/* Hero reveal — raw WebGL1, no library.
 *
 * A liquid-metal blob follows the pointer across the truck mark. Where it
 * crosses white paper it reads as solid ink; where it crosses the black truck
 * it inverts to bright chrome — so the same blob is black on white and white
 * on black, exactly like the reference. On a strictly two-colour site the
 * "reveal" layer is just the inverse of the cover, so one image does the work
 * of two and the layers can never fall out of register.
 *
 * Pass 1 — trail. Ping-ponged FBOs at a fixed 320x320. The previous frame is
 * multiplied by DECAY and a capsule brush is stamped along the segment from
 * the last pointer position to the current one, so fast movement leaves no
 * dotted gaps. The brush radius is modulated by noise so the edge is organic
 * rather than a perfect sausage.
 *
 * Pass 2 — composite. The mask is domain-warped by value noise, then a fake
 * surface normal is derived from its gradient and lit with a banded greyscale
 * environment. That normal is what sells it as liquid metal instead of a flat
 * cut-out: highlights bend around the blob's curvature and pool at the rim.
 *
 * D13: every framebuffer is cleared at creation AND on every resize. An
 * uninitialised texture can read back filled, which saturates the mask and
 * permanently displays the reveal layer. `?maskdebug=1` renders the raw trail
 * instead of compositing — it must read pure black at rest.
 */

const TRAIL = 320;
const DECAY = 0.986;   // long liquid tail
const BRUSH = 0.082;   // capsule radius in trail-UV space

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const TRAIL_FRAG = `
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uA;
uniform vec2 uB;
uniform float uDecay;
uniform float uRadius;
uniform float uActive;
uniform float uTime;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
void main() {
  float prev = texture2D(uPrev, vUv).r * uDecay;
  // Organic radius: the blob bulges and pinches instead of being a sausage.
  float wob = noise(vUv * 5.0 + uTime * 0.25) * 0.45 + 0.78;
  float d = segDist(vUv, uA, uB);
  float r = uRadius * wob;
  float brush = uActive * (1.0 - smoothstep(r * 0.25, r, d));
  float v = clamp(max(prev, brush), 0.0, 1.0);
  gl_FragColor = vec4(v, v, v, 1.0);
}`;

const COMP_FRAG = `
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uTrail;
uniform vec2 uScale;
uniform vec2 uOffset;
uniform float uTime;
uniform float uDebug;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { return noise(p) * 0.62 + noise(p * 2.03 + 5.1) * 0.38; }

float maskAt(vec2 uv) {
  vec2 warp = vec2(fbm(uv * 5.0 + uTime * 0.05),
                   fbm(uv * 5.0 + 17.3 - uTime * 0.04)) - 0.5;
  return texture2D(uTrail, clamp(uv + warp * 0.045, 0.0, 1.0)).r;
}

void main() {
  float raw = maskAt(vUv);
  if (uDebug > 0.5) { gl_FragColor = vec4(vec3(raw), 1.0); return; }

  float mask = smoothstep(0.33, 0.42, raw);

  // Fake surface normal from the mask gradient — this is what makes the blob
  // read as a liquid volume rather than a flat stencil.
  float e = 0.004;
  float gx = maskAt(vUv + vec2(e, 0.0)) - maskAt(vUv - vec2(e, 0.0));
  float gy = maskAt(vUv + vec2(0.0, e)) - maskAt(vUv - vec2(0.0, e));
  vec3 n = normalize(vec3(-gx * 7.0, -gy * 7.0, 0.55));

  // Banded greyscale environment: chrome reflections, no colour on this site.
  float bands = 0.5 + 0.5 * sin(n.x * 16.0 + n.y * 11.0 + uTime * 0.6);
  float sheen = 0.5 + 0.5 * n.y;
  float chrome = clamp(bands * 0.55 + sheen * 0.55, 0.0, 1.0);
  chrome = smoothstep(0.12, 0.88, chrome);

  // object-fit: contain, matching the <img> underneath
  vec2 iuv = (vUv - uOffset) / uScale;
  vec3 base = vec3(1.0);   // outside the image is paper, not void
  if (iuv.x >= 0.0 && iuv.x <= 1.0 && iuv.y >= 0.0 && iuv.y <= 1.0) {
    base = texture2D(uImage, vec2(iuv.x, 1.0 - iuv.y)).rgb;
  }

  vec3 inv = vec3(1.0) - base;
  vec3 col = mix(base, inv, mask);

  // Chrome belongs to the MARK, not the paper. Over white the blob stays solid
  // ink; only where it crosses the black truck does it turn to liquid metal.
  // Without this the trail reads as a silver snake floating over the page.
  float onMark = 1.0 - dot(base, vec3(0.2126, 0.7152, 0.0722));
  float curve = clamp(length(vec2(gx, gy)) * 12.0, 0.0, 1.0);
  float metal = mask * onMark * mix(0.25, 1.0, curve);
  col = mix(col, vec3(chrome), metal);

  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('[hero] shader:', gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

function program(gl, fragSrc) {
  const v = compile(gl, gl.VERTEX_SHADER, VERT);
  const f = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!v || !f) return null;
  const p = gl.createProgram();
  gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.warn('[hero] link:', gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

function makeTarget(gl, size) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  // D13: an uninitialised texture can read back filled. Clear it, always.
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fbo };
}

export function initHeroReveal() {
  const stage = document.querySelector('[data-hero-stage]');
  const canvas = document.getElementById('hero-canvas');
  const img = document.getElementById('hero-img');
  if (!stage || !canvas || !img) return;

  const debug = new URLSearchParams(location.search).get('maskdebug') === '1';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Reduced motion: the still mark is the whole hero. No canvas, no loop.
  if (reduce) return;

  const start = () => {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false })
            || canvas.getContext('experimental-webgl', { alpha: false, antialias: false, depth: false });
    // No WebGL: the <img> already on screen stays. Never a blank canvas.
    if (!gl) return;

    const trailProg = program(gl, TRAIL_FRAG);
    const compProg = program(gl, COMP_FRAG);
    if (!trailProg || !compProg) return;

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const bindQuad = prog => {
      const loc = gl.getAttribLocation(prog, 'aPos');
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    };

    let a = makeTarget(gl, TRAIL), b = makeTarget(gl, TRAIL);

    const imgTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, imgTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    // NPOT-safe in WebGL1: clamp + linear, no mipmaps.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    stage.dataset.webgl = 'on';

    let w = 0, h = 0, scale = [1, 1], offset = [0, 0];

    // Map the <img>'s painted rect into stage space, so the shader draws the
    // truck exactly where the DOM put it however the layout moves.
    function measure() {
      const sr = stage.getBoundingClientRect();
      const ir = img.getBoundingClientRect();
      if (!sr.width || !sr.height) return;
      // The img is object-fit:contain inside its own box — find the real
      // painted area, which may be letterboxed inside that box.
      const ia = img.naturalWidth / img.naturalHeight;
      const ba = ir.width / ir.height;
      let pw = ir.width, ph = ir.height;
      if (ba > ia) pw = ir.height * ia; else ph = ir.width / ia;
      const px0 = ir.left + (ir.width - pw) / 2 - sr.left;
      const py0 = ir.top + (ir.height - ph) / 2 - sr.top;
      scale = [pw / sr.width, ph / sr.height];
      offset = [px0 / sr.width, 1 - (py0 + ph) / sr.height];
    }

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const cw = Math.round(stage.clientWidth * dpr);
      const ch = Math.round(stage.clientHeight * dpr);
      measure();
      if (cw === w && ch === h) return;   // only reallocate on a real change
      w = cw; h = ch;
      canvas.width = w; canvas.height = h;

      // D13: clear both buffers on resize too.
      for (const t of [a, b]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    let rt = null;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
    resize();
    // The canvas paints the truck itself from here on; leaving the <img>
    // visible underneath would double-draw it.
    img.style.visibility = 'hidden';

    // pointer state, in trail-UV space
    let px = 0.5, py = 0.5, qx = 0.5, qy = 0.5;
    let active = 0, everMoved = false;

    function setFromEvent(e) {
      const r = stage.getBoundingClientRect();
      qx = px; qy = py;
      px = (e.clientX - r.left) / r.width;
      py = 1 - (e.clientY - r.top) / r.height;
      active = 1;
      if (!everMoved) { everMoved = true; qx = px; qy = py; stage.dataset.touched = 'true'; }
    }
    // The blob should follow the cursor anywhere on the hero, not only over
    // the truck — the pointer box is the whole stage.
    stage.addEventListener('pointermove', setFromEvent);
    stage.addEventListener('pointerdown', setFromEvent);
    stage.addEventListener('pointerleave', () => { active = 0; });

    // No pointer (or nobody has touched it yet): drift a slow Lissajous path so
    // touch users see the effect instead of a dead image.
    function drift(t) {
      qx = px; qy = py;
      px = 0.5 + Math.sin(t * 0.38) * 0.22;
      py = 0.5 + Math.sin(t * 0.27 + 1.2) * 0.18;
      active = 1;
    }

    let visible = true;
    let raf = null;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && raf === null) { t0 = performance.now(); raf = requestAnimationFrame(frame); }
        else if (!visible && raf !== null) { cancelAnimationFrame(raf); raf = null; }
      }, { rootMargin: '80px' }).observe(stage);
    }

    let t0 = performance.now();
    function frame(now) {
      const t = (now - t0) / 1000;
      if (!everMoved) drift(t);

      // pass 1 → trail
      gl.bindFramebuffer(gl.FRAMEBUFFER, b.fbo);
      gl.viewport(0, 0, TRAIL, TRAIL);
      gl.useProgram(trailProg);
      bindQuad(trailProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, a.tex);
      gl.uniform1i(gl.getUniformLocation(trailProg, 'uPrev'), 0);
      gl.uniform2f(gl.getUniformLocation(trailProg, 'uA'), qx, qy);
      gl.uniform2f(gl.getUniformLocation(trailProg, 'uB'), px, py);
      gl.uniform1f(gl.getUniformLocation(trailProg, 'uDecay'), DECAY);
      gl.uniform1f(gl.getUniformLocation(trailProg, 'uRadius'), BRUSH);
      gl.uniform1f(gl.getUniformLocation(trailProg, 'uActive'), active);
      gl.uniform1f(gl.getUniformLocation(trailProg, 'uTime'), t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const tmp = a; a = b; b = tmp;

      // pass 2 → screen
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(compProg);
      bindQuad(compProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imgTex);
      gl.uniform1i(gl.getUniformLocation(compProg, 'uImage'), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, a.tex);
      gl.uniform1i(gl.getUniformLocation(compProg, 'uTrail'), 1);
      gl.uniform2f(gl.getUniformLocation(compProg, 'uScale'), scale[0], scale[1]);
      gl.uniform2f(gl.getUniformLocation(compProg, 'uOffset'), offset[0], offset[1]);
      gl.uniform1f(gl.getUniformLocation(compProg, 'uTime'), t);
      gl.uniform1f(gl.getUniformLocation(compProg, 'uDebug'), debug ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  };

  if (img.complete && img.naturalWidth) start();
  else img.addEventListener('load', start, { once: true });
}
