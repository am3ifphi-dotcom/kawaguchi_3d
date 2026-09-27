# -*- coding: utf-8 -*-
"""
phase2_blockout.py
川口市立高等学校 3Dプロジェクト — Phase 2 校舎ブロックアウト（第1校地）
=====================================================================
何が起きるか（1行）:
    配置図校正＋平面/断面図確定寸法で確立した主要棟の「実寸質量」を
    コレクション 10_Volumes_Site1 に配置する（確度別の色分け・既存物は削除しない）。
    さらに data 内に PLATEAU 抽出JSON があれば LOD1 外形を参照用ワイヤーで重ねる。

前提: phase0/phase1 実行後の kawaguchi_3d.blend（原点・ポリゴン登録済）。

確度タグ:
    確定系(平面/断面図直読) … 灰色
    画像校正±5m(手動測定)  … 淡青
    仮置き/推定           … 黄色（半透明）
"""
import os, json, bpy
from mathutils import Vector

# ---- .blend 自動保存 ---------------------------------------------------------
SAVE_AS_BLEND = True
SAVE_PATH = os.path.join(os.path.expanduser("~"), "kawaguchi_3d.blend")

# ---- PLATEAU 参照JSON（あれば重ねる。無くても動く）-------------------------
# ユーザー環境に合わせて書き換え可（data/plateau/plateau_extract.json を想定）
PLATEAU_JSON_CANDIDATES = [
    os.path.join(os.path.expanduser("~"), "kawaguchi_3d", "data", "plateau", "plateau_extract.json"),
    os.path.join(os.path.expanduser("~"), "Downloads", "plateau_extract.json"),
]

# ---- Phase 2 質量データ（配置図校正+図面確定寸法。2026-09-27確立分）-----------
MASSES = {
 "version": "2026-09-27",
 "basis": "配置図(p3)×OSM校正 k=4.1562px/m, ang=-1.375deg, 残差1.24m + 平面図確定寸法 + 断面図確定高さ",
 "accuracy_default": "【推定：画像校正±5m、PLATEAU LOD1到着で置換】",
 "heights_locked": {
  "school_wing": {"slab_軒": 18.486, "top_高": 21.886, "floors": [0.0, 4.0, 7.6, 11.2, 14.8], "basis": "BLD-010/011 テキスト層確定"},
  "arena_N": {"高": 12.754, "軒": 11.438, "floors": [0.0, 4.55], "basis": "BLD-012 断面3x直読確定"},
  "arena_S": {"高": 19.871, "軒": 18.836, "floors": [0.0, 4.55, 8.45, 12.35], "basis": "BLD-013 断面3x直読確定"}
 },
 "volumes": [
  {"name": "bldg_schoolS_east", "label": "校舎S翼-東半", "E0": 55.8, "E1": 110.4, "N0": 11.3, "N1": 21.5, "z0": 0, "h": 18.486,
   "accuracy": "検出筏中心(83.1,16.4)+確定寸法", "src": "siteplan検出+平面図7800x7"},
  {"name": "bldg_schoolS_west", "label": "校舎S翼-西半", "E0": -3.4, "E1": 51.2, "N0": 10.3, "N1": 20.5, "z0": 0, "h": 18.486,
   "accuracy": "検出筏中心(23.9,15.4)+確定寸法", "src": "siteplan検出+平面図7800x7"},
  {"name": "bldg_schoolN_east", "label": "校舎N翼-東半", "E0": 55.8, "E1": 110.4, "N0": 35.4, "N1": 45.6, "z0": 0, "h": 18.486,
   "accuracy": "画像校正±5m（平面図柱距確定）", "src": "手動測定+平面図109.2構成"},
  {"name": "bldg_schoolN_west", "label": "校舎N翼-西半", "E0": -3.4, "E1": 51.2, "N0": 35.4, "N1": 45.6, "z0": 0, "h": 18.486,
   "accuracy": "画像校正±5m（平面図柱距確定）", "src": "手動測定+平面図109.2構成"},
  {"name": "bldg_admin_band", "label": "校舎北帯(管理/特別)", "E0": 0.0, "E1": 90.0, "N0": 47.0, "N1": 56.0, "z0": 0, "h": 12.75,
   "accuracy": "画像校正±5m・高さ仮置き【推定12.75系】", "src": "3F平面(職員/家庭科帯)仮置き"},
  {"name": "bldg_arenaN", "label": "アリーナN棟(中/小アリーナ+武道場+宿泊帯)", "E0": -94.0, "E1": -9.0, "N0": 63.0, "N1": 77.0, "z0": 0, "h": 12.754,
   "accuracy": "帯検出±3m（88m系グリッド整合）", "src": "bands検出+BLD-015"},
  {"name": "bldg_arenaN2", "label": "アリーナN棟-北帯(小アリーナ上部・ガラス屋根)", "E0": -94.0, "E1": -9.0, "N0": 80.0, "N1": 94.0, "z0": 0, "h": 12.754,
   "accuracy": "画像校正±5m", "src": "3F平面(中/小アリーナ上部表記)"},
  {"name": "bldg_arenaS", "label": "大アリーナ棟", "E0": -113.0, "E1": -72.0, "N0": -8.0, "N1": 45.6, "z0": 0, "h": 19.871,
   "accuracy": "画像校正±5m", "src": "arena_main窓測定(41x53.6相当)"},
  {"name": "bldg_pool", "label": "屋内プール棟", "E0": -80.0, "E1": -19.0, "N0": 100.0, "N1": 130.0, "z0": 0, "h": 8.0,
   "accuracy": "画像校正±5m・高さ仮置き【推定8m。断面未到着】", "src": "pool窓測定(25mプール+デッキ想定)"},
  {"name": "bldg_arena_annex", "label": "アリーナ付属帯(宿泊研修/廊下)", "E0": -72.0, "E1": -49.0, "N0": 0.0, "N1": 60.0, "z0": 0, "h": 13.0,
   "accuracy": "画像校正±5m【仮置き】", "src": "3F平面の西帯(宿泊研修/浴室)仮置き"}
 ]
}


COL_MAIN = "10_Volumes_Site1"
COL_REF = "10_Volumes_PLATEAU_ref"

def ensure_collection(name):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return col

def make_mat(name, color, alpha=1.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*color[:3], alpha)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color[:3], 1.0)
        bsdf.inputs["Roughness"].default_value = 0.85
        if alpha < 1.0:
            bsdf.inputs["Alpha"].default_value = alpha
            m.blend_method = 'BLEND'
    return m

def add_box(name, e0, e1, n0, n1, z0, h, mat, col, props):
    """実寸ボリュームを1つ生成（cx,cy中心で立方体作成→scale、既存同名は流用して上書き）"""
    cx, cy = (e0 + e1) / 2.0, (n0 + n1) / 2.0
    sx, sy, sz = abs(e1 - e0), abs(n1 - n0), h
    obj = bpy.data.objects.get(name)
    if obj is None:
        mesh = bpy.data.meshes.new(name + "_M")
        v = [(-0.5,-0.5,0),(0.5,-0.5,0),(0.5,0.5,0),(-0.5,0.5,0),
             (-0.5,-0.5,1),(0.5,-0.5,1),(0.5,0.5,1),(-0.5,0.5,1)]
        f = [(0,1,2,3),(4,7,6,5),(0,1,5,4),(2,3,7,6),(1,2,6,5),(4,3,0,7)]
        mesh.from_pydata(v, [], f); mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        col.objects.link(obj)
    obj.location = (cx, cy, z0)
    obj.scale = (sx, sy, sz)
    obj.data.materials.clear(); obj.data.materials.append(mat)
    for k, v in props.items():
        obj[k] = str(v)
    return obj

def add_plateau_mesh(feat, col, mat):
    """PLATEAU LOD1の1棟を'最下リング押出し'メッシュで配置（参照用・半透明）"""
    ring = feat["ring"]; h = feat.get("h", 10.0)
    n = len(ring)
    verts = [(x, y, 0.0) for (x, y) in ring] + [(x, y, h) for (x, y) in ring]
    faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    nm = "plt_" + (feat.get("id") or "bldg")[:48]
    mesh = bpy.data.meshes.get(nm) or bpy.data.meshes.new(nm + "_M")
    if mesh.name in bpy.data.objects:
        return
    mesh.from_pydata(verts, [], faces); mesh.update()
    obj = bpy.data.objects.new(nm, mesh)
    col.objects.link(obj)
    obj.data.materials.append(mat)
    obj["src"] = "PLATEAU LOD1"; obj["h"] = h
    obj.display_type = 'WIRE'

def main():
    col = ensure_collection(COL_MAIN)
    mat_exact = make_mat("M_vol_確定", (0.62, 0.63, 0.65))
    mat_img = make_mat("M_vol_画像校正±5m", (0.55, 0.72, 0.92))
    mat_tent = make_mat("M_vol_仮置き", (0.95, 0.8, 0.25), alpha=0.55)

    print("\n===== phase2_blockout 開始 =====")
    n = 0
    for v in MASSES["volumes"]:
        acc = v.get("accuracy", "")
        mat = mat_exact if "確定" in acc or "検出" in acc else (mat_tent if "仮置き" in acc or "推定" in acc else mat_img)
        props = {"src": v.get("src", ""), "accuracy": acc, "label": v.get("label", v["name"]), "確度分類": "圏論運用"}
        add_box(v["name"], v["E0"], v["E1"], v["N0"], v["N1"], v.get("z0", 0.0), v["h"], mat, col, props)
        n += 1
        print(f"  [配置] {v['name']:22s} {v.get('label','')}  w={abs(v['E1']-v['E0']):.1f} d={abs(v['N1']-v['N0']):.1f} h={v['h']:.3f} [{acc}]")
    print(f"  主要棟 {n} 棟 完了（色: 灰=確定 / 淡青=画像校正±5m / 黄半透明=仮置き）")

    # PLATEAU JSON 参照重ね（存在すれば）
    col_p = ensure_collection(COL_REF)
    loaded = None
    for path in PLATEAU_JSON_CANDIDATES:
        if os.path.exists(path):
            loaded = path; break
    if loaded:
        mat_p = make_mat("M_plateau_ref", (0.2, 0.85, 0.45), alpha=0.35)
        data = json.load(open(loaded, encoding="utf-8"))
        cb = 0
        for f in data.get("features", []):
            if f.get("kind") == "bldg":
                add_plateau_mesh(f, col_p, mat_p); cb += 1
        print(f"  [PLATEAU] {loaded} からLOD1建物 {cb} 棟を緑ワイヤーで参照表示")
        print("  → 手動測定ボックスとのズレが5m以内なら相互整合OK。大きければ画像校正の優先再計算")
    else:
        print("  [PLATEAU] 参照JSON 未配置 → 到着後にこのスクリプトを再実行で重ね表示")

    if SAVE_AS_BLEND:
        try:
            bpy.ops.wm.save_as_mainfile(filepath=SAVE_PATH)
            print("  保存しました: " + SAVE_PATH)
        except Exception as exc:
            print("  [警告] 自動保存に失敗: {}".format(exc))
    print("\n見方のヒント:")
    print("  Numpad 7 で上面（北が上）。校舎2翼(灰)=平面/断面図確定寸法系。")
    print("  淡青の箱は配置図からの手動測定(±5m)、黄半透明は仮置き — PLATEAU到着で置き換えます。")
    print("===== phase2_blockout 完了 =====\n")

if __name__ == "__main__":
    main()
