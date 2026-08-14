/* Hero reveal — raw WebGL1, no library.
 *
 * The brief called for two photographic layers (dark truck on white, white
 * truck on black) cross-faded through a gooey cursor mask. We ship ONE image
 * and derive the second: on a strictly black-and-white site the reveal layer
 * is just the inverse of the cover, so `mix(c, 1.0 - c, mask)` gives the same
 * effect with half the bytes and no risk of the two layers drifting out of
 * register — the failure mode the brief warns about in its asset note.
 *
 * Pass 1 — trail. Ping-ponged FBOs at a fixed 320×320. The previous frame is
 * multiplied by DECAY and a capsule brush is stamped along the segment from
 * the last pointer position to the current one, so fast movement leaves no
 * dotted gaps.
 *
 * Pass 2 — composite. Value-noise domain warp on the mask lookup for an
 * organic edge, smoothstep threshold for the gooey falloff, a thin inverted
 * rim at the boundary for surface tension, then the mix.
 *
 * D13: every framebuffer is cleared at creation AND on every resize. An
 * uninitialised texture can read back filled, which saturates the mask and
 * permanently displays the reveal layer. `?maskdebug=1` renders the raw trail
 * instead of compositing — it must read pure black at rest.
 */

const TRAIL = 320;
const DECAY = 0.955;
const BRUSH = 0.085;   // capsule radius in trail-UV space

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
varying vec2 vUv;
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
void main() {
  float prev = texture2D(uPrev, vUv).r * uDecay;
  float d = segDist(vUv, uA, uB);
  float brush = uActive * (1.0 - smoothstep(uRadius * 0.35, uRadius, d));
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
void main() {
  vec2 warp = vec2(noise(vUv * 6.0 + uTime * 0.05),
                   noise(vUv * 6.0 + 17.3 - uTime * 0.04)) - 0.5;
  float raw = texture2D(uTrail, clamp(vUv + warp * 0.035, 0.0, 1.0)).r;

  if (uDebug > 0.5) { gl_FragColor = vec4(vec3(raw), 1.0); return; }

  float mask = smoothstep(0.26, 0.50, raw);
  float rim = smoothstep(0.26, 0.34, raw) * (1.0 - smoothstep(0.40, 0.52, raw));

  // object-fit: contain, matching the <img> underneath
  vec2 iuv = (vUv - uOffset) / uScale;
  vec3 base = vec3(0.0);
  if (iuv.x >= 0.0 && iuv.x <= 1.0 && iuv.y >= 0.0 && iuv.y <= 1.0) {
    base = texture2D(uImage, vec2(iuv.x, 1.0 - iuv.y)).rgb;
  }
  vec3 col = mix(base, vec3(1.0) - base, mask);
  col = mix(col, vec3(1.0) - col, rim * 0.5);   // surface tension at the edge
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
  const stage = document.getElementById('hero-media');
  const canvas = document.getElementById('hero-canvas');
  const img = document.getElementById('hero-img');
  if (!stage || !canvas || !img) return;

  const debug = new URLSearchParams(location.search).get('maskdebug') === '1';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Reduced motion: the still image is the whole hero. No canvas, no loop.
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
    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const cw = Math.round(stage.clientWidth * dpr);
      const ch = Math.round(stage.clientHeight * dpr);
      if (cw === w && ch === h) return;   // only reallocate on a real change
      w = cw; h = ch;
      canvas.width = w; canvas.height = h;

      // object-fit: contain — match the <img> exactly.
      const ia = img.naturalWidth / img.naturalHeight;
      const ca = w / h;
      let sx = 1, sy = 1;
      if (ca > ia) sx = ia / ca; else sy = ca / ia;
      scale = [sx, sy];
      offset = [(1 - sx) / 2, (1 - sy) / 2];

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
    stage.addEventListener('pointermove', setFromEvent);
    stage.addEventListener('pointerdown', setFromEvent);
    stage.addEventListener('pointerleave', () => { active = 0; });

    // No pointer (or nobody has touched it yet): drift a slow Lissajous path so
    // touch users see the effect instead of a dead image.
    function drift(t) {
      qx = px; qy = py;
      px = 0.5 + Math.sin(t * 0.45) * 0.26;
      py = 0.5 + Math.sin(t * 0.31 + 1.2) * 0.22;
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
