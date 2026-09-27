# -*- coding: utf-8 -*-
"""
phase3_facade.py (v0.1 / 3a)
川口市立高等学校 3Dプロジェクト — Phase 3a: 校舎S翼 外装LOD3（南面+北面）
============================================================
何が起きるか:
    20_Facade_SchoolS コレクションに、S翼の長手2面へ:
      - 7800柱距の外柱(パラペット一体)
      - 各階(2F-5F) 腰部縦ルーバー帯 h1.45 + ガラス帯 h2.15 (層高3.6)
      - 1F ピロティ(面内1.8mインセットのガラス帯)
      - 軒パラペット帯 (+1.2, 全辺)
    を配置する。PLATEAU外形(押出体)はそのまま残り「壁芯」として引き立つ。

出典/タグ: 7800柱距・階高(1F4.0, 2-5F3.6, 軒18.486)=図面確定
           パネル4×1950/柱450系/ルーバー600系/パラペット+1.2=立面観察・写真推定
"""
import os, json, math
try:
    import bpy
except ImportError:
    bpy = None

SAVE_AS_BLEND = True
SAVE_PATH = os.path.join(os.path.expanduser("~"), "kawaguchi_3d.blend")
COL = "20_Facade_SchoolS"

# ---------- 外形 (phase2_masses v3 bldg_schoolS のリング) ----------
TARGET = "bldg_schoolS"
EAVES = 18.486          # 軒高(確定)
FLOOR_ZS = [4.0, 7.6, 11.2, 14.8]  # 2F-5F 床(確定: 1F4.0+3.6系)
LOUVER_H, GLASS_H = 1.45, 2.15     # 腰部/窓高(断面系・確定帯)
BAY_NOM = 7.8          # 柱距(確定 7800)
PILASTER_W = 0.45      # 柱巾(写真推定450系)
PILASTER_OUT = 0.15    # 柱の面外出
ARCADE_IN = 1.8        # 1Fピロティ奥行き
PARAPET_H = 1.2        # パラペット(写真推定)
MIN_FACE_M = 30.0      # ファサードを貼る最短辺(端面は除外→v1は長手2面のみ)

def load_school_ring():
    try:
        M = json.load(open(os.path.join(os.path.expanduser("~"), "kawaguchi_3d", "docs", "phase2", "phase2_masses.json"), encoding="utf-8"))
        for v in M["volumes"]:
            if v["name"] == TARGET:
                return v["ring"]
    except Exception:
        pass
    return None

# ---------- 幾何Spec (bpy非依存・サンドボックス検証単位) ----------
def edges_long(ring):
    out = []
    n = len(ring)
    for i in range(n):
        x0, y0 = ring[i]; x1, y1 = ring[(i + 1) % n]
        L = math.hypot(x1 - x0, y1 - y0)
        if L >= MIN_FACE_M:
            out.append((x0, y0, x1, y1, L))
    return out

def outward_corners(ring):
    s = 0.0
    for i, (x, y) in enumerate(ring):
        x1, y1 = ring[(i + 1) % len(ring)]
        s += x * y1 - x1 * y
    return s

def build_spec(ring):
    """戻り値: dict of lists
      pilasters: (cx, cy, zc, size_w, depth, axis(angle)) boxes 高さ=EAVES+PARAPET
      glass : 帯面矩形 (cx, cy, z0_lo, z1_hi, length, angle_vec)
      louver: same
      arcade: same (面内シフト付)
      parapet: 全辺に沿った薄壁
    """
    cx = sum(p[0] for p in ring) / len(ring); cy = sum(p[1] for p in ring) / len(ring)
    spec = {"pil": [], "glass": [], "louver": [], "arcade": [], "parapet": [], "meta": []}
    for (x0, y0, x1, y1, L) in edges_long(ring):
        dx = (x1 - x0) / L; dy = (y1 - y0) / L
        nx, ny = -dy, dx                      # 一旦どちらか
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        if (cx - mx) * nx + (cy - my) * ny > 0:  # 中心側を向いていたら反転→必ず外向き
            nx, ny = -nx, -ny
        spec["meta"].append((x0, y0, x1, y1, nx, ny, L))
        nb = max(1, int(round(L / BAY_NOM)))
        pitch = L / nb
        for i in range(nb + 1):
            px = x0 + dx * pitch * i + nx * PILASTER_OUT
            py = y0 + dy * pitch * i + ny * PILASTER_OUT
            spec["pil"].append((px, py, (EAVES + PARAPET_H) / 2, PILASTER_W))
        for zf in FLOOR_ZS:
            mx = (x0 + x1) / 2 + nx * 0.03; my = (y0 + y1) / 2 + ny * 0.03
            spec["louver"].append((mx, my, zf, LOUVER_H, L, nx, ny, dx, dy))
            mx2 = (x0 + x1) / 2 + nx * 0.05; my2 = (y0 + y1) / 2 + ny * 0.05
            spec["glass"].append((mx2, my2, zf + LOUVER_H, GLASS_H, L, nx, ny, dx, dy))
        # 1F ピロティ(面内シフトのガラス帯)
        mx3 = (x0 + x1) / 2 - nx * ARCADE_IN; my3 = (y0 + y1) / 2 - ny * ARCADE_IN
        spec["arcade"].append((mx3, my3, 0.0, 3.4, L, nx, ny, dx, dy))
        # パラペット帯(面その位置/薄壁 h=PARAPET_H)
        mx4 = (x0 + x1) / 2; my4 = (y0 + y1) / 2
        spec["parapet"].append((mx4, my4, EAVES, PARAPET_H, L + 0.4, dx, dy))
    # 長手以外の辺にもパラペット
    n = len(ring)
    for i in range(n):
        x0, y0 = ring[i]; x1, y1 = ring[(i + 1) % n]
        L = math.hypot(x1 - x0, y1 - y0)
        if L >= 1.0 and L < MIN_FACE_M:
            dx = (x1 - x0) / L; dy = (y1 - y0) / L
            mx = (x0 + x1) / 2; my = (y0 + y1) / 2
            spec["parapet"].append((mx, my, EAVES, PARAPET_H, L + 0.4, dx, dy))
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

def main():
    ring = load_school_ring()
    if not ring:
        print("  [エラー] phase2_masses.json が C:\\Users\\＊\\kawaguchi_3d\\docs\\phase2\\ に見つからない")
        return
    spec = build_spec(ring)
    col = bpy.data.collections.get(COL)
    if col is None:
        col = bpy.data.collections.new(COL)
        bpy.context.scene.collection.children.link(col)
    for o in list(col.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    m_pil = make_mat("M_fac_柱", (0.72, 0.73, 0.75), rough=0.8)
    m_glass = make_mat("M_fac_ガラス", (0.45, 0.62, 0.78), alpha=0.55, metal=0.85, rough=0.12)
    m_louv = make_mat("M_fac_ルーバー", (0.30, 0.31, 0.33), metal=0.7, rough=0.38)
    m_arc = make_mat("M_fac_ガラス1F", (0.50, 0.66, 0.80), alpha=0.6, metal=0.85, rough=0.12)
    m_par = make_mat("M_fac_パラペット", (0.60, 0.61, 0.63), rough=0.85)
    n_all = 0
    for i, (px, py, zc, w) in enumerate(spec["pil"]):
        o = add_box_mesh(f"fac_pil_{i:03d}", (w, w, EAVES + PARAPET_H))
        o.location = (px, py, zc); col.objects.link(o); o.data.materials.append(m_pil); n_all += 1
    for tag, mat, seq_key in (("louver", m_louv, "louver"), ("glass", m_glass, "glass"), ("arcade", m_arc, "arcade")):
        for i, (mx, my, z0, h, L, nx, ny, dx, dy) in enumerate(spec[tag]):
            o = add_box_mesh(f"fac_{tag}_{i:03d}", (L, 0.06, h))
            o.location = (mx, my, z0 + h / 2)
            o.rotation_euler = (0, 0, math.atan2(dy, dx))
            col.objects.link(o); o.data.materials.append(mat); n_all += 1
    for i, (mx, my, z0, h, L, dx, dy) in enumerate(spec["parapet"]):
        o = add_box_mesh(f"fac_par_{i:03d}", (L, 0.20, h))
        o.location = (mx, my, z0 + h / 2)
        o.rotation_euler = (0, 0, math.atan2(dy, dx))
        col.objects.link(o); o.data.materials.append(m_par); n_all += 1
    if SAVE_AS_BLEND:
        try:
            bpy.ops.wm.save_as_mainfile(filepath=SAVE_PATH)
            print("  保存しました: " + SAVE_PATH)
        except Exception as exc:
            print("  [警告] 保存失敗: {}".format(exc))
    print("  [生成] 柱{:3d}本 / ルーバー帯{:2d} / ガラス帯{:2d} / 1Fアーケード{:d} / パラペット{:2d}".format(
        len(spec["pil"]), len(spec["louver"]), len(spec["glass"]), len(spec["arcade"]), len(spec["parapet"])))
    print("===== phase3a facade 完了 (校舎S翼 南/北立面) =====")

if bpy is not None:
    main()
