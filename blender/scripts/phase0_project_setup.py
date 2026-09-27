# -*- coding: utf-8 -*-
"""
phase0_project_setup.py
川口市立高等学校 3Dプロジェクト — Phase 0 プロジェクト初期化スクリプト
=====================================================================
何が起きるか（1行）:
    単位=メートル/スケール1.0、JGD2011平面直角IX系のプロジェクト原点カスタムプロパティ、
    コレクション群、原点Empty、基準Sun、World、仮カメラを一括生成する
    （既存オブジェクトは削除しない．方針: 非破壊）。

実行方法:
    Blender 4.x → Scripting ワークスペース → このファイルを開く → Run Script。
    実行後は別名で保存（推奨: kawaguchi_3d.blend）。

座標系の約束（重要）:
    現実の平面直角IX系座標 (X=北[正], Y=東[正]) [m] に対し、
    Blender 座標は  bx = Y - Y0   （+X = 東）
                    by = X - X0   （+Y = 北）
                    bz = 標高 - GL (Z=0 がグラウンドレベル)
    (X0, Y0) = シーンプロパティ k3d_origin_x / k3d_origin_y。
"""

import os
import bpy
from math import radians

# ---- .blend 自動保存（ユーザー希望の受け渡し方式）-------------------------------
# True にすると、セットアップ完了後に SAVE_PATH へ .blend を自動保存します。
# パスは環境に合わせて書き換えてください（OSごとの区切りは os.path.join 推奨）。
SAVE_AS_BLEND = True
SAVE_PATH = os.path.join(os.path.expanduser("~"), "kawaguchi_3d.blend")

# -----------------------------------------------------------------------------
# Phase 0 一次調査値（tools/latlon2xy.py の出力。Phase 1 で図根照合して確定）
# -----------------------------------------------------------------------------
ORIGIN_LAT = 35.8261337      # 仮置き: OSM 校舎棟way中心 (2026-09-26取得)
ORIGIN_LON = 139.7191328     # 仮置き: 同上
ORIGIN_X = -19263.415        # 仮置き: IX系 X（北が正）[m]
ORIGIN_Y = -10318.279        # 仮置き: IX系 Y（東が正）[m]
CRS = "EPSG:6677"            # JGD2011 平面直角座標系 第IX系
ACCURACY_NOTE = "origin=仮置き(OSM由来). Phase 1 で基盤地図/PLATEAUと照合して確定すること"

# コレクション構成（命名はユーザー技術仕様に準拠 + 内部階層の細分化）
COLLECTIONS = [
    "00_Ref",            # GIS基礎データ・参考点・測量マーカ
    "10_Site_Terrain",   # DEM・オルソ写真・地形
    "11_Site_Roads",     # 道路・歩道・キャンパスロード
    "12_Site_Surround",  # 周辺建物LOD1/2 (PLATEAU)
    "20_Ext_校舎棟",
    "21_Ext_アリーナN棟",
    "22_Ext_アリーナS棟",
    "23_Ext_外構",        # 門・フェンス・駐輪場・サイン
    "24_Ext_グラウンド",  # 第1グラウンド・テニスコート・プール
    "25_Ext_第2校地",     # (スコープ確定後に使用)
    "30_Int_B1",
    "31_Int_1F",
    "32_Int_2F",
    "33_Int_3F",
    "34_Int_4F",
    "35_Int_5F",
    "36_Int_ラーニングストリート",  # 2〜5F吹抜け+膜屋根（階横断なので独立）
    "37_Int_アリーナ",
    "40_Landscape",      # 植栽（カツラ並木ほか）
    "50_Props",          # 机・椅子・ロッカー・掲示板・時計・消火器・案内サイン
    "90_Cameras",        # 検証用カメラ・ウォークスルー地点
    "99_WIP",            # 作業中置き場（完成要素はここから所属コレクションへ移す）
]


def get_or_create_collection(name, parent=None):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
    # シーン直下にリンク（既にどこかにあれば触らない）
    scn = bpy.context.scene.collection
    if parent is None:
        if col.name not in [c.name for c in scn.children]:
            scn.children.link(col)
    else:
        if col.name not in [c.name for c in parent.children]:
            parent.children.link(col)
    return col


def add_empty(name, location, display_type='PLAIN_AXES', display_size=2.0, parent_col=None, empty_rot=None):
    obj = bpy.data.objects.get(name)
    if obj is None:
        obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = display_type
    obj.empty_display_size = display_size
    obj.location = location
    if empty_rot:
        obj.rotation_euler = empty_rot
    target = parent_col or bpy.context.scene.collection
    if name not in [o.name for o in target.objects]:
        target.objects.link(obj)
    return obj


def main():
    scene = bpy.context.scene

    # ---- 1. 単位設定: メートル、Unit Scale 1.0 ----
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = 'METERS'
    scene.unit_settings.system_rotation = 'DEGREES'

    # ---- 2. シーンカスタムプロパティ（ジオリファレンス情報）----
    scene["k3d_project"] = "kawaguchi_municipal_hs_digital_twin"
    scene["k3d_crs"] = CRS
    scene["k3d_origin_lat"] = ORIGIN_LAT
    scene["k3d_origin_lon"] = ORIGIN_LON
    scene["k3d_origin_x"] = ORIGIN_X
    scene["k3d_origin_y"] = ORIGIN_Y
    scene["k3d_convention"] = "blender_x = IX_Y - origin_y (東+), blender_y = IX_X - origin_x (北+), z=0 at GL"
    scene["k3d_accuracy"] = ACCURACY_NOTE
    scene["k3d_phase"] = "Phase 0 (調査設計)"

    # ---- 3. コレクション一括生成 ----
    for name in COLLECTIONS:
        get_or_create_collection(name)
    ref_col = bpy.data.collections["00_Ref"]

    # ---- 4. 原点マーカー（Empty）----
    origin = add_empty("ORIGIN_site_P0_仮置き", (0, 0, 0), 'PLAIN_AXES', 5.0, ref_col)
    origin["desc"] = "プロジェクト原点 = 平面直角IX系 (X={:.3f}, Y={:.3f}) 相当".format(ORIGIN_X, ORIGIN_Y)
    origin["accuracy"] = "仮置き (OSM由来)"
    origin["latlon"] = "{:.7f}, {:.7f}".format(ORIGIN_LAT, ORIGIN_LON)
    origin.hide_render = True

    # 方位指示: 北・東の目印 (公差確認用)
    add_empty("REF_North_100m", (0, 100, 0), 'SINGLE_ARROW', 5.0, ref_col, (0, 0, 0))
    add_empty("REF_East_100m", (100, 0, 0), 'SINGLE_ARROW', 5.0, ref_col, (radians(90), 0, radians(-90)))

    # ---- 5. 太陽光（Phase 5 で Sun Position アドオンに置き換え）----
    sun_data = bpy.data.lights.get("SUN_placeholder") or bpy.data.lights.new("SUN_placeholder", 'SUN')
    sun_data.energy = 3.0
    sun_obj = bpy.data.objects.get("SUN_placeholder")
    if sun_obj is None:
        sun_obj = bpy.data.objects.new("SUN_placeholder", sun_data)
        ref_col.objects.link(sun_obj)
    sun_obj.rotation_euler = (radians(50), 0, radians(150))
    sun_obj["note"] = "Phase 5: Sun Position で lat/lon+日時から再設定するまでの仮光源"

    # ---- 6. World（明るすぎない中間グレー）----
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.05, 0.06, 0.08, 1.0)
        bg.inputs[1].default_value = 0.3

    # ---- 7. 仮オーバービューカメラ ----
    cam_col = bpy.data.collections["90_Cameras"]
    cam_data = bpy.data.cameras.get("CAM_Overview")
    if cam_data is None:
        cam_data = bpy.data.cameras.new("CAM_Overview")
    cam_data.lens = 35
    cam_data.clip_end = 2000
    cam_obj = bpy.data.objects.get("CAM_Overview") or bpy.data.objects.new("CAM_Overview", cam_data)
    if "CAM_Overview" not in [o.name for o in cam_col.objects]:
        cam_col.objects.link(cam_obj)
    cam_obj.location = (250, -320, 220)
    cam_obj.rotation_euler = (radians(60), 0, radians(38))

    # ---- 8. レンダリング暫定設定 ----
    scene.render.engine = 'BLENDER_EEVEE_NEXT'   # Blender 4.x: まずEeveeで軽く
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080

    # ---- 9. アドオンチェック（無くてもエラーにしない）----
    wanted = [("blendergis", "BlenderGIS (Phase 1 で必須)"),
              ("sun_position", "Sun Position (Blender同梱 → Preferencesから有効化)"),
              ("measureit", "MeasureIt")]
    print("\n===== phase0_project_setup 結果 =====")
    for mod, desc in wanted:
        ok = any(mod in (a.__module__ or "") for a in bpy.context.preferences.addons.values()) if False else mod in bpy.context.preferences.addons
        print(("  [OK] " if ok else "  [未導入] ") + mod + " - " + desc)
    print("  単位: METRIC / scale 1.0 / コレクション {} 個生成 / 原点Empty・Sun・World・仮カメラ配置 完了".format(len(COLLECTIONS)))
    print("  原点(仮置き): IX系 X={:.3f}, Y={:.3f} / lat {:.7f}, lon {:.7f}".format(ORIGIN_X, ORIGIN_Y, ORIGIN_LAT, ORIGIN_LON))
    # ---- 10. .blend 自動保存（受け渡し方式 LEG-002）----
    if SAVE_AS_BLEND:
        try:
            bpy.ops.wm.save_as_mainfile(filepath=SAVE_PATH)
            print("  保存しました: " + SAVE_PATH)
        except Exception as exc:
            print("  [警告] 自動保存に失敗: {} → 手動で名前を付けて保存してください".format(exc))
    print("  次: Phase 1（敷地: BlenderGISでDEM/空中写真/道路の実座標読込）へ ※ユーザー承認後")
    print("======================================\n")


if __name__ == "__main__":
    main()
