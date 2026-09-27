# -*- coding: utf-8 -*-
"""
parse_plateau_gml_blender.py
PLATEAU CityGML (LOD1) → 建物外形+高さの軽量JSON を作る【Blender内蔵Pythonで実行OK】
=====================================================================
何が起きるか（1行）:
    巨大な .gml（60万行級）をストリーム解析して、プロジェクト座標
    (+X=東, +Y=北) の 建物外形リング+高さ だけの数百KB JSON を出力する。

実行方法（Blenderで）:
    1. このファイルを Blender の Scripting > テキストエディタに貼る
    2. 下の CONFIG の GML_FILES をあなたが展開した .gml の場所に書き換える
    3. Run Script → 完了後、出力JSON を GitHub(main) に Add file でアップ
    （bpy 不要・純Python。10MB/分程度。60万行で1〜2分想定）
"""
import os, sys, math, json, gzip
import xml.etree.ElementTree as ET

# ============================ CONFIG （ここだけ編集）============================
# 展開した .gml のフルパス。複数可（bldg=建物 / tran=道路 の判別はファイル名で自動）
GML_FILES = [
    r"C:\Users\cheer\Downloads\udx\bldg\53395597_bldg_6697_op.gml",
    # r"C:\Users\cheer\Downloads\udx\tran\53395597_tran_6697_op.gml",
]
# 出力先（JSON）。既定はユーザーホーム直下
OUT_JSON = os.path.join(os.path.expanduser("~"), "plateau_53395597.json")
MAX_M = 700.0   # プロジェクト原点半径（第1校地+余裕。第2校地も必要なら 4500 に）
# ==============================================================================

# ---- 緯度経度→平面直角IX系（tools/latlon2xy.py と同一。自己完結のため埋め込み）----
A = 6378137.0; RF = 298.257222101; M0 = 0.9999
LAT0, LON0 = 36.0, 139.0 + 50.0 / 60.0

def _coeffs():
    n = 1.0 / (2.0 * RF - 1.0); n2, n3, n4, n5 = n**2, n**3, n**4, n**5
    A_ = [0.0] * 6
    A_[0] = 1.0 + n2/4.0 + n4/64.0
    A_[1] = -1.5 * (n - n3/8.0 - n5/64.0)
    A_[2] = 15/16.0 * (n2 - n4/4.0)
    A_[3] = -35/48.0 * (n3 - 5/16.0 * n5)
    A_[4] = 315/512.0 * n4
    A_[5] = -693/1280.0 * n5
    a = [0.0] * 6
    a[1] = 0.5*n - (2/3.0)*n2 + (5/16.0)*n3 + (41/180.0)*n4 - (127/288.0)*n5
    a[2] = (13/48.0)*n2 - (3/5.0)*n3 + (557/1440.0)*n4 + (281/630.0)*n5
    a[3] = (61/240.0)*n3 - (103/140.0)*n4 + (15061/26880.0)*n5
    a[4] = (49568/161280.0)*n4 - (179/168.0)*n5
    a[5] = (34729/80640.0)*n5
    return n, a, M0 * A / (1.0 + n) * A_[0]

_N, _ALP, _ABAR = _coeffs()

def latlon_to_xy(la, lo):
    rad = math.pi / 180.0
    phi, lam, phi0 = la * rad, lo * rad, LAT0 * rad
    def cf(ph):
        return math.sinh(math.atanh(math.sin(ph))
            - (2*math.sqrt(_N)/(1+_N)) * math.atanh(2*math.sqrt(_N)*math.sin(ph)/(1+_N)))
    dl = (lam - LON0 * rad); t = cf(phi); lc, ls = math.cos(dl), math.sin(dl)
    xip = math.atan2(t, lc); etp = math.atanh(ls / math.sqrt(t*t + lc*lc))
    xip0 = math.atan2(cf(phi0), 1.0)
    x = _ABAR * (xip - xip0); y = _ABAR * etp
    for j in range(1, 6):
        x -= _ABAR * _ALP[j] * (math.sin(2*j*xip)*math.cosh(2*j*etp) - math.sin(2*j*xip0))
        y += _ABAR * _ALP[j] * math.cos(2*j*xip) * math.sinh(2*j*etp)
    return x, y

ORIGIN_X, ORIGIN_Y = -19263.415, -10318.279

def to_blender_xy(la, lo):
    x, y = latlon_to_xy(la, lo)
    return (y - ORIGIN_Y, x - ORIGIN_X)   # (E, N)

# ----------------------------- GML ストリーム解析 -----------------------------
def scan(path, is_road):
    feats = []
    for ev, el in ET.iterparse(path, events=('end',)):
        tg = el.tag
        if tg.endswith('}Building') or (is_road and tg.endswith('}Road')):
            gid = el.get('{http://www.opengis.net/gml}id') or el.get('id') or ''
            h = None
            rings = []
            for c in el.iter():
                ct = c.tag
                if ct.endswith('}measuredHeight') and c.text:
                    try: h = float(c.text)
                    except Exception: pass
                elif ct.endswith('}posList') and c.text:
                    nums = c.text.split()
                    pts = []
                    for i in range(0, len(nums) - 2, 3):
                        try:
                            la, lo, z = float(nums[i]), float(nums[i+1]), float(nums[i+2])
                        except Exception:
                            continue
                        E, N = to_blender_xy(la, lo)
                        if abs(E) <= MAX_M and abs(N) <= MAX_M:
                            pts.append((E, N, z))
                    if len(pts) >= 3:
                        za = sum(p[2] for p in pts) / len(pts)
                        rings.append((za, pts))
            if rings:
                rings.sort(key=lambda r: r[0])
                if is_road:
                    feats.append({'kind': 'road', 'id': gid,
                        'polys': [{'ring': [[round(x,2), round(y,2)] for x, y, _ in pts],
                                   'z': round(z0,2)} for z0, pts in rings]})
                else:
                    if h is None:
                        h = max(z0 for z0, _ in rings) - min(z0 for z0, _ in rings)
                    feats.append({'kind': 'bldg', 'id': gid, 'h': round(h, 2),
                        'ring': [[round(x,2), round(y,2)] for x, y, _ in rings[0][1]]})
            el.clear()
    return feats

def main():
    print("\n===== PLATEAU GML 解析（Blender内Python版）=====")
    feats = []
    for f in GML_FILES:
        if not os.path.exists(f):
            print("  [見つからない] " + f + "  ← CONFIG のパスを確認")
            continue
        is_road = ('tran' in os.path.basename(f)) or ('road' in os.path.basename(f))
        n0 = len(feats)
        feats += scan(f, is_road)
        print(f"  {os.path.basename(f)}: +{len(feats)-n0} 件", flush=True)
    if not feats:
        print("  出力対象が0件です（パス/クリップ範囲を確認）"); return
    meta = {'origin': {'lat': 35.8261337, 'lon': 139.7191328},
            'note': 'PLATEAU LOD1抽出(ユーザーPC)。bx=+X東/by=+Y北。確度:LOD1平面5m級（国交省）',
            'count': len(feats), 'features': feats}
    with open(OUT_JSON, 'w', encoding='utf-8') as fo:
        json.dump(meta, fo, ensure_ascii=False)
    with open(OUT_JSON, 'rb') as fi, gzip.open(OUT_JSON + '.gz', 'wb', 6) as gz:
        gz.write(fi.read())
    print(f"  -> {OUT_JSON} ({os.path.getsize(OUT_JSON)//1024}KB, .gz {os.path.getsize(OUT_JSON+'.gz')//1024}KB)")
    print("  つぎに、このJSON(または.gz)を GitHub の main に Add file → Upload でお願いします")
    print("  私が fetch して phase2 の PLATEAU重ね表示/マス置換に使います")
    print("===== 完了 =====\n")

main()
