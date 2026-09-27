# -*- coding: utf-8 -*-
"""
phase3_facade.py (v1.1 / 3a+3b)
川口市立高等学校 3Dプロジェクト — Phase 3: 校舎3棟 外装LOD3
            3a: S翼(南/北立面)   3b: N翼 + 管理帯(北帯)
============================================================
何が起きるか:
    校舎S翼・N翼・管理帯の3棟へ長手2面ずつ:
      - 7800柱距の外柱(パラペット一体)
      - 各階(2F-5F) 腰部縦ルーバー帯 h1.45 + ガラス帯 h2.15 (層高3.6/1F4.0)
      - 1F ピロティ(面内1.8mインセット)
      - 軒パラペット(管理帯のみ高さ2.2m=PLATEAU高さ整合)
    を 20_Facade_School コレクションへ生成。
    外形はスクリプト埋め込み（Raw貼付のみで動作）。

出典/タグ: 7800柱距・階高・軒18.486=図面確定。柱450/パラペット+1.2(管理帯は2.2)/4枚パネル=立面観察・写真推定。
"""
import os, json, math
try:
    import bpy
except ImportError:
    bpy = None

SAVE_AS_BLEND = True
SAVE_PATH = os.path.join(os.path.expanduser("~"), "kawaguchi_3d.blend")

COL = "20_Facade_School"
# 共通パラメータ
BAY_NOM = 7.8
PILASTER_W = 0.45
PILASTER_OUT = 0.15
ARCADE_IN = 1.8
MIN_FACE_M = 30.0

_TARGETS_DEF = None  # 後段で代入（JSON文字列→生成コード化の都合）

def default_params():
    return {
        "eaves": 18.486,
        "floor_zs": [4.0, 7.6, 11.2, 14.8],
        "louver_h": 1.45, "glass_h": 2.15,
        "parapet_h": 1.2,
        "long_faces_only": True,
    }

def targets():
    """各棟: name, ring(埋め込み), params上書き"""
    return TARGETS_EMBED

# ---------- 幾何Spec (bpy非依存・検証単位) ----------
def edges_long(ring, min_m=MIN_FACE_M):
    out = []
    n = len(ring)
    for i in range(n):
        x0, y0 = ring[i]; x1, y1 = ring[(i + 1) % n]
        L = math.hypot(x1 - x0, y1 - y0)
        if L >= min_m:
            out.append((x0, y0, x1, y1, L))
    return out

def build_spec(ring, params):
    cx = sum(p[0] for p in ring) / len(ring); cy = sum(p[1] for p in ring) / len(ring)
    eaves = params["eaves"]; par_h = params["parapet_h"]
    fzs = params["floor_zs"]; lh = params["louver_h"]; gh = params["glass_h"]
    spec = {"pil": [], "glass": [], "louver": [], "arcade": [], "parapet": [], "meta": []}
    for (x0, y0, x1, y1, L) in edges_long(ring):
        dx = (x1 - x0) / L; dy = (y1 - y0) / L
        nx, ny = -dy, dx
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        if (cx - mx) * nx + (cy - my) * ny > 0:
            nx, ny = -nx, -ny
        spec["meta"].append((x0, y0, x1, y1, nx, ny, L))
        nb = max(1, int(round(L / BAY_NOM)))
        pitch = L / nb
        for i in range(nb + 1):
            px = x0 + dx * pitch * i + nx * PILASTER_OUT
            py = y0 + dy * pitch * i + ny * PILASTER_OUT
            spec["pil"].append((px, py, (eaves + par_h) / 2, PILASTER_W))
        for zf in fzs:
            mx = mx if False else (x0 + x1) / 2 + nx * 0.03
            my = (y0 + y1) / 2 + ny * 0.03
            spec["louver"].append((mx, my, zf, lh, L, nx, ny, dx, dy))
            mx2 = (x0 + x1) / 2 + nx * 0.05; my2 = (y0 + y1) / 2 + ny * 0.05
            spec["glass"].append((mx2, my2, zf + lh, gh, L, nx, ny, dx, dy))
        mx3 = (x0 + x1) / 2 - nx * ARCADE_IN; my3 = (y0 + y1) / 2 - ny * ARCADE_IN
        spec["arcade"].append((mx3, my3, 0.0, 3.4, L, nx, ny, dx, dy))
        mx4 = (x0 + x1) / 2; my4 = (y0 + y1) / 2
        spec["parapet"].append((mx4, my4, eaves, par_h, L + 0.4, dx, dy))
    n = len(ring)
    for i in range(n):
        x0, y0 = ring[i]; x1, y1 = ring[(i + 1) % n]
        L = math.hypot(x1 - x0, y1 - y0)
        if 1.0 <= L < MIN_FACE_M:
            dx = (x1 - x0) / L; dy = (y1 - y0) / L
            mx = (x0 + x1) / 2; my = (y0 + y1) / 2
            spec["parapet"].append((mx, my, eaves, par_h, L + 0.4, dx, dy))
    return spec

# ---------- bpy パート ----------
def make_mat(name, rgb, alpha=1.0, metal=0.0, rough=0.6):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, alpha); m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Metallic"].default_value = metal
        bsdf.inputs["Roughness"].default_value = rough
        if alpha < 1.0:
            bsdf.inputs["Alpha"].default_value = alpha
            m.blend_method = 'BLEND'
    return m

def add_box_mesh(name, dims_xyz):
    w, d, h = dims_xyz
    x, y, z = w / 2, d / 2, h / 2
    v = [(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z),
         (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (2, 3, 7, 6),
         (1, 2, 6, 5), (0, 4, 7, 3)]
    me = bpy.data.meshes.new(name + "_M"); me.from_pydata(v, [], f); me.update()
    return bpy.data.objects.new(name, me)

def gen_one(target_name, ring, params, col, mats):
    sp = build_spec(ring, params)
    eaves = params["eaves"]; par_h = params["parapet_h"]
    pre = target_name.replace("bldg_", "f_")[:10]
    n_all = 0
    for i, (px, py, zc, w) in enumerate(sp["pil"]):
        o = add_box_mesh(f"{pre}_pil_{i:03d}", (w, w, eaves + par_h))
        o.location = (px, py, zc); col.objects.link(o); o.data.materials.append(mats["pil"]); n_all += 1
    for tag, mk in (("louver", "louv"), ("glass", "glass"), ("arcade", "arc")):
        for i, (mx, my, z0, h, L, nx, ny, dx, dy) in enumerate(sp[tag]):
            o = add_box_mesh(f"{pre}_{tag}_{i:03d}", (L, 0.06, h))
            o.location = (mx, my, z0 + h / 2)
            o.rotation_euler = (0, 0, math.atan2(dy, dx))
            col.objects.link(o); o.data.materials.append(mats[mk]); n_all += 1
    for i, (mx, my, z0, h, L, dx, dy) in enumerate(sp["parapet"]):
        o = add_box_mesh(f"{pre}_par_{i:03d}", (L, 0.20, h))
        o.location = (mx, my, z0 + h / 2)
        o.rotation_euler = (0, 0, math.atan2(dy, dx))
        col.objects.link(o); o.data.materials.append(mats["par"]); n_all += 1
    print("  [生成] {:14s} 柱{:3d} / ルーバー{:2d} / ガラス{:2d} / 1F{:d} / パラペット{:2d} (軒{:.3f}, p+{:.1f})".format(
        target_name, len(sp["pil"]), len(sp["louver"]), len(sp["glass"]), len(sp["arcade"]), len(sp["parapet"]),
        eaves, par_h))
    return n_all

def main():
    col = bpy.data.collections.get(COL)
    if col is None:
        col = bpy.data.collections.new(COL)
        bpy.context.scene.collection.children.link(col)
    old = bpy.data.collections.get("20_Facade_SchoolS")
    if old is not None:
        for o in list(old.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(old)
        print("  [清掃] 旧コレクション 20_Facade_SchoolS を削除")
    for o in list(col.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    mats = {
        "pil": make_mat("M_fac_柱", (0.72, 0.73, 0.75), rough=0.8),
        "glass": make_mat("M_fac_ガラス", (0.45, 0.62, 0.78), alpha=0.55, metal=0.85, rough=0.12),
        "louv": make_mat("M_fac_ルーバー", (0.30, 0.31, 0.33), metal=0.7, rough=0.38),
        "arc": make_mat("M_fac_ガラス1F", (0.50, 0.66, 0.80), alpha=0.6, metal=0.85, rough=0.12),
        "par": make_mat("M_fac_パラペット", (0.60, 0.61, 0.63), rough=0.85),
    }
    total = 0
    for t in targets():
        params = default_params(); params.update(t.get("params", {}))
        total += gen_one(t["name"], t["ring"], params, col, mats)
    if SAVE_AS_BLEND:
        try:
            bpy.ops.wm.save_as_mainfile(filepath=SAVE_PATH)
            print("  保存しました: " + SAVE_PATH)
        except Exception as exc:
            print("  [警告] 保存失敗: {}".format(exc))
    print("===== phase3 (3a+3b) facade 完了: 校舎3棟・全{:d}オブジェクト =====".format(total))

TARGETS_EMBED = [
 {
  "name": "bldg_schoolS",
  "ring": [
   [
    107.7,
    18.7
   ],
   [
    106.7,
    38.4
   ],
   [
    99.7,
    38.1
   ],
   [
    6.2,
    33.6
   ],
   [
    -2.9,
    33.1
   ],
   [
    -2.6,
    27.8
   ],
   [
    -2.0,
    27.8
   ],
   [
    -1.9,
    25.1
   ],
   [
    -2.8,
    25.1
   ],
   [
    -2.2,
    13.6
   ],
   [
    49.4,
    16.0
   ],
   [
    49.1,
    22.1
   ],
   [
    56.0,
    22.4
   ],
   [
    56.3,
    16.3
   ],
   [
    107.7,
    18.7
   ]
  ],
  "params": {}
 },
 {
  "name": "bldg_schoolN",
  "ring": [
   [
    99.7,
    38.1
   ],
   [
    98.2,
    57.9
   ],
   [
    5.1,
    50.5
   ],
   [
    6.2,
    33.6
   ],
   [
    99.7,
    38.1
   ]
  ],
  "params": {}
 },
 {
  "name": "bldg_admin",
  "ring": [
   [
    70.4,
    66.7
   ],
   [
    70.0,
    73.6
   ],
   [
    -5.0,
    70.1
   ],
   [
    -4.2,
    53.2
   ],
   [
    -3.0,
    53.2
   ],
   [
    -2.7,
    49.9
   ],
   [
    5.1,
    50.5
   ],
   [
    98.2,
    57.9
   ],
   [
    97.4,
    68.0
   ],
   [
    70.4,
    66.7
   ]
  ],
  "params": {
   "parapet_h": 2.2
  }
 }
]

if bpy is not None:
    main()
