# -*- coding: utf-8 -*-
"""
phase3g_rooftop.py v1.0 — 校舎両翼 屋上室外機群
実行: Blender Scripting で「スクリプト実行」。再実行安全(自コレクションのみ再生成)。

根拠:
- 空撮写真(ユーザー提供): 両翼屋上の**外側帯**に空調室外機が列状に多数搭載
- 0030(平面): 屋根に「屋外機置場」表記あり → 室外機ゾーンの存在は公式図でも確定
- 台数/厳密位置は【空撮写真推定】: LOD3近似として列配置
- 高さ: 屋根面 z=18.486(確定)に載置、機器高1.0m/台1.2×0.5【推定】、別寸AHU混在
"""
import math

# schoolS ring(南翼) / schoolN ring(北翼) [phase2_masses と同一]
S_RING = [(107.65,18.74),(106.73,38.41),(99.7,38.07),(6.25,33.56),(-2.85,33.12),
          (-2.6,27.78),(-2.0,27.81),(-1.86,25.1),(-2.79,25.06),(-2.25,13.57),
          (49.39,16.0),(49.11,22.06),(55.98,22.39),(56.26,16.34),(107.65,18.74)]
N_RING = [(99.7,38.07),(98.19,57.91),(5.09,50.49),(6.25,33.56),(99.7,38.07)]
AX_A = (6.25, 33.56); AX_B = (99.7, 38.07)
ROOF_Z = 18.486
UNIT_PITCH = 2.6          # 台ピッチ 【推定】
AHU_EVERY  = 7            # 7台ごとにAHU(大)
COL_NAME   = "35_RooftopUnits"

def _axis():
    ax, ay = AX_A; bx, by = AX_B
    dx, dy = bx - ax, by - ay
    L = math.hypot(dx, dy)
    return (dx/L, dy/L), (-dy/L, dx/L), L

def _pt(s, off, d, n):
    return (AX_A[0] + d[0]*s + n[0]*off, AX_A[1] + d[1]*s + n[1]*off)

def _poly_contains(x, y, ring):
    ins = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]; xj, yj = ring[j]
        if ((yi > y) != (yj > y)) and (x < (xj-xi)*(y-yi)/(yj-yi)+xi):
            ins = not ins
        j = i
    return ins

def build_wing_units(ring, side, rows, margin):
    """one mesh for a wing: rows=N-Sオフセット列(ストリート側を避け外側帯)"""
    d, n, L = _axis()
    v, f = [], []
    nunit = 0
    for row, off in enumerate(rows):
        s = margin
        k = 0
        while s < L - margin:
            x, y = _pt(s, side * off, d, n)
            if _poly_contains(x, y, ring):
                if k % AHU_EVERY == AHU_EVERY - 1:
                    w, dp, h = 2.2, 1.2, 1.6     # AHU大型 【推定】
                else:
                    w, dp, h = 1.2, 0.5, 1.0     # 室外機標準 【推定】
                hw, hd = w/2.0, dp/2.0
                b = len(v)
                cs, sn = d[0], d[1]
                # 軸に揃えた矩形(回転箱の8頂点)
                base = [( x - cs*hw + sn*hd, y - sn*hw - cs*hd),
                        ( x + cs*hw + sn*hd, y + sn*hw - cs*hd),
                        ( x + cs*hw - sn*hd, y + sn*hw + cs*hd),
                        ( x - cs*hw - sn*hd, y - sn*hw + cs*hd)]
                for px, py in base: v.append((px, py, ROOF_Z))
                for px, py in base: v.append((px, py, ROOF_Z + h))
                f += [(b+0,b+1,b+2,b+3),(b+7,b+6,b+5,b+4),(b+0,b+4,b+5,b+1),
                      (b+1,b+5,b+6,b+2),(b+2,b+6,b+7,b+3),(b+3,b+7,b+4,b+0)]
                nunit += 1
            s += UNIT_PITCH; k += 1
    return (v, f), nunit

def specs_all():
    # S翼: 南側帯。トラス帯(中心-9.75±0.6)との干渉を避け -15.5以深に列配置
    (sv, sf), ns = build_wing_units(S_RING, -1, rows=[15.5, 18.5, 21.5], margin=6.0)
    # N翼: 北側帯。トラス帯(中心+9.75±0.6)より外側 +16以深に列配置
    (nv, nf), nn = build_wing_units(N_RING, +1, rows=[16.0, 19.0, 22.0], margin=6.0)
    return {"units_S": ((sv, sf), ns), "units_N": ((nv, nf), nn)}

def _mesh(name, data, mat, col):
    import bpy
    (v, f) = data
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.update()
    ob = bpy.data.objects.new(name, me); col.objects.link(ob)
    if mat: ob.data.materials.append(mat)
    return ob

def main():
    import bpy
    old = bpy.data.collections.get(COL_NAME)
    if old:
        for o in list(old.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(old)
    col = bpy.data.collections.new(COL_NAME)
    bpy.context.scene.collection.children.link(col)
    m = bpy.data.materials.new("P3g_Unit"); m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (0.60, 0.61, 0.63, 1.0)
    bs.inputs["Roughness"].default_value = 0.55; bs.inputs["Metallic"].default_value = 0.3
    sp = specs_all()
    (dS, ns), (dN, nn) = sp["units_S"], sp["units_N"]
    _mesh("units_S", dS, m, col); _mesh("units_N", dN, m, col)
    print("--- Phase 3g 校舎屋上室外機群 v1.0 ---")
    print(f"室外機系ボックス合計(近似): S翼={ns} + N翼={nn} = {ns+nn}台【空撮推定配置】")
    print("完了")

if __name__ == "__main__":
    try:
        import bpy  # noqa
        main()
    except ImportError:
        pass
