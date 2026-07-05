#!/usr/bin/env python3
"""Generate the mobile route-map SVG from us-atlas states-albers-10m.json
and splice it into public/index.html.

- Decodes TopoJSON arcs (quantized deltas -> absolute 975x610 albers coords)
- Simplifies per-arc (Douglas-Peucker) so shared state borders stay welded
- Labels every state with its biggest city at the city's true projected spot
- Draws freight lanes + pulses between 10 hub cities
"""
import json, math, re

SRC = "states-albers-10m.json"  # from https://registry.npmjs.org/us-atlas (v3), not committed
HTML = "public/index.html"   # run from the repo root
TOL = 1.15          # DP simplification tolerance, projected units (975-wide space)
SKIP = {"11"}       # DC: shape kept out entirely (invisible sliver at this scale)

# ---------------- topojson decode ----------------
topo = json.load(open(SRC))
tr = topo["transform"]; sx, sy = tr["scale"]; tx, ty = tr["translate"]

def decode_arc(arc):
    pts, x, y = [], 0, 0
    for dx, dy in arc:
        x += dx; y += dy
        pts.append((x * sx + tx, y * sy + ty))
    return pts

raw_arcs = [decode_arc(a) for a in topo["arcs"]]

def dp(pts, tol):
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    if pts[0] == pts[-1]:
        # closed ring: the baseline is degenerate — anchor the point farthest
        # from the start so DP has real segments to recurse on
        ax, ay = pts[0]
        imax = max(range(1, len(pts) - 1),
                   key=lambda i: (pts[i][0] - ax) ** 2 + (pts[i][1] - ay) ** 2)
        keep[imax] = True
        stack = [(0, imax), (imax, len(pts) - 1)]
    else:
        stack = [(0, len(pts) - 1)]
    while stack:
        i0, i1 = stack.pop()
        ax, ay = pts[i0]; bx, by = pts[i1]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy) or 1e-12
        dmax, imax = -1.0, -1
        for i in range(i0 + 1, i1):
            px, py = pts[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if d > dmax: dmax, imax = d, i
        if dmax > tol:
            keep[imax] = True
            stack.append((i0, imax)); stack.append((imax, i1))
    return [p for p, k in zip(pts, keep) if k]

arcs = [dp(a, TOL) for a in raw_arcs]

def ring_coords(ring):
    out = []
    for idx in ring:
        a = arcs[idx] if idx >= 0 else arcs[~idx][::-1]
        if out: a = a[1:]          # arcs share endpoints
        out.extend(a)
    return out

def geom_paths(geom):
    polys = geom["arcs"] if geom["type"] == "MultiPolygon" else [geom["arcs"]]
    d = []
    for poly in polys:
        for ring in poly:
            pts = ring_coords(ring)
            if len(pts) < 4: continue
            d.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z")
    return "".join(d)

states = {}
for g in topo["objects"]["states"]["geometries"]:
    if g["id"] in SKIP: continue
    states[g["id"]] = {"name": g["properties"]["name"], "d": geom_paths(g)}

# bounding boxes (for AK/HI label placement + sanity checks)
def bbox(gid):
    xs, ys = [], []
    for seg in re.findall(r"[ML]([\d.]+) ([\d.]+)", states[gid]["d"]):
        xs.append(float(seg[0])); ys.append(float(seg[1]))
    return min(xs), min(ys), max(xs), max(ys)

# ---------------- albers projection (lower 48, d3 params) ----------------
# geoAlbersUsa lower48 = conicEqualArea parallels [29.5,45.5], rotate [96,0],
# center [-0.6, 38.7], scale 1300, translate [487.5, 305]
R = math.radians
y0, y1 = R(29.5), R(45.5)
sy0 = math.sin(y0); n = (sy0 + math.sin(y1)) / 2
C = 1 + sy0 * (2 * n - sy0); r0 = math.sqrt(C) / n
def raw(lam, phi):
    r = math.sqrt(C - 2 * n * math.sin(phi)) / n
    l = lam * n
    return r * math.sin(l), r0 - r * math.cos(l)
K, TX, TY = 1300, 487.5, 305
cx, cy = raw(R(-0.6), R(38.7))
def project(lon, lat):
    x, y = raw(R(lon + 96), R(lat))
    return TX + K * (x - cx), TY - K * (y - cy)

# fips -> (biggest city, lon, lat)  [lower 48]
CITIES = {
 "01": ("Huntsville", -86.586, 34.730),   "04": ("Phoenix", -112.074, 33.448),
 "05": ("Little Rock", -92.289, 34.746),  "06": ("Los Angeles", -118.243, 34.052),
 "08": ("Denver", -104.991, 39.739),      "09": ("Bridgeport", -73.195, 41.179),
 "10": ("Wilmington", -75.547, 39.746),   "12": ("Jacksonville", -81.656, 30.332),
 "13": ("Atlanta", -84.388, 33.749),      "16": ("Boise", -116.202, 43.615),
 "17": ("Chicago", -87.630, 41.878),      "18": ("Indianapolis", -86.158, 39.768),
 "19": ("Des Moines", -93.609, 41.587),   "20": ("Wichita", -97.336, 37.687),
 "21": ("Louisville", -85.758, 38.253),   "22": ("New Orleans", -90.071, 29.951),
 "23": ("Portland", -70.257, 43.661),     "24": ("Baltimore", -76.612, 39.290),
 "25": ("Boston", -71.059, 42.360),       "26": ("Detroit", -83.046, 42.331),
 "27": ("Minneapolis", -93.265, 44.978),  "28": ("Jackson", -90.185, 32.299),
 "29": ("Kansas City", -94.579, 39.100),  "30": ("Billings", -108.501, 45.783),
 "31": ("Omaha", -95.934, 41.257),        "32": ("Las Vegas", -115.140, 36.170),
 "33": ("Manchester", -71.454, 42.996),   "34": ("Newark", -74.172, 40.735),
 "35": ("Albuquerque", -106.650, 35.084), "36": ("New York", -74.006, 40.713),
 "37": ("Charlotte", -80.843, 35.227),    "38": ("Fargo", -96.789, 46.877),
 "39": ("Columbus", -82.999, 39.961),     "40": ("Oklahoma City", -97.516, 35.468),
 "41": ("Portland", -122.676, 45.523),    "42": ("Philadelphia", -75.165, 39.953),
 "44": ("Providence", -71.413, 41.824),   "45": ("Charleston", -79.931, 32.777),
 "46": ("Sioux Falls", -96.731, 43.550),  "47": ("Nashville", -86.781, 36.163),
 "48": ("Houston", -95.369, 29.760),      "49": ("Salt Lake City", -111.891, 40.761),
 "50": ("Burlington", -73.212, 44.476),   "51": ("Virginia Beach", -75.978, 36.853),
 "53": ("Seattle", -122.332, 47.606),     "54": ("Charleston", -81.633, 38.350),
 "55": ("Milwaukee", -87.910, 43.039),    "56": ("Cheyenne", -104.820, 41.140),
}
# Label layout tiers.
HUBS   = {"53","06","04","08","48","17","13","36","12","29"}  # lane endpoints
# NE cluster + collision-prone mid-map labels culled at phone scale
NO_LBL = {"09","10","24","25","33","34","44","50","51","54","23","21","18","28",
          "01","05","19","20","42"}  # + Huntsville, Little Rock, Des Moines, Wichita, Philadelphia
DOT_ONLY_R = 3.2

# label nudges (dx, dy, anchor) where the true point crowds a border
NUDGE = {
 "36": (-2, -13, "end"),    # New York -> label up-left so it stays on screen
 "12": (6, 16, "start"),    # Jacksonville -> below-right
 "06": (-8, 18, "start"),   # LA -> below
 "04": (10, 16, "start"),   # Phoenix -> below-right, clears LA's row
 "53": (8, -8, "start"),    # Seattle
 "41": (8, 12, "start"),    # Portland OR -> right of dot, off the coast edge
 "26": (6, 18, "middle"),   # Detroit label under dot
 "42": (-2, 17, "end"),     # Philadelphia below-left so it stays on screen
 "37": (6, 16, "middle"),   # Charlotte below
 "45": (4, 15, "start"),    # Charleston SC below-right
 "55": (-4, -11, "middle"), # Milwaukee above
 "22": (-4, 16, "middle"),  # New Orleans below
 "47": (-4, -12, "middle"), # Nashville above dot
 "13": (4, 18, "middle"),   # Atlanta below dot
 "39": (4, -11, "middle"),  # Columbus above
 "17": (-6, -11, "middle"), # Chicago above
 "40": (0, 15, "middle"),   # Oklahoma City below
 "56": (12, 4, "start"),    # Cheyenne right of dot, clears Salt Lake City
 "31": (6, -10, "start"),   # Omaha above-right
 "27": (4, -11, "middle"),  # Minneapolis above
 "48": (-8, 18, "middle"),  # Houston below, clears New Orleans
}

pts = {}
for fips, (city, lon, lat) in CITIES.items():
    x, y = project(lon, lat)
    x0, yy0, x1, yy1 = bbox(fips)
    assert x0 - 12 <= x <= x1 + 12 and yy0 - 12 <= y <= yy1 + 12, \
        f"{city} projected outside {states[fips]['name']} bbox: {(x,y)} vs {(x0,yy0,x1,yy1)}"
    pts[fips] = (city, x, y)

# AK / HI: dot+label at shape centers (insets)
for fips, city, dx, dy in (("02", "Anchorage", 20, -6), ("15", "Honolulu", 26, -14)):
    x0, yy0, x1, yy1 = bbox(fips)
    pts[fips] = (city, (x0 + x1) / 2 + dx, (yy0 + yy1) / 2 + dy)

# ---------------- lanes: a network over EVERY city ----------------
# MST over all lower-48 cities guarantees the whole map is connected, the
# nearest-neighbor pass adds natural local loops, the hub arcs add the big
# dramatic long-hauls, and AK/HI get sea links so the insets join the flow.
HUB_LANES = [("53","08"),("53","17"),("06","04"),("04","48"),("08","48"),
             ("08","17"),("48","13"),("17","36"),("13","36"),("13","12"),
             ("06","08"),("29","17")]

def dist(a, b):
    _, x1, y1 = pts[a]; _, x2, y2 = pts[b]
    return math.hypot(x2 - x1, y2 - y1)

ids = [f for f in pts if f not in ("02", "15")]
intree = {ids[0]}; edges = set()
while len(intree) < len(ids):                      # Prim's MST
    best = None
    for a in intree:
        for b in ids:
            if b in intree: continue
            d = dist(a, b)
            if best is None or d < best[0]: best = (d, a, b)
    edges.add(tuple(sorted((best[1], best[2])))); intree.add(best[2])
for a in ids:                                      # nearest-neighbor loops
    b = min((x for x in ids if x != a), key=lambda x: dist(a, x))
    edges.add(tuple(sorted((a, b))))
for a, b in HUB_LANES:                             # long-haul hub arcs
    edges.add(tuple(sorted((a, b))))
edges.add(("02", "53")); edges.add(("06", "15"))   # Anchorage / Honolulu sea links
EDGES = sorted(edges, key=lambda e: -dist(*e))

def lane_d(a, b):
    _, x1, y1 = pts[a]; _, x2, y2 = pts[b]
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    my -= math.hypot(x2 - x1, y2 - y1) * 0.12      # gentle upward bow
    return f"M{x1:.1f} {y1:.1f} Q{mx:.1f} {my:.1f} {x2:.1f} {y2:.1f}"

# ---------------- svg assembly ----------------
out = []
out.append('<div class="route-map" id="route-map" aria-hidden="true">')
out.append('  <svg class="rmap-svg" viewBox="0 0 975 610" preserveAspectRatio="xMidYMid meet" role="img" aria-label="United States freight map">')
out.append('    <g class="rmap-states">')
for fips, st in sorted(states.items()):
    out.append(f'      <path class="st" d="{st["d"]}"/>')
out.append('    </g>')
out.append('    <g class="rmap-lanes">')
for a, b in EDGES:
    out.append(f'      <path class="lane" d="{lane_d(a,b)}"/>')
out.append('    </g>')
out.append('    <g class="rmap-pulses">')
for i, (a, b) in enumerate(EDGES):
    # constant travel speed: duration scales with lane length; staggered starts
    du = max(1.6, min(4.4, dist(a, b) / 62))
    de = (i * 0.53) % 3.6
    hub = a in HUBS and b in HUBS
    cls = "pulse" if hub else "pulse p2"
    out.append(f'      <path class="{cls}" pathLength="1" d="{lane_d(a,b)}" style="animation-duration:{du:.2f}s;animation-delay:{de:.2f}s"/>')
out.append('    </g>')
out.append('    <g class="rmap-cities">')
for fips, (city, x, y) in sorted(pts.items()):
    hub = fips in HUBS
    r = 5.2 if hub else DOT_ONLY_R
    ring = f'<circle class="ring" cx="{x:.1f}" cy="{y:.1f}" r="{r+2:.1f}"/>' if hub else ""
    out.append(f'      <g class="node" style="--nd:{(int(fips)%7)*0.45:.2f}s">{ring}<circle class="{"dot" if hub else "cdot"}" cx="{x:.1f}" cy="{y:.1f}" r="{r}"/></g>')
    if fips in NO_LBL: continue
    ndx, ndy, anch = NUDGE.get(fips, (0, -9, "middle"))
    cls = "rmap-label hub" if hub else "rmap-label"
    out.append(f'      <text class="{cls}" x="{x+ndx:.1f}" y="{y+ndy:.1f}" text-anchor="{anch}">{city}</text>')
out.append('    </g>')
out.append('  </svg>')
out.append('</div>')
svg = "\n".join(out)
print(f"svg bytes: {len(svg):,}")

# ---------------- splice into index.html ----------------
html = open(HTML).read()
pat = re.compile(r'<div class="route-map" id="route-map".*?\n</div>', re.S)
assert pat.search(html), "route-map block not found"
html = pat.sub(svg, html, count=1)
open(HTML, "w").write(html)
print("spliced into index.html")
