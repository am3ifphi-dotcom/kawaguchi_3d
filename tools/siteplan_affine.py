#!/usr/bin/env python3
"""配置図(実施設計 p3 カラー)をピクセル解析し、OSM敷地ポリゴンと相似校正して
各棟Footprint(実メートル)を推定する。純Python・高速版（境界点のみ評価 + 座標降下法）。
出力: docs/phase2/site_calibration.json, refs/city_pdf/_img/calib_annotated.png
"""
import zlib, json, math, sys, os
from collections import deque

sys.path.insert(0, os.path.dirname(__file__))
import importlib.util, io, contextlib
spec = importlib.util.spec_from_file_location('sg', os.path.join(os.path.dirname(__file__), 'site_geometry.py'))
sg = importlib.util.module_from_spec(spec)
with contextlib.redirect_stdout(io.StringIO()):
    spec.loader.exec_module(sg)

def read_png(path):
    d = open(path, 'rb').read(); pos = 8; W = H = ctype = None; idat = b''
    while pos < len(d):
        ln = int.from_bytes(d[pos:pos+4], 'big'); tag = d[pos+4:pos+8]; body = d[pos+8:pos+8+ln]
        if tag == b'IHDR':
            W = int.from_bytes(body[:4], 'big'); H = int.from_bytes(body[4:8], 'big'); ctype = body[9]
        elif tag == b'IDAT': idat += body
        pos += 12 + ln
    ch = {0: 1, 2: 3, 6: 4}[ctype]
    raw = zlib.decompress(idat); stride = W * ch
    img = bytearray(W * H * ch); prev = bytearray(stride); off = 0
    for y in range(H):
        f = raw[off]; off += 1
        row = bytearray(raw[off:off+stride]); off += stride
        if f:
            for x in range(stride):
                a = row[x-ch] if x >= ch else 0; b = prev[x]; c = prev[x-ch] if x >= ch else 0
                if f == 1: row[x] = (row[x]+a)&0xFF
                elif f == 2: row[x] = (row[x]+b)&0xFF
                elif f == 3: row[x] = (row[x]+((a+b)>>1))&0xFF
                else:
                    p = a+b-c; pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
                    row[x] = (row[x]+(a if pa<=pb and pa<=pc else (b if pb<=pc else c)))&0xFF
        img[y*stride:(y+1)*stride] = row; prev = row
    return W, H, ch, img

def save_png(path, W, H, ch, buf):
    def chunk(t, p):
        c = t + p; return len(p).to_bytes(4, 'big') + c + zlib.crc32(c).to_bytes(4, 'big')
    raw = b''.join(bytes([0]) + bytes(buf[y*W*ch:(y+1)*W*ch]) for y in range(H))
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR',
        W.to_bytes(4,'big')+H.to_bytes(4,'big')+b'\x08'+bytes([2 if ch==3 else 6])+b'\x00\x00\x00')
        + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b''))

W, H, ch, img = read_png('refs/city_pdf/_img/0021.png')
print(f'site plan: {W}x{H}', flush=True)

green = bytearray(W*H); dark = bytearray(W*H); gray = bytearray(W*H)
for i in range(W*H):
    o = i * ch; r, g, b = img[o], img[o+1], img[o+2]
    if g - r > 8 and g - b > 25 and g > 130: green[i] = 1
    lum = (r*30 + g*59 + b*11)//100
    if lum < 150: dark[i] = 1
    elif 150 <= lum <= 205 and abs(r-g) < 14 and abs(g-b) < 14: gray[i] = 1

# 緑域の境界点のみ採取（高速化の肝）
gdx = (0, 1, 0, -1); gdy = (1, 0, -1, 0)
gb = []; gx0, gx1, gy0, gy1 = W, 0, H, 0
cnt_g = 0
cnt_e = 0
for y in range(1, H-1):
    base = y*W
    for x in range(1, W-1):
        i = base + x
        if not green[i]: continue
        cnt_g += 1
        if x < gx0: gx0 = x
        if x > gx1: gx1 = x
        if y < gy0: gy0 = y
        if y > gy1: gy1 = y
        edge = False
        for dx, dy in zip(gdx, gdy):
            if not green[(y+dy)*W + x+dx]: edge = True; break
        if edge:
            cnt_e += 1
            if cnt_e % 2 == 0: gb.append((x, y))
print(f'green bbox: x {gx0}..{gx1} y {gy0}..{gy1} cover={cnt_g*100.0/(W*H):.1f}% boundary_pts={len(gb)}', flush=True)

poly_bl = [sg.to_blender_xy(*p) for p in sg.SITE1_LATLON]
Ex = [p[0] for p in poly_bl]; Ny = [p[1] for p in poly_bl]
E0, E1, N0, N1 = min(Ex), max(Ex), min(Ny), max(Ny)
k0 = ((gx1-gx0)/(E1-E0) + (gy1-gy0)/(N1-N0)) / 2
print(f'OSM site E{E1-E0:.2f} x N{N1-N0:.2f} m / k0={k0:.3f}', flush=True)

def project(par, E, N):
    k, ang, tx, ty = par
    ca, sa = math.cos(ang), math.sin(ang)
    return (k*(E*ca - N*sa) + tx, -k*(E*sa + N*ca) + ty)

def loss(par):
    tot = 0.0
    for (E, N) in poly_bl:
        X, Y = project(par, E, N)
        best = 1e18
        for (bx_, by_) in gb:
            dd = (bx_-X)*(bx_-X) + (by_-Y)*(by_-Y)
            if dd < best: best = dd
        tot += math.sqrt(best)
    return tot / len(poly_bl)

par = [k0, 0.0, gx0 - k0*E0, gy1 + k0*N0]
bl = loss(par)
# 座標降下（各パラメータ±を順に試す。反復ごとに刻み半分）
steps = [k0*0.03, 0.003, 6.0, 6.0]
for rnd in range(8):
    improved = False
    for j in range(4):
        for sign in (1, -1):
            cand = par[:]; cand[j] = par[j] + sign*steps[j]
            l = loss(cand)
            if l < bl: par, bl, improved = cand, l, True
    if not improved:
        steps = [s/2 for s in steps]
k, ang, tx, ty = par
print(f'fitted: k={k:.4f} ang={math.degrees(ang):.3f}deg tx={tx:.1f} ty={ty:.1f} residual={bl:.2f}px={bl/k:.2f}m', flush=True)

# 中灰を2回膨張して緑域内をマスク（トラス線郡の統合）
mask = bytearray(W*H)
md = bytearray(W*H)
for _ in range(2):
    for i in range(W, W*(H-1)):
        if green[i]: md[i-1] = md[i+1] = md[i-W] = md[i+W] = 1
    green, md = (bytearray(a or b for a, b in zip(green, md))), bytearray(W*H)
for i in range(W*H):
    if green[i] and (dark[i] or gray[i]): mask[i] = 1
gcnt = 0
for _ in range(2):
    for i in range(W, W*(H-1)):
        if mask[i]: md[i-1] = md[i+1] = md[i-W] = md[i+W] = 1; gcnt += 1
    mask = bytearray(a or b for a, b in zip(mask, md)); md = bytearray(W*H)

seen = bytearray(W*H); rects = []
for i in range(W*H):
    if mask[i] and not seen[i]:
        q = deque([i]); seen[i] = 1
        x0 = x1 = i % W; y0 = y1 = i // W; cnt = 0
        while q:
            c = q.popleft(); cnt += 1
            cx, cy = c % W, c // W
            if cx < x0: x0 = cx
            if cx > x1: x1 = cx
            if cy < y0: y0 = cy
            if cy > y1: y1 = cy
            if c > 0 and mask[c-1] and not seen[c-1]: seen[c-1] = 1; q.append(c-1)
            if c < W*H-1 and mask[c+1] and not seen[c+1]: seen[c+1] = 1; q.append(c+1)
            if c >= W and mask[c-W] and not seen[c-W]: seen[c-W] = 1; q.append(c-W)
            if c < W*(H-1) and mask[c+W] and not seen[c+W]: seen[c+W] = 1; q.append(c+W)
        bw, bh = x1-x0+1, y1-y0+1
        fill = cnt/(bw*bh)
        if bw >= 8 and bh >= 8 and bw*bh >= 900 and fill > 0.30:
            ca, sa = math.cos(-ang), math.sin(-ang)
            def unproj(X, Y):
                e = (X-tx)/k; n = -(Y-ty)/k
                return (e*ca - n*sa, e*sa + n*ca)
            Ea, Na = unproj(x0, y1); Eb, Nb = unproj(x1, y0)
            rects.append({'px_box': [x0, y0, x1, y1],
                'E0': round(min(Ea, Eb), 2), 'E1': round(max(Ea, Eb), 2),
                'N0': round(min(Na, Nb), 2), 'N1': round(max(Na, Nb), 2),
                'size_m': [round(abs(Eb-Ea), 1), round(abs(Nb-Na), 1)],
                'fill': round(fill, 2)})
rects.sort(key=lambda r: -r['size_m'][0]*r['size_m'][1])
print(f'candidates: {len(rects)}', flush=True)
for r in rects[:14]:
    cew = (r['E0']+r['E1'])/2; cns = (r['N0']+r['N1'])/2
    print(f"  {r['size_m'][0]:6.1f} x {r['size_m'][1]:6.1f} @({cew:7.1f},{cns:7.1f}) px{r['px_box']} f={r['fill']}", flush=True)

ann = bytearray(img)
for r in rects[:30]:
    x0, y0, x1, y1 = r['px_box']
    for X in range(x0, x1+1):
        for yy in (y0, y0+1, y1-1, y1):
            o = (yy*W+X)*ch; ann[o:o+3] = b'\xff\x00\x00'
    for Y in range(y0, y1+1):
        for xx in (x0, x0+1, x1-1, x1):
            o = (Y*W+xx)*ch; ann[o:o+3] = b'\xff\x00\x00'
for (E, N) in poly_bl:
    X, Y = project(par, E, N); X, Y = int(X), int(Y)
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            if 0 <= X+dx < W and 0 <= Y+dy < H:
                o = ((Y+dy)*W+X+dx)*ch; ann[o:o+3] = b'\x00\x5a\xff'
save_png('refs/city_pdf/_img/calib_annotated.png', W, H, ch, ann)
os.makedirs('docs/phase2', exist_ok=True)
json.dump({'image': 'refs/city_pdf/_img/0021.png',
    'fit': {'k_px_per_m': round(k, 4), 'angle_deg': round(math.degrees(ang), 3),
            'tx': round(tx, 1), 'ty': round(ty, 1), 'residual_m_mean': round(bl/k, 2)},
    'note': '配置図(実施設計p3)×OSM敷地ポリゴン相似校正。確度:【画像校正推定】±1〜2m',
    'buildings': rects[:30]},
    open('docs/phase2/site_calibration.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('done.', flush=True)
