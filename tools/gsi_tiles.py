#!/usr/bin/env python3
"""
gsi_tiles.py — 国土地理院タイルの必要URL一覧を計算する（登録不要・ブラウザで保存可）
================================================================================
FGD（基盤地図情報ダウンロード）の代替として、**無登録で直に取れる地理院タイル**を使う。

出力:
  - 標高タイル dem_*_png (z15, 5mDEM) ... GL標高の確定用
  - 空中写真 seamlessphoto (z16)      ... 敷地の見取り/配置トレース用
  - 淡色地図 std (z16)                ... 道路/地名の確認用

形式: https://cyberjapandata.gsi.go.jp/xyz/{layer}/{z}/{x}/{y}.png
  - dem_png  : GSI標高タイル（z0-14は10m相当, z15は5m相当）
  - dem5a_png / dem5b_png : 5mDEM（z15）。取得可否は地域により異なるので
    両方/優先順に試す。dem_png でもよい（やや粗め）。
  - seamlessphoto : 全国最新写真（z<=18）
  - std : 淡色地図
"""
import math

# 入力: 敷地bbox(lat/lon) + マージン[m]
SITES = {
    "site1_第1校地": dict(lat_min=35.8249245, lat_max=35.8274250,
                          lon_min=139.7174159, lon_max=139.7206825, margin_m=300.0),
    "site2_第2校地": dict(lat_min=35.8063716, lat_max=35.8087580,
                          lon_min=139.7475274, lon_max=139.7507889, margin_m=150.0),
}

LAYERS_DEM = ["dem5a_png", "dem5b_png", "dem_png"]


def lonlat_to_tile(lon_deg, lat_deg, z):
    """Slippy XYZ タイル番号 (GSIはこれに準拠)。"""
    lat_rad = math.radians(lat_deg)
    n = 2**z
    x = int((lon_deg + 180.0) / 360.0 * n)
    y = int((1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return x, y


def deg_margin(lat_deg, m):
    return m / 111320.0, m / (111320.0 * math.cos(math.radians(lat_deg)))


def tiles_for(bbox, z):
    lat_c = (bbox["lat_min"] + bbox["lat_max"]) / 2.0
    dlat, dlon = deg_margin(lat_c, bbox["margin_m"])
    x0, y0 = lonlat_to_tile(bbox["lon_min"] - dlon, bbox["lat_max"] + dlat, z)
    x1, y1 = lonlat_to_tile(bbox["lon_max"] + dlon, bbox["lat_min"] - dlat, z)
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            yield x, y


BASE = "https://cyberjapandata.gsi.go.jp/xyz/{layer}/{z}/{x}/{y}.png"


def main():
    for name, bb in SITES.items():
        print("=" * 78)
        print(name, " bbox=", {k: round(v, 6) for k, v in bb.items() if k != "margin_m"})
        print("-" * 78)
        dem = list(tiles_for(bb, 15))
        print(f"[標高タイル z15 ×{len(dem)}枚]  各レイヤで1つずつ試して保存（出ない場合は次へ）")
        for x, y in dem:
            for layer in LAYERS_DEM:
                print("   ", BASE.format(layer=layer, z=15, x=x, y=y))
    for name, bb in SITES.items():
        print("=" * 78)
        print(name, " 空中写真/淡色地図（z16 は数枚で済む一覧。z17〜18の高精細はBlenderGISで自動取得推奨）")
        for layer in ("seamlessphoto", "std"):
            tiles = list(tiles_for(bb, 16))
            print(f"[{layer} z16 ×{len(tiles)}枚]")
            for x, y in tiles:
                print("   ", BASE.format(layer=layer, z=16, x=x, y=y))


if __name__ == "__main__":
    main()
