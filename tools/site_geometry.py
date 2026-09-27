#!/usr/bin/env python3
"""
site_geometry.py — 敷地ジオメトリ一次データ（OSM由来・JGD2011平面直角IX系換算付）
================================================================================
取得元: OpenStreetMap (ODbL 1.0, © OpenStreetMap contributors)
  - 第1校地:  way 127212336   amenity=school  川口市立高等学校         (source=Bing) 【仮置き】
  - 第2校地:  way 601835163   amenity=school  川口市立高等学校第2校地              【仮置き】
  - 第2校地体育館: way 938140491 building=yes leisure=sports_hall                  【仮置き】
取得日: 2026-09-27 (Overpass API)。確度は「仮置き」: OSMの手書きトレースのため数m級の誤差を含みうる。
Phase 2 で基盤地図情報/PLATEAU/実施設計配置図と照合して確定する。
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from latlon2xy import latlon_to_xy, LAT0_DEG, LON0_DEG

# プロジェクト原点（Phase 0 決定の仮置き値）
ORIGIN = (-19263.415, -10318.279)  # IX系 (X, Y)

SITE1_WAY_ID = 127212336
SITE1_LATLON = [
    (35.8258195, 139.7176366), (35.8255725, 139.7186714), (35.8249245, 139.7206283),
    (35.8249604, 139.7206825), (35.8267602, 139.7204576), (35.8268393, 139.7203573),
    (35.8268557, 139.7200780), (35.8271995, 139.7190727), (35.8274250, 139.7184410),
    (35.8273957, 139.7184312), (35.8273843, 139.7181150), (35.8269336, 139.7181309),
    (35.8269342, 139.7176741), (35.8267931, 139.7176718), (35.8267948, 139.7174159),
    (35.8266756, 139.7174183), (35.8266767, 139.7176261), (35.8262509, 139.7176177),
    (35.8262350, 139.7177429), (35.8260325, 139.7177165), (35.8258195, 139.7176366),
]

SITE2_WAY_ID = 601835163
SITE2_LATLON = [
    (35.8079556, 139.7475356), (35.8083868, 139.7482313), (35.8084829, 139.7481352),
    (35.8087580, 139.7485787), (35.8085383, 139.7487859), (35.8086096, 139.7489043),
    (35.8085295, 139.7489854), (35.8086006, 139.7490956), (35.8084020, 139.7493080),
    (35.8069117, 139.7507876), (35.8068587, 139.7507889), (35.8063716, 139.7500538),
    (35.8073362, 139.7491589), (35.8072222, 139.7489413), (35.8074958, 139.7486767),
    (35.8073460, 139.7480655), (35.8079219, 139.7475274), (35.8079556, 139.7475356),
]

SITE2_GYM_WAY_ID = 938140491
SITE2_GYM_LATLON = [
    (35.8080067, 139.7491141), (35.8077054, 139.7494081), (35.8077415, 139.7494643),
    (35.8077049, 139.7495001), (35.8078471, 139.7497218), (35.8078821, 139.7496877),
    (35.8079146, 139.7497383), (35.8082176, 139.7494427), (35.8080637, 139.7492030),
    (35.8080067, 139.7491141),
]


def to_blender_xy(lat, lon):
    """latlon → Blender ローカルXY [m]。+x=東(IX系Y-原点Y)、+y=北(IX系X-原点X)。"""
    x, y = latlon_to_xy(lat, lon)
    return (y - ORIGIN[1], x - ORIGIN[0])


def _extent(poly_bl):
    xs = [p[0] for p in poly_bl]
    ys = [p[1] for p in poly_bl]
    return (min(xs), max(xs), min(ys), max(ys))


def mesh2_3_4(lat, lon):
    """標準地域メッシュ 2次・3次・4次(1km)コード。"""

    def m2(a, o):
        return int(a * 1.5), int(o - 100)

    p, q = m2(lat, lon)
    lat_min = (p / 1.5)
    lon_min = q + 100
    i = int((lat - lat_min) / (2.0 / 3.0 / 10.0))
    j = int((lon - lon_min) / 0.125)
    lat3 = lat_min + i * (2.0 / 3.0 / 10.0)
    lon3 = lon_min + j * 0.125
    sub_i = int((lat - lat3) / (2.0 / 3.0 / 20.0))
    sub_j = int((lon - lon3) / 0.0625)
    idx = sub_i * 2 + sub_j + 1  # 南西=1, 南東=2, 北西=3, 北東=4
    return f"{p}{q}", f"{p}{q}{i}{j}", f"{p}{q}{i}{j}{idx}"


if __name__ == "__main__":
    for name, poly, wid in [("第1校地", SITE1_LATLON, SITE1_WAY_ID),
                            ("第2校地", SITE2_LATLON, SITE2_WAY_ID),
                            ("第2校地体育館", SITE2_GYM_LATLON, SITE2_GYM_WAY_ID)]:
        bl = [to_blender_xy(*ll) for ll in poly]
        x0, x1, y0, y1 = _extent(bl)
        c = bl[0]
        m2, m3, m4 = mesh2_3_4(*poly[0])
        print(f"{name} (way {wid}, {len(poly)}頂点)")
        print(f"  先頭点 BlenderXY = ({c[0]:.2f}, {c[1]:.2f}) m")
        print(f"  ローカル範囲: E {x1-x0:8.2f} m × N {y1-y0:8.2f} m   "
              f"[E {x0:9.2f}..{x1:9.2f}, N {y0:9.2f}..{y1:9.2f}]")
        print(f"  メッシュ: 2次={m2} 3次={m3} 4次={m4}")
        print()
    # 2校地間の距離
    import math
    s1 = [to_blender_xy(*p) for p in [sum(SITE1_LATLON)/(0+1)]] if False else None
    lat1 = sum(p[0] for p in SITE1_LATLON) / len(SITE1_LATLON)
    lon1 = sum(p[1] for p in SITE1_LATLON) / len(SITE1_LATLON)
    lat2 = sum(p[0] for p in SITE2_LATLON) / len(SITE2_LATLON)
    lon2 = sum(p[1] for p in SITE2_LATLON) / len(SITE2_LATLON)
    b1 = to_blender_xy(lat1, lon1)
    b2 = to_blender_xy(lat2, lon2)
    print(f"校地重心間距離 概算: {math.hypot(b2[0]-b1[0], b2[1]-b1[1]):,.0f} m （東 {b2[0]-b1[0]:+.0f} m, 北 {b2[1]-b1[1]:+.0f} m）")
