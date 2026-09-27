# -*- coding: utf-8 -*-
"""
phase1_site_setup.py
川口市立高等学校 3Dプロジェクト — Phase 1 敷地セットアップ（実座標）
=====================================================================
何が起きるか（1行）:
    OSM由来の「第1校地・第2校地・第2校地体育館」ポリゴンを実寸ローカル座標で
    カーブオブジェクトとして配置し、原点周辺に50mグリッドと基準マーカを作成、
    Phaseline 1の作業領域を確定する（既存オブジェクトは削除しない/同名は再作成）。

前提:
    先に phase0_project_setup.py を実行済みの .blend であること（原点プロパティを踏襲）。
    未実行でも動くが、その場合は座標変換にこのスクリプト内のデフォルト原点を使う。

データ出典（確度: 仮置き — OSM手書きトレース、数m級の誤差がありうる）:
    way 127212336  川口市立高等学校（第1校地）      © OpenStreetMap contributors (ODbL)
    way 601835163  川口市立高等学校第2校地          同上
    way 938140491  川口市立高等学校第2校地体育館    同上    （2026-09-27 Overpass取得）
"""

import bpy
import bmesh
from math import radians, sin, cos, sinh, cosh, tanh, atanh, atan2, sqrt, pi

# ============================================================================
# 1. 座標換算 (JGD2011 → 平面直角IX系)  ※tools/latlon2xy.py と同一ロジック
# ============================================================================
A_EL = 6378137.0
RF = 298.257222101
M0 = 0.9999
LAT0 = radians(36.0)
LON0 = radians(139.0 + 50.0 / 60.0)

_n = 1.0 / (2.0 * RF - 1.0)
_A_BAR = M0 * A_EL / (1.0 + _n) * (1.0 + _n**2 / 4.0 + _n**4 / 64.0)
_ALP = [0.0, 0.5 * _n - (2.0 / 3.0) * _n**2 + (5.0 / 16.0) * _n**3 + (41.0 / 180.0) * _n**4 - (127.0 / 288.0) * _n**5,
        (13.0 / 48.0) * _n**2 - (3.0 / 5.0) * _n**3 + (557.0 / 1440.0) * _n**4 + (281.0 / 630.0) * _n**5,
        (61.0 / 240.0) * _n**3 - (103.0 / 140.0) * _n**4 + (15061.0 / 26880.0) * _n**5,
        (49568.0 / 161280.0) * _n**4 - (179.0 / 168.0) * _n**5,
        (34729.0 / 80640.0) * _n**5]


def _conf_t(phi):
    return sinh(atanh(sin(phi)) - (2.0 * sqrt(_n) / (1.0 + _n))
                * atanh(2.0 * sqrt(_n) * sin(phi) / (1.0 + _n)))


_T0 = _conf_t(LAT0)
_XI0 = atan2(_T0, 1.0)


def ix_xy(lat_deg, lon_deg):
    """緯度経度[deg] → 平面直角IX系 (X[北], Y[東]) [m]"""
    phi, lam = radians(lat_deg), radians(lon_deg)
    dl = lam - LON0
    t = _conf_t(phi)
    xi_p = atan2(t, cos(dl))
    eta_p = atanh(sin(dl) / sqrt(t * t + cos(dl) * cos(dl)))
    x = _A_BAR * (xi_p - _XI0)
    y = _A_BAR * eta_p
    for j in range(1, 6):
        x -= _A_BAR * _ALP[j] * (sin(2 * j * xi_p) * cosh(2 * j * eta_p) - sin(2 * j * _XI0))
        y += _A_BAR * _ALP[j] * cos(2 * j * xi_p) * sinh(2 * j * eta_p)
    return x, y


# プロジェクト原点（Phase 0 決定 仮置き値 — tools/site_geometry.py と整合）
ORIGIN_IX = (-19263.415, -10318.279)


def to_bl(lat_deg, lon_deg):
    x, y = ix_xy(lat_deg, lon_deg)
    return (y - ORIGIN_IX[1], x - ORIGIN_IX[0], 0.0)   # +x=東, +y=北, z=GL


# ============================================================================
# 2. 敷地ポリゴン (OSM 2026-09-27 取得, 確度: 仮置き)
# ============================================================================
SITE1 = [(35.8258195, 139.7176366), (35.8255725, 139.7186714), (35.8249245, 139.7206283),
         (35.8249604, 139.7206825), (35.8267602, 139.7204576), (35.8268393, 139.7203573),
         (35.8268557, 139.7200780), (35.8271995, 139.7190727), (35.8274250, 139.7184410),
         (35.8273957, 139.7184312), (35.8273843, 139.7181150), (35.8269336, 139.7181309),
         (35.8269342, 139.7176741), (35.8267931, 139.7176718), (35.8267948, 139.7174159),
         (35.8266756, 139.7174183), (35.8266767, 139.7176261), (35.8262509, 139.7176177),
         (35.8262350, 139.7177429), (35.8260325, 139.7177165), (35.8258195, 139.7176366)]

SITE2 = [(35.8079556, 139.7475356), (35.8083868, 139.7482313), (35.8084829, 139.7481352),
         (35.8087580, 139.7485787), (35.8085383, 139.7487859), (35.8086096, 139.7489043),
         (35.8085295, 139.7489854), (35.8086006, 139.7490956), (35.8084020, 139.7493080),
         (35.8069117, 139.7507876), (35.8068587, 139.7507889), (35.8063716, 139.7500538),
         (35.8073362, 139.7491589), (35.8072222, 139.7489413), (35.8074958, 139.7486767),
         (35.8073460, 139.7480655), (35.8079219, 139.7475274), (35.8079556, 139.7475356)]

SITE2_GYM = [(35.8080067, 139.7491141), (35.8077054, 139.7494081), (35.8077415, 139.7494643),
             (35.8077049, 139.7495001), (35.8078471, 139.7497218), (35.8078821, 139.7496877),
             (35.8079146, 139.7497383), (35.8082176, 139.7494427), (35.8080637, 139.7492030),
             (35.8080067, 139.7491141)]

POLYS = [
    ("site_1st_boundary_P01", SITE1, "00_Ref", "OSM way 127212336 (第1校地) 仮置き"),
    ("site_2nd_boundary_P01", SITE2, "00_Ref", "OSM way 601835163 (第2校地) 仮置き"),
    ("site_2nd_gym_footprint_P01", SITE2_GYM, "00_Ref", "OSM way 938140491 (第2校地体育館) 仮置き"),
]


def get_collection(name):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return col


def make_boundaries():
    """ポリゴンを閉曲線カーブとして作成（同名は一旦削除して再作成=冪等）。"""
    for name, latlon, colname, desc in POLYS:
        old = bpy.data.objects.get(name)
        if old:
            bpy.data.objects.remove(old, do_unlink=True)
        oldc = bpy.data.curves.get(name)
        if oldc:
            bpy.data.curves.remove(oldc)
        cu = bpy.data.curves.new(name, 'CURVE')
        cu.dimensions = '3D'
        spl = cu.splines.new('POLY')
        n_pts = len(latlon) - 1  # 終点=始点なので閉曲線として扱う
        spl.points.add(n_pts - 1)
        for i, (la, lo) in enumerate(latlon[:-1]):
            x, y, z = to_bl(la, lo)
            spl.points[i].co = (x, y, 0.02, 1.0)
        spl.use_cyclic_u = True
        cu.bevel_depth = 0.15   # 視認用の細い帯
        ob = bpy.data.objects.new(name, cu)
        get_collection(colname).objects.link(ob)
        ob["source"] = desc + " ©OpenStreetMap contributors ODbL"
        ob["accuracy"] = "仮置き (OSMトレース, 数m級)"
        ob.show_in_front = True
        print("  [生成] {} ({}頂点)".format(name, len(latlon) - 1))


def make_grid(spacing=50.0, half=400.0):
    """原点周辺に方眼(辺のみメッシュ)。測量・見取りの基準。"""
    name = "site_grid_50m_P01"
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    me = bpy.data.meshes.new(name)
    verts, edges = [], []
    k = int(half / spacing)
    for i in range(-k, k + 1):
        v = len(verts)
        verts += [(i * spacing, -half, 0.0), (i * spacing, half, 0.0)]
        edges += [(v, v + 1)]
        v = len(verts)
        verts += [(-half, i * spacing, 0.0), (half, i * spacing, 0.0)]
        edges += [(v, v + 1)]
    me.from_pydata(verts, edges, [])
    ob = bpy.data.objects.new(name, me)
    get_collection("00_Ref").objects.link(ob)
    ob["note"] = "50mグリッド (±{}m) — 基準点照合用。レンダリング非推奨".format(int(half))
    ob.hide_render = True
    ob.display_type = 'WIRE'
    print("  [生成] {} (50m×±{}m)".format(name, int(half)))


def make_site2_marker():
    name = "ORIGIN_site2_ref_仮置き"
    ob = bpy.data.objects.get(name)
    if ob is None:
        ob = bpy.data.objects.new(name, None)
        get_collection("00_Ref").objects.link(ob)
    x, y = to_bl(35.8077089, 139.7488613)[:2]
    ob.location = (x, y, 0)
    ob.empty_display_type = 'CIRCLE'
    ob.empty_display_size = 10.0
    ob["desc"] = "第2校地 中心付近 (OSM centroid)。第1校地原点から 東+{:.0f}m 北{:+.0f}m".format(x, y)
    ob["accuracy"] = "仮置き"
    ob.hide_render = True
    print("  [配置] {} at ({:.1f}, {:.1f})".format(name, x, y))


def main():
    scene = bpy.context.scene
    scene["k3d_phase"] = "Phase 1 敷地 (実座標ポリゴン配置済・GIS照合待ち)"
    scene["k3d_site2_note"] = "第2校地は第1校地から約3.4km東南東。OBJ一括では扱いに注意"

    print("\n===== phase1_site_setup 開始 =====")
    make_boundaries()
    make_grid()
    make_site2_marker()

    print("""
----------------------------------------------------------------------
[次の手順 — ユーザー操作パート] Phase 1 完成には以下が必要です:

(1) 空中写真 (BlenderGIS, ネット接続あるBlenderで):
    メニュー GIS > Web geodata > Basemap → ソース「Google」ではなく
    国土地理院タイル(写真)推奨※BlenderGIS既定OSM可/最新の航空写真は
    地理院タイル seamlesphoto。ズーム 17-18, 範囲はこの敷地周辺。

(2) 地形DEM (国土地理院 基盤地図情報, 要無料登録):
    https://fgd.gsi.go.jp/download/ → 数値標高モデル 5mメッシュ
    3次メッシュ 533975 (第1・第2校地ともこの中) をDL → data/fgd/ へ。
    例: FG-GML-5339-75-DEM5-B-0001.zip

(3) PLATEAU (G空間情報センター, 規約同意の上DL):
    dataset: plateau-11203-kawaguchi-shi-2024
    必要リソース: 建築物モデル CityGML (bldg) + 地形 (dem) + 土地利用 (luse) + 道路 (tran)
    ※索引図PDFで 533975 が LOD2 整備範囲か最終確認のこと。→ data/plateau/ へ。

(4) 設計図面バイナリ (Wayback, ブラウザでDLのみ):
    実施設計別添(各階平面図!):
      https://web.archive.org/web/20161017163448id_/http://www.city.kawaguchi.lg.jp/kbn/Files/1/72011034/attach/27901siryou.pdf
    補助資料P02:
      https://web.archive.org/web/20170825145501id_/http://www.city.kawaguchi.lg.jp/kbn/Files/1/72011034/attach/P02.pdf
    → refs/city_pdf/ へ。

(5) 上記4ステップ後、私に「Phase 1 データ配置完了」と連絡 →
    PLATEAU読込・校舎ブロックアウト(Phase 2)のスクリプトを出力します。
----------------------------------------------------------------------
===== phase1_site_setup 完了: オリジン照合のため画面を調整してください（Numpad 7 で上面図）=====
""")


if __name__ == "__main__":
    main()
