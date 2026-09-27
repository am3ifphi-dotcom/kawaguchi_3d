# -*- coding: utf-8 -*-
"""
pool_from_tiles.py — 地理院 seamlessphoto タイル(ブラウザ手動DL分)から
プール棟エリアの正副近オルソ画像を生成するツール (Phase 2 補助)

使い方:
  1) ユーザーが .jpg でDLした seamlessphoto タイル(z18 232811,232812/103095)を
     ペイント/スクリプトで PNG 化 → mainにアップロード → エージェントが data/raw/photo_tiles/ に展開
     ※ seamlessphoto は .jpg 配信 (.png は NoSuchKey)。純pythonデコーダ都合で PNG 運用
  2) python3 tools/pool_from_tiles.py
       → refs/pool_area_ortho.png が生成される (E[-110..10] × N[80..160], 2px/m)
       → PLATEAU外形線(緑)と既存プール仮置き枠(赤)を重ねて幾何QCに使う
  3) エージェントが画像を読んでプール外形コーナーを単点測定 → masses v3 に反映

設計:
  - 依存ゼロ (PIL不要)。PNGデコードは内部実装 (ct2/6・bd8・filter0-4・非インターレース)
  - Webメルカトル→latlon→IX系変換は parse_plateau_gml_blender と同一式 (原点一致検証済)
  - タイルnotなズームレベルでも自動対応 (ファイル名 z{Z}_{X}_{Y}.png を走査)
"""
import os, re, sys, json, zlib, math, glob, importlib.util, io, contextlib

# ---------- 座標変換: 実績のある tools/site_geometry.py をそのまま使う ----------
# (内蔵コピーはスケール壊れを起こしたため棄却。site_geometry は校正/マス/
#  PLATEAU重ねで原点一致・200m級精度が実測済み)
_SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'site_geometry.py')
spec = importlib.util.spec_from_file_location('sg', _SITE)
sg = importlib.util.module_from_spec(spec)
with contextlib.redirect_stdout(io.StringIO()):
    spec.loader.exec_module(sg)
to_blender_xy = sg.to_blender_xy
LAT0 = 35.8261337
LON0 = 139.7191327
def ix_inverse(E, N):
    """(E,N)→(lat,lon): 交互二分探索 (E≒lon, N≒lat。クロス項は反復で吸収)"""
    lat, lon = LAT0, LON0
    for _ in range(8):
        lo, hi = lon - 0.002, lon + 0.002
        for _ in range(60):
            m = (lo + hi) / 2; e, _ = to_blender_xy(lat, m)
            if e < E: lo = m
            else: hi = m
        lon = (lo + hi) / 2
        lo, hi = lat - 0.002, lat + 0.002
        for _ in range(60):
            m = (lo + hi) / 2; _, n = to_blender_xy(m, lon)
            if n < N: lo = m
            else: hi = m
        lat = (lo + hi) / 2
        e, n = to_blender_xy(lat, lon)
        if abs(e - E) < 0.01 and abs(n - N) < 0.01: break
    return lat, lon

# ---------- 最小PNGデコーダ / エンコーダ ----------
def decode_png(path):
    data = open(path, 'rb').read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'not a png: ' + path
    pos = 8; idat = b''; w = h = ct = bd = None
    while pos < len(data):
        ln = int.from_bytes(data[pos:pos+4], 'big'); typ = data[pos+4:pos+8]
        pay = data[pos+8:pos+8+ln]; pos += 12 + ln
        if typ == b'IHDR':
            w = int.from_bytes(pay[0:4], 'big'); h = int.from_bytes(pay[4:8], 'big')
            bd, ct = pay[8], pay[9]
            assert pay[12] == 0, 'interlaced png unsupported'
        elif typ == b'IDAT': idat += pay
        elif typ == b'IEND': break
    assert bd == 8 and ct in (2, 6), f'unsupported png (bd={bd} ct={ct})'
    ch = 3 if ct == 2 else 4
    raw = zlib.decompress(idat)
    stride = w * ch
    out = bytearray(w * h * 3)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p+stride]); p += stride
        if f == 1:
            for i in range(ch, stride): line[i] = (line[i] + line[i-ch]) & 255
        elif f == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                l = line[i-ch] if i >= ch else 0
                line[i] = (line[i] + ((l + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i-ch] if i >= ch else 0
                b = prev[i]; c = prev[i-ch] if i >= ch else 0
                pr = a + b - c
                pa, pb, pc = abs(pr-a), abs(pr-b), abs(pr-c)
                pred = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pred) & 255
        o = y * w * 3
        if ch == 3: out[o:o+stride] = line
        else:
            j = 0
            for i in range(0, stride, 4):
                out[o+j] = line[i]; out[o+j+1] = line[i+1]; out[o+j+2] = line[i+2]; j += 3
        prev = line
    return w, h, out
def encode_png(path, w, h, rgb):
    def chunk(t, p):
        c = t + p
        return len(p).to_bytes(4, 'big') + c + zlib.crc32(c).to_bytes(4, 'big')
    raw = b''.join(b'\x00' + bytes(rgb[y*w*3:(y+1)*w*3]) for y in range(h))
    open(path, 'wb').write(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', w.to_bytes(4, 'big') + h.to_bytes(4, 'big') + b'\x08\x02\x00\x00\x00')
        + chunk(b'IDAT', zlib.compress(bytes(raw), 6)) + chunk(b'IEND', b''))

# ---------- Webメルカトル ----------
def en_from_tilepx(z, x, y, pxf, pyf):
    """タイル番号+画素(小数可) → (E,N)``"""
    n = 2 ** z
    gx = x + pxf / 256.0; gy = y + pyf / 256.0
    lon = gx / n * 360.0 - 180.0
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * gy / n))))
    return to_blender_xy(lat, lon)
def tilepx_from_en(z, E, N):
    lat, lon = ix_inverse(E, N)
    n = 2 ** z
    gx = (lon + 180.0) / 360.0 * n
    gy = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    x = int(math.floor(gx)); y = int(math.floor(gy))
    return x, y, (gx - x) * 256.0, (gy - y) * 256.0

# ---------- メイン ----------
CROP = (-110.0, 10.0, 80.0, 160.0)   # E0,E1,N0,N1
SCALE = 2.0                          # px/m
POOL_BOX = (-80.0, -19.0, 100.0, 130.0)
def main():
    pat = re.compile(r'z?(\d+)[_/](\d+)[_/](\d+)\.png$|z(\d+)_(\d+)_(\d+)\.png$')
    tiles = {}
    for p in sorted(glob.glob('data/raw/photo_tiles/*.png')):
        m = pat.search(p)
        if not m: 
            print('  [skip] 名前不適合:', p); continue
        g = [int(v) for v in m.groups() if v is not None]
        z, x, y = g
        tiles[(z, x, y)] = decode_png(p)
    if not tiles:
        print('[ERR] data/raw/photo_tiles/ に PNG がありません (z{Z}_{X}_{Y}.png で配置)')
        sys.exit(1)
    zs = {t[0] for t in tiles}
    if len(zs) > 1:
        print('[警告] 混在ズーム。最大zのみ使用'); zmax = max(zs)
        tiles = {k: v for k, v in tiles.items() if k[0] == zmax}
    z = next(iter(tiles))[0]
    e0, e1, n0, n1 = CROP
    W = int((e1 - e0) * SCALE); H = int((n1 - n0) * SCALE)
    buf = bytearray(b'\xc8' * W * H * 3)   # 背景=淡グレー
    miss = 0
    for j in range(H):
        N = n1 - (j + 0.5) / SCALE
        for i in range(W):
            E = e0 + (i + 0.5) / SCALE
            x, y, pxf, pyf = tilepx_from_en(z, E, N)
            t = tiles.get((z, x, y))
            if t is None: miss += 1; continue
            tw, th, px = t
            sxp = min(tw - 1, max(0, int(pxf))); syp = min(th - 1, max(0, int(pyf)))
            o3 = (j * W + i) * 3; s3 = (syp * tw + sxp) * 3
            buf[o3:o3+3] = px[s3:s3+3]
    # PLATEAU リング重ね (緑) + プール仮置き枠 (赤)
    def draw_seg(Ex, Nx, Ee, Ne, col):
        x0 = int((Ex - e0) * SCALE); y0 = int((n1 - Nx) * SCALE)
        x1 = int((Ee - e0) * SCALE); y1 = int((n1 - Ne) * SCALE)
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1; sy = 1 if y0 < y1 else -1
        err = dx + dy
        while True:
            if 0 <= x0 < W and 0 <= y0 < H:
                o3 = (y0 * W + x0) * 3; buf[o3:o3+3] = bytes(col)
            if x0 == x1 and y0 == y1: break
            e2 = 2 * err
            if e2 >= dy: err += dy; x0 += sx
            if e2 <= dx: err += dx; y0 += sy
    pj = 'data/plateau/plateau_53395597.json'
    nring = 0
    if os.path.exists(pj):
        for f in json.load(open(pj, encoding='utf-8'))['features']:
            r = f.get('ring')
            if not r: continue
            cx = sum(p[0] for p in r) / len(r); cy = sum(p[1] for p in r) / len(r)
            if not (e0 - 5 <= cx <= e1 + 5 and n0 - 5 <= cy <= n1 + 5): continue
            for i in range(len(r)):
                draw_seg(*r[i], *r[(i + 1) % len(r)], (30, 220, 90))
            nring += 1
    bx = POOL_BOX
    draw_seg(bx[0], bx[2], bx[1], bx[2], (255, 40, 40)); draw_seg(bx[1], bx[2], bx[1], bx[3], (255, 40, 40))
    draw_seg(bx[1], bx[3], bx[0], bx[3], (255, 40, 40)); draw_seg(bx[0], bx[3], bx[0], bx[2], (255, 40, 40))
    os.makedirs('refs', exist_ok=True)
    out = 'refs/pool_area_ortho.png'
    encode_png(out, W, H, buf)
    print(f'[OK] {out}  ({W}x{H}px, {1/SCALE:.2f}m/px)  タイル{len(tiles)}枚(z{z})  未カバー画素 {miss}  PLATEAUリング {nring}')
    print('     緑=PLATEAU外形(QC用) / 赤=現行プール仮置き枠')
if __name__ == '__main__':
    main()
