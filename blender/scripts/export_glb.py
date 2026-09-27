# -*- coding: utf-8 -*-
"""
export_glb.py
川口市立高等学校 3Dプロジェクト — Vercel(three.js)公開用 glTF/GLB エクスポート
=============================================================================
何が起きるか（1行）:
    指定コレクション（または全シーン）を GLB として書き出す（+Y up、Draco圧縮=可能ならON）。
    three.js では +X=東 / -Z=北 / +Y=上 になります（Blender: +X=東,+Y=北,+Z=上 から自動変換）。

配置: 出力先フォルダの中身を web/public/models/ にコピーして使います。
      例: campus.glb → web/public/models/campus.glb → サイトの /models/campus.glb で配信。
"""

import os
import bpy

# ---- 出力設定（環境に合わせて変更）--------------------------------------------
# 出力先: 現行blendと同じ階層の export_glb/ または指定パス
EXPORT_DIR = bpy.path.abspath("//export_glb/")
# 単一ファイルで出すか（True: campus.glb 1本だけ / False: コレクションごとに分割）
SINGLE_ALL_IN_ONE = True
SINGLE_NAME = "campus.glb"
# 分割出力する対象コレクション（SINGLE_ALL_IN_ONE=False のとき）
TARGET_COLLECTIONS = [
    "10_Site_Terrain", "11_Site_Roads", "12_Site_Surround",
    "20_Ext_校舎棟", "21_Ext_アリーナN棟", "22_Ext_アリーナS棟",
    "23_Ext_外構", "24_Ext_グラウンド", "25_Ext_第2校地",
    "30_Int_B1", "31_Int_1F", "32_Int_2F", "33_Int_3F", "34_Int_4F", "35_Int_5F",
    "36_Int_ラーニングストリート", "37_Int_アリーナ",
    "40_Landscape", "50_Props",
]
FILE_PREFIX = ""  # 共通接頭辞


def _select_objects(objs):
    bpy.ops.object.select_all(action='DESELECT')
    any_sel = False
    for ob in objs:
        ob.select_set(True)
        any_sel = True
    return any_sel


def _kwargs(filepath):
    kw = dict(
        filepath=filepath,
        export_format='GLB',
        export_yup=True,           # Blender Z-up → glTF Y-up（three.js: -Z=北）
        export_apply=True,         # モディファイアを適用して書き出す（非破壊のまま保持）
        export_texcoords=True,
        export_normals=True,
        export_materials='EXPORT',
        export_cameras=False,
        export_lights=False,
        export_extras=True,        # カスタムプロパティ（根拠/確度タグ）を保持
    )
    # Draco圧縮（エクスポータが対応している場合のみ）
    try:
        kw["export_draco_mesh_compression_enable"] = True
        kw["export_draco_mesh_compression_level"] = 6
    except Exception:
        pass
    return kw


def export_collection(col, outdir):
    objs = [o for o in col.all_objects if o.type in {'MESH', 'EMPTY', 'CURVE', 'SURFACE', 'FONT'}]
    if not objs:
        print("  [skip] {} (オブジェクトなし)".format(col.name))
        return
    if not _select_objects(objs):
        return
    name = FILE_PREFIX + col.name.replace("/", "_") + ".glb"
    path = os.path.join(outdir, name)
    kw = _kwargs(path)
    kw["use_selection"] = True
    try:
        bpy.ops.export_scene.gltf(**kw)
    except TypeError:
        # Draco 引数非対応バージョンへのフォールバック
        kw.pop("export_draco_mesh_compression_enable", None)
        kw.pop("export_draco_mesh_compression_level", None)
        bpy.ops.export_scene.gltf(**kw)
    print("  [OK] {} ({} objects) -> {}".format(col.name, len(objs), path))


def export_all(outdir):
    _select_objects([o for o in bpy.context.scene.objects])
    path = os.path.join(outdir, SINGLE_NAME)
    kw = _kwargs(path)
    kw["use_selection"] = True
    try:
        bpy.ops.export_scene.gltf(**kw)
    except TypeError:
        kw.pop("export_draco_mesh_compression_enable", None)
        kw.pop("export_draco_mesh_compression_level", None)
        bpy.ops.export_scene.gltf(**kw)
    print("  [OK] ALL -> {}".format(path))


def main():
    os.makedirs(EXPORT_DIR, exist_ok=True)
    print("\n===== export_glb 開始 (出力先: {}) =====".format(EXPORT_DIR))
    if SINGLE_ALL_IN_ONE:
        export_all(EXPORT_DIR)
    else:
        for name in TARGET_COLLECTIONS:
            col = bpy.data.collections.get(name)
            if col is None:
                print("  [skip] コレクション未定義: {}".format(name))
                continue
            export_collection(col, EXPORT_DIR)
    print("""
次にやること:
  1) 出力された .glb を web/public/models/ にコピー（all-in-oneなら campus.glb 1本）
  2) cd web && npm install && npm run dev → http://localhost:3000 で表示確認
  3) Vercel の Root Directory は web/ に設定してデプロイ
座標メモ: three.js では +X=東 / -Z=北 / +Y=上（Blenderの +Y=北 は -Z に変換済み）
===== export_glb 完了 =====
""")


if __name__ == "__main__":
    main()
