# -*- coding: utf-8 -*-
"""
phase3e_annex.py v1.0 — 部室棟(1F駐輪場388台+2F部室14室) + 大アリーナ太陽光パネル
実行: Blender Scripting で「スクリプト実行」。再実行安全(自コレクションのみ再生成)。

根拠(実施設計 27901siryou.pdf, 抽出=/home/user/pdf_imgs, 結論は docs/phase3 に固着):
- 0022(2F平面): 部室×14室 連続、軸スパン 5000×14 + 4000 + 7000×2 = 88,000mm (確定)
- 0026(上層平面): 88m帯は大アリーナ平面の真南に描画 (確定)
- 0019(1F平面): 同帯1Fは「駐輪場(388台)」表記、大アリーナ1F=コート3面/器具庫/倉庫/体育教員室帯 (確定)
- 0037(体育棟横断面): 右側に附属2層帯(下層オープン+上層) → 1Fオープン駐輪場+2F部室 と整合
- 0026: 大アリーナ南縁の屋根上に「太陽光パネル」列 (確定)
- 0036(体育横断立面): 上部クレアストリ+中程ルーバー帯+縦目地+1Fピロティ = 3c実装と整合(追認)
- 配置(depth7.0m/arena南壁からの隙間2.0m)と 高さ(1F天3.9/2F天7.6/パラペット8.4)は
  【0011配置図・0037断面比読み推定 ±0.5m】(寸法注記が帯画像の解像度限界外のため)
"""
import math

# ---------- 定数 ----------
BS_X0, BS_X1 = -119.8, -31.8       # 部室棟 東西 (88.0m)
BS_Y0, BS_Y1 = -19.0, -12.0        # 部室棟 南北 (7.0m) 【配置図読取推定】
Z_2F   = 3.9                        # 2F床(=1F天井) 【断面推定】
Z_2FT  = 7.6                        # 2F天井 【断面推定】
Z_PARA = 8.4                        # パラペット天 【断面推定】
BAY    = 5.0                        # 駐輪場柱ピッチ=室モジュール(5000)
COL_T  = 0.35                       # 柱角 推定
# 太陽光パネル(大アリーナ南縁の南傾斜面イメージ)【パネル諸元は推定】
PV_X0, PV_X1 = -115.0, -40.0
PV_Y0, PV_Y1 = -9.5, -3.0
PV_Z        = 19.10                 # アリーナ軒18.836+縁高(弧で~19.3)の保守値
PV_TILT_DEG = 10.0
PV_PITCH_Y  = 2.2                   # 行ピッチ
PV_ROW      = 4                     # 行数=(PV_Y1-PV_Y0+)/PITCH
PV_CELL     = (1.6, 1.0)            # パネル寸法
COL_NAME = "60_Annex_Bushitsu_PV"

def _box(verts, faces, x0, y0, z0, x1, y1, z1):
    b = len(verts)
    verts += [(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),
              (x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)]
    faces += [(b+0,b+1,b+2,b+3),(b+7,b+6,b+5,b+4),(b+0,b+4,b+5,b+1),
              (b+1,b+5,b+6,b+2),(b+2,b+6,b+7,b+3),(b+3,b+7,b+4,b+0)]

# _box は faces 配列を引数に取るが上で個別リストへ面を積むため補助
def _rebuild():
    """build_* を面も正しく返す版に作り替える"""
    def make():
        conc, conc_f = [], []
        glass, glass_f = [], []
        cols, cols_f = [], []
        rack, rack_f = [], []
        n = int(round((BS_X1 - BS_X0) / BAY))
        step = (BS_X1 - BS_X0) / n
        for i in range(n + 1):
            x = BS_X0 + i * step
            for y in (BS_Y0 + 0.2, BS_Y1 - 0.2):
                _box(cols, cols_f, x - COL_T/2, y - COL_T/2, 0.0, x + COL_T/2, y + COL_T/2, Z_2F)
        _box(conc, conc_f, BS_X0, BS_Y0 - 0.0, Z_2F - 0.25, BS_X1, BS_Y1, Z_2F)
        _box(conc, conc_f, BS_X0, BS_Y0, Z_2F, BS_X1, BS_Y1, Z_2FT)
        _box(conc, conc_f, BS_X0, BS_Y0, Z_2FT, BS_X1, BS_Y1, Z_PARA)
        for (x0,y0,x1,y1) in [
            (BS_X0, BS_Y0, BS_X1, BS_Y0+0.15), (BS_X0, BS_Y1-0.15, BS_X1, BS_Y1),
            (BS_X0, BS_Y0+0.15, BS_X0+0.15, BS_Y1-0.15), (BS_X1-0.15, BS_Y0+0.15, BS_X1, BS_Y1-0.15)]:
            _box(conc, conc_f, x0, y0, Z_2FT, x1, y1, Z_PARA)
        for i in range(n):
            x = BS_X0 + i * step
            _box(glass, glass_f, x + 0.8, BS_Y1 - 0.06, Z_2F + 1.0, x + step - 0.8, BS_Y1 + 0.02, Z_2F + 2.6)
        _box(glass, glass_f, BS_X0 - 0.02, BS_Y0 + 1.2, Z_2F + 0.9, BS_X0 + 0.06, BS_Y1 - 1.2, Z_2F + 2.3)
        _box(glass, glass_f, BS_X1 - 0.06, BS_Y0 + 1.2, Z_2F + 0.9, BS_X1 + 0.02, BS_Y1 - 1.2, Z_2F + 2.3)
        for k in range(10):
            x = BS_X0 + 2.0 + k * 8.4
            _box(rack, rack_f, x, BS_Y0 + 1.0, 0.0, x + 0.06, BS_Y0 + 2.6, 0.5)
            _box(rack, rack_f, x, BS_Y0 + 3.4, 0.0, x + 0.06, BS_Y0 + 5.0, 0.5)
        return {"conc": (conc, conc_f), "win": (glass, glass_f),
                "cols": (cols, cols_f), "rack": (rack, rack_f)}
    return make()

def build_pv_spec():
    """大アリーナ南縁のPV(傾斜パネル行+ラック脚)。戻り値 dict"""
    pv, pv_f, rk, rk_f = [], [], [], []
    tilt = math.radians(PV_TILT_DEG)
    nx = int((PV_X1 - PV_X0) / PV_CELL[0])
    for r in range(PV_ROW):
        y = PV_Y0 + 0.4 + r * PV_PITCH_Y
        if y > PV_Y1: break
        z0 = PV_Z; z1 = PV_Z + PV_CELL[1] * math.sin(tilt)
        for i in range(nx):
            x = PV_X0 + i * PV_CELL[0]
            # 傾斜板(南高)
            b = len(pv)
            pv += [(x, y, z0), (x + PV_CELL[0] - 0.05, y, z0),
                   (x + PV_CELL[0] - 0.05, y + PV_CELL[1] * math.cos(tilt), z1),
                   (x, y + PV_CELL[1] * math.cos(tilt), z1)]
            pv_f.append((b, b+1, b+2, b+3))
            if i % 4 == 0:  # ラック脚(簡易)
                _box(rk, rk_f, x + 0.3, y + 0.2, PV_Z - 0.5, x + 0.36, y + 0.26, PV_Z + 0.15)
    return {"panel": (pv, pv_f), "rack": (rk, rk_f)}

def specs_all():
    b = _rebuild()
    out = {f"bushitsu_{k}": v for k, v in b.items()}
    for k, v in build_pv_spec().items():
        out[f"pv_{k}"] = v
    return out

def _mesh_obj(name, data, mat, col):
    import bpy
    verts, faces = data
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
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

    def mat(name, rgb, rough=0.6, metal=0.0):
        m = bpy.data.materials.new(name); m.use_nodes = True
        bsdf = m.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Roughness"].default_value = rough
        bsdf.inputs["Metallic"].default_value = metal
        return m

    m_conc = mat("P3e_Conc", (0.85, 0.84, 0.80))
    m_glass = mat("P3e_Glass", (0.35, 0.5, 0.62), rough=0.25, metal=0.4)
    m_steel = mat("P3e_Steel", (0.75, 0.76, 0.77), metal=0.6)
    m_pv = mat("P3e_PV", (0.05, 0.09, 0.18), rough=0.25, metal=0.7)

    sp = specs_all()
    _mesh_obj("bushitsu_body",  sp["bushitsu_conc"], m_conc,  col)
    _mesh_obj("bushitsu_glass", sp["bushitsu_win"],  m_glass, col)
    _mesh_obj("bushitsu_cols",  sp["bushitsu_cols"], m_steel, col)
    _mesh_obj("bushitsu_rack",  sp["bushitsu_rack"], m_steel, col)
    _mesh_obj("pv_panels",      sp["pv_panel"],      m_pv,    col)
    _mesh_obj("pv_racks",       sp["pv_rack"],       m_steel, col)
    print("--- Phase 3e 部室棟+PV v1.0 ---")
    print(f"部室棟 {BS_X1-BS_X0:.1f}m x {BS_Y1-BS_Y0:.1f}m z0-{Z_PARA}m (1F駐輪場OPEN/2F部室14室)")
    print(f"PVパネル: {len(sp['pv_panel'][1])}枚 @ 大アリーナ南縁 z={PV_Z}")
    print("完了")

if __name__ == "__main__":
    try:
        import bpy  # noqa
        main()
    except ImportError:
        pass
