#!/usr/bin/env python3
"""
latlon2xy.py — 緯度経度(JGD2011) → 平面直角座標系 換算ツール
========================================================
国土地理院「平面直角座標系への換算」計算式に基づく実装。
外部ライブラリ不要（標準 math のみ）。

川口市は 第IX系 (原点: 北緯36°00′00″, 東経139°50′00″, EPSG:6677)。

使い方:
    python3 tools/latlon2xy.py 35.8261337 139.7191328
    python3 tools/latlon2xy.py            # 既定のプロジェクト基準点を一括出力

注意: 本スクリプトの出力は BlenderGIS 等でのジオリファレンス設定の
「初期値」であり、Phase 1 で基盤地図情報・PLATEAU と突合して確定する。
"""

import math
import sys

# ---- JGD2011 楕円体定数 (GRS80) ----
A = 6378137.0           # 長半径 [m]
RF = 298.257222101      # 逆扁平率
M0 = 0.9999             # 平面直角座標系の縮尺係数

# ---- 座標系原点 (第IX系) ----
LAT0_DEG = 36.0                     # 36°00′00″N
LON0_DEG = 139.0 + 50.0 / 60.0      # 139°50′00″E


def _coeffs():
    n = 1.0 / (2.0 * RF - 1.0)
    n2, n3, n4, n5 = n**2, n**3, n**4, n**5
    A_ = [0.0] * 6
    A_[0] = 1.0 + n2 / 4.0 + n4 / 64.0
    A_[1] = -(1.5) * (n - n3 / 8.0 - n5 / 64.0)
    A_[2] = (15.0 / 16.0) * (n2 - n4 / 4.0)
    A_[3] = -(35.0 / 48.0) * (n3 - (5.0 / 16.0) * n5)
    A_[4] = (315.0 / 512.0) * n4
    A_[5] = -(693.0 / 1280.0) * n5
    alp = [0.0] * 6
    alp[1] = 0.5 * n - (2.0 / 3.0) * n2 + (5.0 / 16.0) * n3 + (41.0 / 180.0) * n4 - (127.0 / 288.0) * n5
    alp[2] = (13.0 / 48.0) * n2 - (3.0 / 5.0) * n3 + (557.0 / 1440.0) * n4 + (281.0 / 630.0) * n5
    alp[3] = (61.0 / 240.0) * n3 - (103.0 / 140.0) * n4 + (15061.0 / 26880.0) * n5
    alp[4] = (49568.0 / 161280.0) * n4 - (179.0 / 168.0) * n5
    alp[5] = (34729.0 / 80640.0) * n5
    A_bar = M0 * A / (1.0 + n) * A_[0]
    return n, A_, alp, A_bar


_N, _Ac, _ALP, _ABAR = _coeffs()


def latlon_to_xy(lat_deg, lon_deg, lat0_deg=LAT0_DEG, lon0_deg=LON0_DEG):
    """緯度経度[度] → 平面直角座標 (X[北], Y[東]) [m]。JGD2011。"""
    rad = math.pi / 180.0
    phi, lam = lat_deg * rad, lon_deg * rad
    phi0, lam0 = lat0_deg * rad, lon0_deg * rad
    n, alp, A_bar = _N, _ALP, _ABAR

    def _conf_lat(ph):
        """等角緯度 ξ の補助量 t と ξ' (∆λ=0 での値)。"""
        t = math.sinh(math.atanh(math.sin(ph))
                      - (2.0 * math.sqrt(n) / (1.0 + n))
                      * math.atanh(2.0 * math.sqrt(n) * math.sin(ph) / (1.0 + n)))
        return t

    dlam = lam - lam0
    t = _conf_lat(phi)
    lam_c, lam_s = math.cos(dlam), math.sin(dlam)
    xi_p = math.atan2(t, lam_c)                                   # ξ'
    eta_p = math.atanh(lam_s / math.sqrt(t * t + lam_c * lam_c))  # η'
    # 原点 (φ0, ∆λ=0) での ξ'
    t0 = _conf_lat(phi0)
    xi_p0 = math.atan2(t0, 1.0)

    x = A_bar * (xi_p - xi_p0)
    y = A_bar * eta_p
    for j in range(1, 6):
        x -= A_bar * alp[j] * (math.sin(2 * j * xi_p) * math.cosh(2 * j * eta_p)
                               - math.sin(2 * j * xi_p0))
        y += A_bar * alp[j] * math.cos(2 * j * xi_p) * math.sinh(2 * j * eta_p)
    return x, y


def xy_to_latlon(x, y, lat0_deg=LAT0_DEG, lon0_deg=LON0_DEG, iters=6):
    """逆換算（ニュートン法・検算用）。"""
    lat = lat0_deg + x / (M0 * 111320.0)
    lon = lon0_deg + y / (M0 * 111320.0 * math.cos(math.radians(lat0_deg)))
    for _ in range(iters):
        cx, cy = latlon_to_xy(lat, lon, lat0_deg, lon0_deg)
        dx, dy = x - cx, y - cy
        if abs(dx) < 1e-9 and abs(dy) < 1e-9:
            break
        # 数値ヤコビアン
        h = 1e-7
        xx1, xy1 = latlon_to_xy(lat + h, lon, lat0_deg, lon0_deg)
        yx1, yy1 = latlon_to_xy(lat, lon + h, lat0_deg, lon0_deg)
        jx_lat = (xx1 - cx) / h
        jy_lat = (xy1 - cy) / h
        jx_lon = (yx1 - cx) / h
        jy_lon = (yy1 - cy) / h
        det = jx_lat * jy_lon - jx_lon * jy_lat
        lat += (dx * jy_lon - dy * jx_lon) / det
        lon += (-dx * jy_lat + dy * jx_lat) / det
    return lat, lon


# ---- プロジェクト既定ポイント (Phase 0 一次調査値) ----
POINTS = [
    # (名前, 緯度, 経度, 根拠, 確度)
    ("P0 第1校地・校舎棟重心付近 (OSM way 127212336 centroid)",
     35.8261337, 139.7191328, "OpenStreetMap/Nominatim (2026-09-26取得)", "仮置き"),
    ("P1 Wikipedia記事の座標 (35°49′35.5″N 139°43′06.3″E)",
     35.0 + 49.0 / 60.0 + 35.5 / 3600.0,
     139.0 + 43.0 / 60.0 + 6.3 / 3600.0,
     "ja.wikipedia ジオハック", "仮置き"),
    ("P2 OSM敷地bbox南西角 (35.8249245, 139.7174159)",
     35.8249245, 139.7174159, "OpenStreetMap/Nominatim", "仮置き"),
    ("P3 OSM敷地bbox北東角 (35.8274250, 139.7206825)",
     35.8274250, 139.7206825, "OpenStreetMap/Nominatim", "仮置き"),
]


def main():
    if len(sys.argv) == 3:
        lat, lon = float(sys.argv[1]), float(sys.argv[2])
        x, y = latlon_to_xy(lat, lon)
        print(f"lat={lat}, lon={lon} -> 平面直角IX系: X={x:.3f}, Y={y:.3f} (JGD2011, EPSG:6677)")
        # 往復検算
        la2, lo2 = xy_to_latlon(x, y)
        print(f"  逆換算チェック: lat={la2:.9f}, lon={lo2:.9f} "
              f"(誤差 {abs(la2-lat)*111320:.2e} m 級で一致)")
        return

    print("=== 川口市立高等学校 プロジェクト基準点 一次換算 (平面直角座標系 第IX系 / JGD2011 / EPSG:6677) ===")
    print(f"系原点: {LAT0_DEG}°N, {LON0_DEG}°E, 縮尺係数 m0={M0}")
    print()
    results = {}
    for name, lat, lon, src, acc in POINTS:
        x, y = latlon_to_xy(lat, lon)
        results[name] = (x, y)
        print(f"{name}")
        print(f"  緯度 {lat:.7f} / 経度 {lon:.7f}   ->   X = {x:,.3f} m,  Y = {y:,.3f} m")
        print(f"  根拠: {src}   確度: {acc}")
        print()

    # 敷地の概寸 (bbox 対角から)
    x2, y2 = results[POINTS[2][0]]
    x3, y3 = results[POINTS[3][0]]
    print(f"OSM bbox 概寸: 南北 {abs(x3 - x2):,.1f} m × 東西 {abs(y3 - y2):,.1f} m")
    print("  ※JIA公表『キャンパスロード全長300m』と整合する桁であることの目安確認用")
    print()
    # 往復検算 (ラウンドトリップ)
    x0, y0 = latlon_to_xy(POINTS[0][1], POINTS[0][2])
    la, lo = xy_to_latlon(x0, y0)
    err = math.hypot((la - POINTS[0][1]) * 111320, (lo - POINTS[0][2]) * 111320 * math.cos(math.radians(POINTS[0][1])))
    print(f"ラウンドトリップ検算 (P0): 誤差 {err:.2e} m -> 換算は内部一貫。最終確定は Phase 1 の図根照合で行う。")


if __name__ == "__main__":
    main()
