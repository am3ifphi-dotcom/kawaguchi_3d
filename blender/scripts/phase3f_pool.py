# -*- coding: utf-8 -*-
"""
phase3f_pool.py v1.0 — 屋内プール棟 本格外装(透光屋根)
実行: Blender Scripting で「スクリプト実行」。再実行安全(自コレクションのみ再生成+3cのpool帯を撤去)。

根拠:
- 空撮写真(ユーザー提供2026-09-28): 屋内プール棟の屋根=**大きな青みの透光/ガラス屋根**(水面+レーン線が透視)、
  西側に灰色の付帯帯。周囲に白いデッキ/フェンス 【写真推定】
- 0011(配置図): 北西角の建物内に25m級プール(複数レーン)描画
- mass: bldg_pool x[-80.3,-13.9] y[97.5,137.3] h=8.0 (変更せず上に乗せる=合意されたmasses不変方針)
- このPDF(27901siryou)にプール詳細図は無い → 分割位置/パネルピッチ/開口は【空撮+常識推定 ±0.5m】
"""
import math

BB = (-80.3, -13.9, 97.5, 137.3)   # x0,x1,y0,y1 (mass bldg_pool)
WALL_H  = 8.0
PARA    = 0.6                       # パラペット
OPQ_X1  = -62.0                     # これより西=不透明(付帯)帯 【空撮推定】
PANEL   = 3.3                       # 透光パネルグリッドピッチ 【推定】
COL_NAME = "70_Pool"

def _box(v, f, x0, y0, z0, x1, y1, z1):
    b = len(v)
    v += [(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),
          (x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)]
    f += [(b+0,b+1,b+2,b+3),(b+7,b+6,b+5,b+4),(b+0,b+4,b+5,b+1),
          (b+1,b+5,b+6,b+2),(b+2,b+6,b+7,b+3),(b+3,b+7,b+4,b+0)]

def specs_all():
    x0, x1, y0, y1 = BB
    wall, wf, tr, tf, seam, sf, gl, gf, water, waf, opq, of = [], [], [], [], [], [], [], [], [], [], [], []
    # 周壁(軽量壁)
    for (a0,b0,a1,b1) in [(x0,y0,x1,y0+0.25),(x0,y1-0.25,x1,y1),
                          (x0,y0+0.25,x0+0.25,y1-0.25),(x1-0.25,y0+0.25,x1,y1-0.25)]:
        _box(wall, wf, a0, b0, 0.0, a1, b1, WALL_H)
    # パラペット四周 t0.2 h0.6
    for (a0,b0,a1,b1) in [(x0,y0,x1,y0+0.2),(x0,y1-0.2,x1,y1),
                          (x0,y0+0.2,x0+0.2,y1-0.2),(x1-0.2,y0+0.2,x1,y1-0.2)]:
        _box(wall, wf, a0, b0, WALL_H, a1, b1, WALL_H + PARA)
    # 不透明帯屋根(西)
    _box(opq, of, x0, y0, WALL_H, OPQ_X1, y1, WALL_H + 0.05)
    # 透光屋根(東ゾーン): 単一板+縦横シーム
    _box(tr, tf, OPQ_X1, y0 + 0.1, WALL_H + 0.02, x1 - 0.1, y1 - 0.1, WALL_H + 0.07)
    nx = int((x1 - 0.1 - OPQ_X1) / PANEL)
    ny = int((y1 - 0.2) / PANEL)
    for i in range(nx + 1):
        x = OPQ_X1 + i * PANEL
        _box(seam, sf, x - 0.04, y0 + 0.1, WALL_H + 0.05, x + 0.04, y1 - 0.1, WALL_H + 0.12)
    for j in range(ny + 1):
        y = y0 + 0.1 + j * PANEL
        _box(seam, sf, OPQ_X1, y - 0.04, WALL_H + 0.05, x1 - 0.1, y + 0.04, WALL_H + 0.12)
    # 南面(キャンパス側)エントランスガラス帯(中央寄り東)【推定】
    glw0, glw1 = -40.0, -20.0
    _box(gl, gf, glw0, y0 - 0.06, 0.4, glw1, y0 + 0.08, 5.4)
    _box(wall, wf, glw0 - 0.3, y0 - 0.75, 3.2, glw1 + 0.3, y0 + 0.9, 3.45)   # エントランスキャノピー
    # 内部プール水盤(空撮の見え再現用の簡易内部: 25m×6レーン=約25x10.5m + デッキ)【推定】
    _box(water, waf, -56.0, 108.0, 1.0, -31.0, 118.5, 1.05)
    _box(wall, wf, -58.5, 105.5, 0.95, -28.5, 121.0, 1.0)  # デッキ(水盤の周辺,上位に見えないよう下げる)
    return {"wall": (wall, wf), "trans": (tr, tf), "seam": (seam, sf),
            "glass": (gl, gf), "water": (water, waf), "opq": (opq, of)}

def _mesh(name, data, mat, col):
    import bpy
    v, f = data
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.update()
    ob = bpy.data.objects.new(name, me); col.objects.link(ob)
    if mat: ob.data.materials.append(mat)
    return ob

def main():
    import bpy
    # 3cのpool関連オブジェクト(暫定クレアストリ帯)を50_Facade_Arenaから撤去
    c50 = bpy.data.collections.get("50_Facade_Arena")
    if c50:
        for o in list(c50.objects):
            if "pool" in o.name.lower():
                bpy.data.objects.remove(o, do_unlink=True)
    old = bpy.data.collections.get(COL_NAME)
    if old:
        for o in list(old.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(old)
    col = bpy.data.collections.new(COL_NAME)
    bpy.context.scene.collection.children.link(col)

    def mat(name, rgb, rough=0.6, metal=0.0, alpha=1.0, emis=None):
        m = bpy.data.materials.new(name); m.use_nodes = True
        bs = m.node_tree.nodes.get("Principled BSDF")
        bs.inputs["Base Color"].default_value = (*rgb, 1.0)
        bs.inputs["Roughness"].default_value = rough
        bs.inputs["Metallic"].default_value = metal
        if alpha < 1.0:
            bs.inputs["Alpha"].default_value = alpha
            try: m.surface_render_method = 'DITHERED'
            except AttributeError:
                try: m.blend_method = 'BLEND'
                except Exception: pass
        if emis:
            try: bs.inputs["Emission Color"].default_value = (*emis, 1.0); bs.inputs["Emission Strength"].default_value = 0.6
            except Exception: pass
        return m

    m_wall = mat("P3f_Wall", (0.87, 0.87, 0.85))
    m_tr   = mat("P3f_TranslucentRoof", (0.38, 0.58, 0.78), rough=0.15, metal=0.2, alpha=0.5)
    m_seam = mat("P3f_Seam", (0.70, 0.72, 0.74), metal=0.5)
    m_gl   = mat("P3f_Glass", (0.32, 0.48, 0.60), rough=0.2, metal=0.4)
    m_wa   = mat("P3f_Water", (0.05, 0.45, 0.75), rough=0.1, emis=(0.05, 0.35, 0.6))
    m_opq  = mat("P3f_OpaqueRoof", (0.68, 0.69, 0.70))

    sp = specs_all()
    _mesh("pool_wall",  sp["wall"],  m_wall, col)
    _mesh("pool_roof_translucent", sp["trans"], m_tr, col)
    _mesh("pool_roof_seams", sp["seam"], m_seam, col)
    _mesh("pool_roof_opaque", sp["opq"], m_opq, col)
    _mesh("pool_glass_s", sp["glass"], m_gl, col)
    _mesh("pool_water", sp["water"], m_wa, col)
    x0, x1, y0, y1 = BB
    print("--- Phase 3f プール棟 本格外装 v1.0 ---")
    print(f"規模 {x1-x0:.1f}x{y1-y0:.1f}m h={WALL_H} 透光屋根: 西x<{OPQ_X1}以外")
    print(f"シーム {len(sp['seam'][1])} パネルピッチ{PANEL}m【推定】")
    print("完了")

if __name__ == "__main__":
    try:
        import bpy  # noqa
        main()
    except ImportError:
        pass
