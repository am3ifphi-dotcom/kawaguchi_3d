#!/usr/bin/env python3
"""PLATEAU CityGML (LOD1) から 建物/道路の外形を抽出して軽量JSON化。
60万行級の.gmlをストリーム解析。ユーザーがローカル実行 → JSONをGitHub(main)で共有。

使い方:
  python3 tools/parse_plateau_gml.py data/plateau/udx/bldg/53395597_*.gml \
      [他の.gml...] -o data/plateau/kawaguchi_53395597.json
出力JSON:
  {"origin":{...},"srid":"...","features":[{"kind":"bldg","id":...,"h":..,"ring":[[E,N],...]}, ...]}
座標はプロジェクトローカル(bx=+X東/by=+Y北, site_geometry.to_blender_xyと同一系)。
"""
import sys, os, re, json, gzip
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(__file__))
import importlib.util, io, contextlib
spec = importlib.util.spec_from_file_location('sg', os.path.join(os.path.dirname(__file__), 'site_geometry.py'))
sg = importlib.util.module_from_spec(spec)
with contextlib.redirect_stdout(io.StringIO()):
    spec.loader.exec_module(sg)
to_blender_xy = sg.to_blender_xy

MAX_E, MAX_N = 700.0, 700.0   # プロジェクト半径(両校地+余裕)でクリップ

def iter_buildings(path):
    """bldg:Buildingエレメント単位で逐次yield。"""
    tag_b = None
    for ev, el in ET.iterparse(path, events=('start', 'end')):
        if ev == 'start' and el.tag.endswith('}Building') and tag_b is None:
            tag_b = el
        elif ev == 'end' and el.tag.endswith('}Building'):
            yield el
            el.clear()

def parse_building(el, limit):
    gid = el.get('{http://www.opengis.net/gml}id') or el.get('id') or ''
    h = None
    for c in el.iter():
        if c.tag.endswith('}measuredHeight') and c.text:
            try: h = float(c.text)
            except Exception: pass
        elif c.tag.endswith('}name') and c.text and not gid:
            gid = c.text
    rings = []      # [(z_avg, [(E,N),...])]
    for c in el.iter():
        if c.tag.endswith('}posList') and c.text:
            nums = [float(x) for x in c.text.split()]
            pts = []
            for i in range(0, len(nums) - 2, 3):
                la, lo, z = nums[i], nums[i + 1], nums[i + 2]
                # PLATEAU CityGML: srsDimension=3, EPSG:6697は(lat lon h)順のことが多い
                E, N = to_blender_xy(la, lo)
                pts.append((E, N, z))
            if len(pts) >= 3:
                zavg = sum(p[2] for p in pts) / len(pts)
                rings.append((zavg, [(p[0], p[1]) for p in pts]))
    if not rings:
        return None
    rings.sort(key=lambda r: r[0])
    ring = rings[0][1]
    if h is None:
        h = max(r[0] for r in rings) - min(r[0] for r in rings)
    # ローカルクリップ
    if not any(abs(x) <= limit and abs(y) <= limit for (x, y) in ring):
        return None
    return {'kind': 'bldg', 'id': gid, 'h': round(h, 2),
            'ring': [[round(x, 2), round(y, 2)] for (x, y) in ring]}

def iter_roads(path):
    for ev, el in ET.iterparse(path, events=('end',)):
        if el.tag.endswith('}Road'):
            yield el
            el.clear()

def parse_road(el, limit):
    gid = el.get('{http://www.opengis.net/gml}id') or el.get('id') or ''
    polys = []
    for c in el.iter():
        if c.tag.endswith('}posList') and c.text:
            nums = [float(x) for x in c.text.split()]
            pts = []
            for i in range(0, len(nums) - 2, 3):
                la, lo, z = nums[i], nums[i + 1], nums[i + 2]
                E, N = to_blender_xy(la, lo)
                if abs(E) <= limit and abs(N) <= limit:
                    pts.append((E, N, z))
            if len(pts) >= 3:
                polys.append({'ring': [[round(x, 2), round(y, 2)] for (x, y, _z) in pts],
                              'z': round(sum(p[2] for p in pts) / len(pts), 2)})
    if not polys:
        return None
    return {'kind': 'road', 'id': gid, 'polys': polys}

def main():
    args = sys.argv[1:]
    out = 'data/plateau/plateau_extract.json'
    files = []
    i = 0
    while i < len(args):
        if args[i] == '-o':
            out = args[i + 1]; i += 2
        else:
            files.append(args[i]); i += 1
    feats = []
    for f in files:
        base = os.path.basename(f)
        n0 = len(feats)
        if 'bldg' in base or 'Bldg' in base:
            for el in iter_buildings(f):
                r = parse_building(el, MAX_E)
                if r: feats.append(r)
        elif 'tran' in base or 'road' in base:
            for el in iter_roads(f):
                r = parse_road(el, MAX_E)
                if r: feats.append(r)
        print(f'{base}: +{len(feats)-n0} features', flush=True)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    meta = {'origin': {'lat': 35.8261337, 'lon': 139.7191328},
            'note': 'PLATEAU LOD1抽出。bx=+X東/by=+Y北(site_geometry.to_blender_xyと同系)。確度:国交省基準(LOD1平面5m級)',
            'count': len(feats), 'features': feats}
    with open(out, 'w', encoding='utf-8') as fo:
        json.dump(meta, fo, ensure_ascii=False)
    raw = os.path.getsize(out)
    with open(out, 'rb') as fi, gzip.open(out + '.gz', 'wb', 6) as gz:
        gz.write(fi.read())
    print(f'-> {out} ({raw/1024:.0f}KB, gzip {os.path.getsize(out+".gz")/1024:.0f}KB)')
    print('   このJSON(または.gz)をGitHubのmainにAdd fileで置いてください → 私がfetchしてPhase2に使います')

if __name__ == '__main__':
    main()
