# -*- coding: utf-8 -*-
"""
phase3c_arena.py (v1.0 / 3c)
川口市立高等学校 3Dプロジェクト — Phase 3c: 体育施設複合アリーナ/プール棟 外装LOD3
============================================================
何が起きるか:
    20_Facade_Arena コレクションに:
      - アリーナ系(中/小/S複合): 縦フィン壁面パネル(薄板=小オブジェクト化)
        + 帯ルーバーベルト + 縦ルーバー+クレアストリ(高窓帯)
        + **アーチ屋根** (12分割の折版屋根面)
      - 連結部: ガラス屋根(傾斜) + 壁ガラス
      - 屋内プール棟: 上端クレアストリ帯(高窓推定) + 無彩色壁面
    を生成。既存の実測プリズムと共存。

出典/タグ: 高さ=図面確定(12.754/11.438, 19.871/18.836)
           立面材料(縦フィン~750mm系・帯ルーバー・クレアストリ配置) = p9/0118/0119立面観察・【写真推定】
           アーチ矢高 = 断面比率から【写真推定2.2m/2.5m】。将来 単映像 or 図面詳細で精確化。
"""
import os, math
try:
    import bpy
except ImportError:
    bpy = None

SAVE_AS_BLEND = True
SAVE_PATH = os.path.join(os.path.expanduser("~"), "kawaguchi_3d.blend")
COL = "20_Facade_Arena"

# ---------- パラメータ ----------
FIN_PITCH = 0.75       # 縦フィンピッチ(推定~750mm)
FIN_W, FIN_D = 0.28, 0.18
CLER_H = 0.9           # クレアストリ高窓高(推定)
LOUV_BAND_H = 1.0      # 腰部帯ルーバー高(推定)
ARC_SEG = 12
TARGETS_EMBED = [
 {
  "name": "arenaM",
  "type": "arena",
  "bbox": [
   -50.0,
   -12.4,
   65.0,
   84.9
  ],
  "h_wall": 11.438,
  "h_max": 12.754,
  "arc": "EW",
  "louver_z": 4.55,
  "note": "中アリーナ(1F武道場 4550)"
 },
 {
  "name": "arenaS2",
  "type": "arena",
  "bbox": [
   -93.1,
   -55.5,
   63.1,
   82.3
  ],
  "h_wall": 11.438,
  "h_max": 12.754,
  "arc": "EW",
  "louver_z": 4.55,
  "note": "小アリーナ"
 },
 {
  "name": "arenaS",
  "type": "arena",
  "bbox": [
   -122.8,
   -30.2,
   -10.0,
   45.0
  ],
  "h_wall": 18.836,
  "h_max": 19.871,
  "arc": "EW",
  "louver_z": 4.5,
  "note": "大アリーナ(19.871/18.836)"
 },
 {
  "name": "arenaJoint",
  "type": "glassroof",
  "bbox": [
   -56.2,
   -49.2,
   65.1,
   82.5
  ],
  "z": 12.5,
  "note": "中/小連結部"
 },
 {
  "name": "pool",
  "type": "pool",
  "bbox": [
   -80.3,
   -13.9,
   97.5,
   137.3
  ],
  "h_wall": 7.0,
  "note": "屋内プール(上端クレアストリ帯。高さは【推定8m】を暂態に対しh_wall7の帯配置)"
 }
]

# ---------- 幾何Spec (bpy非依存) ----------
def arcs(npts, w, rise):
    """0..w の y=z(u) アーチ(放物) → 頂点 (u_i, z_i)"""
    out = []
    for i in range(npts + 1):
        u = i / npts
        z = rise * (1 - (2 * u - 1) ** 2)
        out.append((u, z))
    return out

def build_arena_spec(t):
    """リングbbox前提。t: name, bbox(e0,e1,n0,n1), z_base=0, h_wall, h_max(棟頂), arc_dir('NS'/'EW')"""
    e0, e1, n0, n1 = t["bbox"]
    wc = e1 - e0; dc = n1 - n0
    fall = t["h_wall"]; top = t["h_max"]; rise = max(0.3, top - fall)
    spec = {"fins": [], "cls": [], "louvs": [], "arcs": [], "walls": []}
    if t.get("arc", "NS") == "NS":  # 屋根弧線がE-W方向に走る(NS断面)
        for i, (u, z) in enumerate(arcs(ARC_SEG, wc, rise)[:-1]):
            u2, z2 = arcs(ARC_SEG, wc, rise)[i + 1]
            x0 = e0 + u * wc; x1 = e0 + u2 * wc
            zz = fall + z; zz2 = fall + z2
            spec["arcs"].append(((x0, n0, zz, x1, n0, zz2), dc))
    else:  # 屋根弧線がN-S方向に走る(EW断面)
        for i, (u, z) in enumerate(arcs(ARC_SEG, dc, rise)[:-1]):
            u2, z2 = arcs(ARC_SEG, dc, rise)[i + 1]
            y0 = n0 + u * dc; y1 = n0 + u2 * dc
            zz = fall + z; zz2 = fall + z2
            spec["arcs"].append(((e0, y0, zz, e0, y1, zz2), wc))
    # 縦フィン: 面=外向き2面(短辺) + 順に長辺2面
    for face, (fx0, fy0, fx1, fy1) in enumerate(((e0, n0, e1, n0), (e0, n1, e1, n1),
                                                 (e0, n0, e0, n1), (e1, n0, e1, n1))):
        L = math.hypot(fx1 - fx0, fy1 - fy0); dx = (fx1 - fx0) / L; dy = (fy1 - fy0) / L
        nf = max(2, int(L / FIN_PITCH))
        for i in range(nf + 1):
            px = fx0 + dx * FIN_PITCH * i; py = fy0 + dy * FIN_PITCH * i
            spec["fins"].append((px, py, fall / 2, fall))
        # クレアストリ(高窓)帯: 面上部に連続スリット
        spec["cls"].append(((fx0 + fx1) / 2, (fy0 + fy1) / 2, fall - CLER_H - 0.2, CLER_H, L,
                             dx, dy))
        # 腰部ルーバーベルト(1F-2F境界)
        zb = t.get("louver_z", 4.55)
        spec["louvs"].append(((fx0 + fx1) / 2, (fy0 + fy1) / 2, zb, LOUV_BAND_H, L, dx, dy))
    return spec

def build_glassroof_spec(t):
    e0, e1, n0, n1 = t["bbox"]; z = t["z"]
    return {"glass": [((e0 + e1) / 2, (n0 + n1) / 2, z, e1 - e0, n1 - n0)]}

def build_pool_spec(t):
    e0, e1, n0, n1 = t["bbox"]
    fall = t["h_wall"]
    spec = {"cls": []}
    for (fx0, fy0, fx1, fy1) in ((e0, n0, e1, n0), (e0, n1, e1, n1), (e0, n0, e0, n1), (e1, n0, e1, n1)):
        L = math.hypot(fx1 - fx0, fy1 - fy0); dx = (fx1 - fx0) / L; dy = (fy1 - fy0) / L
        spec["cls"].append(((fx0 + fx1) / 2, (fy0 + fy1) / 2, fall - CLER_H - 0.1, CLER_H, L, dx, dy))
    return spec

# ---------- bpy ----------
def make_mat(name, rgb, alpha=1.0, metal=0.0, rough=0.6):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, alpha); m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    if b:
        b.inputs["Base Color"].default_value = (*rgb, 1.0)
        b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
        if alpha < 1.0:
            b.inputs["Alpha"].default_value = alpha; m.blend_method = 'BLEND'
    return m

def add_mesh(name, verts, faces):
    me = bpy.data.meshes.new(name + "_M"); me.from_pydata(verts, [], faces); me.update()
    return bpy.data.objects.new(name, me)

def add_box_mesh(name, dims):
    w, d, h = dims; x, y, z = w / 2, d / 2, h / 2
    v = [(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z),
         (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (2, 3, 7, 6),
         (1, 2, 6, 5), (0, 4, 7, 3)]
    return add_mesh(name, v, f)

def main():
    col = bpy.data.collections.get(COL)
    if col is None:
        col = bpy.data.collections.new(COL)
        bpy.context.scene.collection.children.link(col)
    for o in list(col.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    m_fin = make_mat("M_are_フィン", (0.78, 0.79, 0.80), metal=0.55, rough=0.4)
    m_cl = make_mat("M_are_クレアストリ", (0.50, 0.65, 0.78), alpha=0.55, metal=0.85, rough=0.15)
    m_lv = make_mat("M_are_腰ルーバー", (0.28, 0.29, 0.31), metal=0.7, rough=0.4)
    m_rg = make_mat("M_are_大屋根", (0.72, 0.73, 0.75), metal=0.5, rough=0.5)
    m_gj = make_mat("M_are_連結ガラス", (0.5, 0.66, 0.8), alpha=0.5, metal=0.85, rough=0.12)
    nf = nb = ng = nr = 0
    for t in TARGETS_EMBED:
        if t["type"] == "arena":
            sp = build_arena_spec(t)
            # フィンを1メッシュに集約(3D用各面)
            verts = []; faces = []
            for (px, py, zc, h) in sp["fins"]:
                x, y, z = FIN_W / 2, FIN_D / 2, h / 2
                base = len(verts)
                verts += [(px - x, py - y, zc - z), (px + x, py - y, zc - z), (px + x, py + y, zc - z), (px - x, py + y, zc - z),
                          (px - x, py - y, zc + z), (px + x, py - y, zc + z), (px + x, py + y, zc + z), (px - x, py + y, zc + z)]
                faces += [(base + 0, base + 3, base + 2, base + 1), (base + 4, base + 5, base + 6, base + 7),
                          (base + 0, base + 1, base + 5, base + 4), (base + 2, base + 3, base + 7, base + 6),
                          (base + 1, base + 2, base + 6, base + 5), (base + 0, base + 4, base + 7, base + 3)]
            verts = [tuple(v) for v in verts]
            me = bpy.data.meshes.new("are_fins_M"); me.from_pydata(verts, [], faces); me.update()
            o = bpy.data.objects.new("are_fins_" + t["name"][:8], me)
            col.objects.link(o); o.data.materials.append(m_fin)
            nf += len(sp["fins"])
            for (mx, my, z0, h, L, dx, dy) in sp["cls"]:
                o = add_box_mesh("are_cls", (L, 0.08, h))
                o.location = (mx, my, z0 + h / 2); o.rotation_euler = (0, 0, math.atan2(dy, dx))
                col.objects.link(o); o.data.materials.append(m_cl); nb += 1
            for (mx, my, z0, h, L, dx, dy) in sp["louvs"]:
                o = add_box_mesh("are_louv", (L, 0.10, h))
                o.location = (mx, my, z0 + h / 2); o.rotation_euler = (0, 0, math.atan2(dy, dx))
                col.objects.link(o); o.data.materials.append(m_lv); nb += 1
            for (seg, depth) in sp["arcs"]:
                (x0, y0, z0, x1, y1, z1) = seg
                # 弧形の折版: seg2点+奥行 depth の矩形(面のみ)
                verts = [(x0, y0, z0), (x1, y1, z1),
                         (x1, y1 + depth if t.get("arc", "NS") == "NS" else y1, z1),
                         (x0, y0 + depth if t.get("arc", "NS") == "NS" else y0, z0)]
                if t.get("arc", "NS") != "NS":
                    verts = [(x0, y0, z0), (x0, y1, z1),
                             (x0 + depth, y1, z1), (x0 + depth, y0, z0)]
                o = add_mesh("are_arc", verts, [(0, 1, 2, 3)])
                o.data.materials.append(m_rg); col.objects.link(o); nr += 1
        elif t["type"] == "glassroof":
            sp = build_glassroof_spec(t)
            (mx, my, z, w, d) = sp["glass"][0]
            o = add_box_mesh("are_glass_roof", (w, d, 0.25))
            o.location = (mx, my, z); col.objects.link(o); o.data.materials.append(m_gj); ng += 1
            o = add_box_mesh("are_glass_wall", (w, 0.2, z))
            o.location = (mx, my - (d / 2 - 0.1) * 0, z / 2); col.objects.link(o); o.data.materials.append(m_gj); ng += 1
        elif t["type"] == "pool":
            sp = build_pool_spec(t)
            for (mx, my, z0, h, L, dx, dy) in sp["cls"]:
                o = add_box_mesh("pool_cls", (L, 0.08, h))
                o.location = (mx, my, z0 + h / 2); o.rotation_euler = (0, 0, math.atan2(dy, dx))
                col.objects.link(o); o.data.materials.append(m_cl); nb += 1
    if SAVE_AS_BLEND:
        try:
            bpy.ops.wm.save_as_mainfile(filepath=SAVE_PATH)
            print("  保存しました: " + SAVE_PATH)
        except Exception as exc:
            print("  [警告] 保存失敗: {}".format(exc))
    print("  [生成] フィン{:4d} / 帯{:3d} / アーチ{:3d} / 連結ガラス{:2d}".format(nf, nb, nr, ng))
    print("===== phase3c arena/pool facade 完了 =====")

if bpy is not None:
    main()
