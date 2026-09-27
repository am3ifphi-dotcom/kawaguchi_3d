# -*- coding: utf-8 -*-
"""
phase3d_roof.py v1.0 — 校舎 屋上トラス架構 + 中庭(ラーニングストリート)膜屋根
実行: Blender Scripting ワークスペースで「スクリプト実行」。再実行安全(自コレクションのみ再生成)。

根拠(refs: 27901siryou.pdf より週次復旧・結論は本ファイルと docs/phase3 に固着):
- 0038_1086x467.jpg = 校舎断面図:
    * 1F=4000 / 2-5F=3600 / RF=3400 → 軒高 18,486 / 建築物高さ 21,866? → 21,886 (ロック済)
    * 両翼屋上・街路側端に Xブレースのトラス架構(高さ 3,400) → 膜屋根はその頂部から架かる緩アーチ
    * 中庭下部 1F=大ホール、上層=ラーニングストリート吹抜
- 0035_1237x319.jpg = 校舎立面: 屋上の開放ペルゴラ状架構が全長に連続
- 0028_1150x394.jpg = 屋根伏図+F平面: 街路両縁にトラス帯(X表記)、全体N-S総寸法 45,675
    * ストリート幅 = 45675 - 2*(2100庇+7800室+3200廊下)*? 整理: 45675-2*(2100+7800+3200)=19,475
      → 19.5m を採用 【図面読取推定 ±0.5m】
- フレーム奥行 1.2m / 膜矢高 1.8m は 【断面比読み推定 ±0.5m】

配置決定(masses非改変):
- 街路中心線 = 両翼共用稜線 A=(6.25,33.56) → B=(99.7,38.07) (phase2 masses の bldg_schoolS/N 共有辺)
  ※ blockout では両翼が接合(街路幅ゼロ扱い)。膜屋根は共用線上空に span19.5m で架け、
    脚は各翼屋根の内側に着地(量体の中に埋まらず屋根上に乗る)。街路 VOID 自体は内部
    フェーズ(大ホール/ストリート吹抜モデリング時)で扱う。LOD3 外観近似である旨を明記。
- フレーム分割: 柱スパン 7,800 ×12 bays (=93.6m) に整合。
"""
import math

# ---------- 設計定数 ----------
AX_A = (6.25, 33.56)   # 街路中心線 西端 (x,y) [masses 共有辺端点]
AX_B = (99.7, 38.07)   # 街路中心線 東端
ROOF_Z   = 18.486      # 軒高/屋根面 (確定値)
TOP_Z    = 21.886      # 建築物高さ = トラス天端 (確定値)
FRAME_H  = TOP_Z - ROOF_Z          # 3.4 確定
FRAME_D  = 1.2         # トラス奥行 【断面比読み推定】
SPAN     = 19.5        # 膜スパン(=ストリート幅) 【図面読取推定 ±0.5m】
RISE     = 1.8         # 膜矢高(頂 = 23.686) 【断面比読み推定 ±0.5m】
BAY      = 7.8         # 柱スパン 12 bay = 93.6m
CHORD    = 0.25        # 弦材角
WEB      = 0.12        # 斜材/鉛直材
SEAM_R   = 0.03        # 膜シーム
CABLE_R  = 0.05        # 縁/頂ケーブル
AXIS_SEG = 48          # 膜メッシュの軸方向分割
ARC_SEG  = 12          # 膜断面分割
COL_NAME = "30_Roof_School"

# ---------- 座標系 ----------
def _axis():
    ax, ay = AX_A; bx, by = AX_B
    dx, dy = bx - ax, by - ay
    L = math.hypot(dx, dy)
    d = (dx / L, dy / L)
    n = (-d[1], d[0])          # 北側(=n +) が N翼側
    return d, n, L

def _pt(a, s, off, n, d):
    """軸始点から距離 s・法線オフセット off の(x,y)"""
    return (a[0] + d[0] * s + n[0] * off, a[1] + d[1] * s + n[1] * off)

# ---------- 梁生成(全て merge 用の頂点列) ----------
def _beam(verts, faces, p1, p2, w, h=None, up=(0, 0, 1)):
    """2点間に断面 w×h の角材メッシュを積む"""
    h = w if h is None else h
    ax = (p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2])
    al = math.sqrt(ax[0] ** 2 + ax[1] ** 2 + ax[2] ** 2)
    if al < 1e-6:
        return
    ax = (ax[0] / al, ax[1] / al, ax[2] / al)
    # 側方向 = ax × up (水平梁は XY 面内の法線、鉛直・鉛直面内斜材は軸方向)
    sx = ax[1] * up[2] - ax[2] * up[1]
    sy = ax[2] * up[0] - ax[0] * up[2]
    sz = ax[0] * up[1] - ax[1] * up[0]
    sl = math.sqrt(sx * sx + sy * sy + sz * sz)
    if sl < 1e-6:
        up = (1, 0, 0) if abs(ax[0]) < 0.9 else (0, 1, 0)
        sx = ax[1] * up[2] - ax[2] * up[1]; sy = ax[2] * up[0] - ax[0] * up[2]; sz = ax[0] * up[1] - ax[1] * up[0]
        sl = math.sqrt(sx * sx + sy * sy + sz * sz)
    sx, sy, sz = sx / sl, sy / sl, sz / sl
    tx = sy * ax[2] - sz * ax[1]; ty = sz * ax[0] - sx * ax[2]; tz = sx * ax[1] - sy * ax[0]
    hw, hh = w / 2.0, h / 2.0
    base = len(verts)
    for px, py, pz in (p1, p2):
        for a, b in ((-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)):
            verts.append((px + sx * a + tx * b, py + sy * a + ty * b, pz + sz * a + tz * b))
    faces += [(base + 0, base + 1, base + 2, base + 3),
              (base + 7, base + 6, base + 5, base + 4),
              (base + 0, base + 4, base + 5, base + 1),
              (base + 1, base + 5, base + 6, base + 2),
              (base + 2, base + 6, base + 7, base + 3),
              (base + 3, base + 7, base + 4, base + 0)]

def build_frame_spec(side):
    """片翼分のトラス架構。side=+1: N翼側 / -1: S翼側。戻り値 (verts, faces)"""
    d, n, L = _axis()
    nbay = int(round(L / BAY))          # ≈12
    step = L / nbay
    verts, faces = [], []
    for pl in (-FRAME_D / 2.0, FRAME_D / 2.0):       # 内外 2 トラス面
        off = side * SPAN / 2.0 + pl
        for i in range(nbay + 1):                     # 鉛直材
            x, y = _pt(AX_A, i * step, off, n, d)
            _beam(verts, faces, (x, y, ROOF_Z), (x, y, TOP_Z), WEB, WEB, up=(d[0], d[1], 0))
        for i in range(nbay):                         # 上下弦 + X斜材
            x1, y1 = _pt(AX_A, i * step, off, n, d)
            x2, y2 = _pt(AX_A, (i + 1) * step, off, n, d)
            _beam(verts, faces, (x1, y1, ROOF_Z + 0.05), (x2, y2, ROOF_Z + 0.05), CHORD, CHORD)
            _beam(verts, faces, (x1, y1, TOP_Z - 0.05), (x2, y2, TOP_Z - 0.05), CHORD, CHORD)
            _beam(verts, faces, (x1, y1, ROOF_Z), (x2, y2, TOP_Z), WEB, WEB, up=(d[0], d[1], 0))
            _beam(verts, faces, (x2, y2, ROOF_Z), (x1, y1, TOP_Z), WEB, WEB, up=(d[0], d[1], 0))
    for i in range(nbay + 1):                          # 内外を繋ぐ横架材(屋根ボルト留め風の短材)
        xa, ya = _pt(AX_A, i * step, side * SPAN / 2.0 - FRAME_D / 2.0, n, d)
        xb, yb = _pt(AX_A, i * step, side * SPAN / 2.0 + FRAME_D / 2.0, n, d)
        _beam(verts, faces, (xa, ya, TOP_Z - 0.1), (xb, yb, TOP_Z - 0.1), WEB, WEB)
    return verts, faces

def _arc_z(t):
    """t∈[-1,1] の膜高さ(脚=トラス天端)"""
    return TOP_Z + RISE * (1.0 - t * t)

def build_membrane_spec():
    """膜屋根 + シーム + 縁/頂ケーブル。戻り値 dict"""
    d, n, L = _axis()
    verts, faces = [], []
    # 断面プロファイル(法線方向を ARC_SEG 分割)
    prof = [(-1.0 + 2.0 * i / ARC_SEG) for i in range(ARC_SEG + 1)]
    nsta = AXIS_SEG + 1
    for i in range(nsta):
        s = L * i / AXIS_SEG
        for t in prof:
            x, y = _pt(AX_A, s, t * SPAN / 2.0, n, d)
            verts.append((x, y, _arc_z(t)))
    cols = ARC_SEG + 1
    for i in range(AXIS_SEG):
        for j in range(ARC_SEG):
            a = i * cols + j; b = a + 1
            c = (i + 1) * cols + j + 1; e = (i + 1) * cols + j
            faces.append((a, b, c, e))
    # シーム(ナット/吊りケーブル交点想定): bay 位置ごと断面方向リブ、頂/縁ケーブルは軸方向
    sv, sf = [], []
    nbay = int(round(L / BAY)); step = L / nbay
    for i in range(nbay + 1):                          # 断面シーム
        s = i * step
        prev = None
        for j in range(ARC_SEG + 1):
            t = -1.0 + 2.0 * j / ARC_SEG
            x, y = _pt(AX_A, s, t * SPAN / 2.0, n, d)
            p = (x, y, _arc_z(t) + 0.02)
            if prev: _beam(sv, sf, prev, p, SEAM_R)
            prev = p
    for off, rr in ((0.0, CABLE_R), (-SPAN / 2.0, CABLE_R), (SPAN / 2.0, CABLE_R)):
        prev = None                                     # 頂(+縁)ケーブルを軸方向に
        for i in range(nsta):
            s = L * i / AXIS_SEG
            t = off / (SPAN / 2.0) if SPAN else 0.0
            x, y = _pt(AX_A, s, off, n, d)
            p = (x, y, _arc_z(t) + 0.02)
            if prev: _beam(sv, sf, prev, p, rr)
            prev = p
    return {"membrane": (verts, faces), "seams": (sv, sf)}

def specs_all():
    return {
        "frame_S": build_frame_spec(-1),
        "frame_N": build_frame_spec(+1),
        **build_membrane_spec(),
    }

# ---------- Blender 実行部 ----------
def _mesh_obj(name, data, mat, col):
    try:
        import bpy
    except ImportError:
        return None
    verts, faces = data
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces); me.update()
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    if mat: ob.data.materials.append(mat)
    return ob

def main():
    import bpy
    # 既存コレクション清掃(再実行安全)
    old = bpy.data.collections.get(COL_NAME)
    if old:
        for o in list(old.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(old)
    col = bpy.data.collections.new(COL_NAME)
    bpy.context.scene.collection.children.link(col)

    def mat(name, rgb, metallic=0.0, rough=0.5, alpha=1.0):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        bsdf = m.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Roughness"].default_value = rough
        bsdf.inputs["Metallic"].default_value = metallic
        if alpha < 1.0:
            bsdf.inputs["Alpha"].default_value = alpha
            try: m.surface_render_method = 'DITHERED'
            except AttributeError:
                try: m.blend_method = 'BLEND'
                except Exception: pass
        return m

    m_steel = mat("P3d_Steel_White", (0.92, 0.93, 0.94), metallic=0.7, rough=0.35)
    m_memb  = mat("P3d_Membrane", (0.96, 0.96, 0.94), rough=0.6, alpha=0.75)
    m_cable = mat("P3d_Cable", (0.5, 0.52, 0.55), metallic=0.8, rough=0.3)

    sp = specs_all()
    _mesh_obj("roof_truss_S", sp["frame_S"], m_steel, col)
    _mesh_obj("roof_truss_N", sp["frame_N"], m_steel, col)
    _mesh_obj("roof_membrane", sp["membrane"], m_memb, col)
    _mesh_obj("roof_seams_cables", sp["seams"], m_cable, col)
    nf = len(sp["frame_S"][1]) + len(sp["frame_N"][1])
    print(f"--- Phase 3d 屋上トラス+膜屋根 v1.0 ---")
    print(f"truss 面数(S+N)={nf} membrane面={len(sp['membrane'][1])} seams面={len(sp['seams'][1])}")
    print(f"frame_h={FRAME_H:.3f}m(+3.4確定) span={SPAN} rise={RISE} bay={BAY}x12")
    print("完了")

if __name__ == "__main__":
    try:
        import bpy  # noqa
        main()
    except ImportError:
        pass
