# -*- coding: utf-8 -*-
"""
phase2_blockout.py (v3)
川口市立高等学校 3Dプロジェクト — Phase 2 校舎ブロックアウト（第1校地・PLATEAU外形版）
=====================================================================
何が起きるか（1行）:
    PLATEAU LOD1の実測外形（リング）×実施設計図の確定高さで主要棟を
    「10_Volumes_Site1」に押し出し配置する。旧来の手動±5mは解消。
    data/plateau/plateau_53395597.json 等があれば全LOD1建物を緑ワイヤーで参照重ね表示。

前提: phase0/phase1 後の kawaguchi_3d.blend。
確度色分け: 灰=外形+高さの片方以上が確定系 / 淡青=PLATEAU高さ使用 / 黄半透明=仮置き(プール等LOD1不在)
"""
import os, json, bpy

SAVE_AS_BLEND = True
SAVE_PATH = os.path.join(os.path.expanduser("~"), "kawaguchi_3d.blend")
PLATEAU_JSON_CANDIDATES = [
    os.path.join(os.path.expanduser("~"), "plateau_53395597.json"),
    os.path.join(os.path.expanduser("~"), "kawaguchi_3d", "data", "plateau", "plateau_53395597.json"),
    os.path.join(os.path.expanduser("~"), "Downloads", "plateau_53395597.json"),
]
MASSES = {
 "version": "2026-09-28 v3 (プール棟=写真実測リング置換・屋外プール新規。主要外形が全て実測ベース)",
 "basis": "外形=PLATEAU 11203 LOD1 bldg(53395597)+配置図。高さ=実施設計断面/平面図優先・無ければPLATEAU h",
 "heights_locked": {
  "school軒18.486/高21.886": "BLD-011",
  "arenaN軒11.438/高12.754": "BLD-012",
  "arenaS軒18.836/高19.871": "BLD-013"
 },
 "volumes": [
  {
   "name": "bldg_schoolS",
   "label": "校舎S翼(普通教室+LC)",
   "type": "ring",
   "ring": [
    [
     107.65,
     18.74
    ],
    [
     106.73,
     38.41
    ],
    [
     99.7,
     38.07
    ],
    [
     6.25,
     33.56
    ],
    [
     -2.85,
     33.12
    ],
    [
     -2.6,
     27.78
    ],
    [
     -2.0,
     27.81
    ],
    [
     -1.86,
     25.1
    ],
    [
     -2.79,
     25.06
    ],
    [
     -2.25,
     13.57
    ],
    [
     49.39,
     16.0
    ],
    [
     49.11,
     22.06
    ],
    [
     55.98,
     22.39
    ],
    [
     56.26,
     16.34
    ],
    [
     107.65,
     18.74
    ]
   ],
   "h": 18.486,
   "plt_id": "bldg_4cf7907f-f7c3-4341-9b50-2d6a013032ba",
   "plt_h": 21.3,
   "h_src": "図面確定(校舎系列 軒18,486/高21,886)",
   "accuracy": "PLATEAU外形(5m級)+図面高さ"
  },
  {
   "name": "bldg_schoolN",
   "label": "校舎N翼(特別教室)",
   "type": "ring",
   "ring": [
    [
     99.7,
     38.07
    ],
    [
     98.19,
     57.91
    ],
    [
     5.09,
     50.49
    ],
    [
     6.25,
     33.56
    ],
    [
     99.7,
     38.07
    ]
   ],
   "h": 18.486,
   "plt_id": "bldg_44f5071e-59b1-41af-840e-03d9cd2bb6a9",
   "plt_h": 22.1,
   "h_src": "図面確定(校舎系列)",
   "accuracy": "PLATEAU外形+図面高さ。94.6mは平面式の截期(7800系12スパン+Δ)と照合予定"
  },
  {
   "name": "bldg_admin",
   "label": "校舎北帯(管理/職員)",
   "type": "ring",
   "ring": [
    [
     70.37,
     66.69
    ],
    [
     70.04,
     73.63
    ],
    [
     -4.98,
     70.1
    ],
    [
     -4.18,
     53.17
    ],
    [
     -2.99,
     53.23
    ],
    [
     -2.72,
     49.87
    ],
    [
     5.09,
     50.49
    ],
    [
     98.19,
     57.91
    ],
    [
     97.38,
     67.96
    ],
    [
     70.37,
     66.69
    ]
   ],
   "h": 20.6,
   "plt_id": "bldg_2d60618f-f5c7-4f74-958b-e4b49cd172e3",
   "plt_h": 20.6,
   "h_src": "PLATEAU h優先（仮置き12.75は誤り確定・5層級）",
   "accuracy": "PLATEAU外形+PLATEAU高さ(±数％)"
  },
  {
   "name": "bldg_arenaS",
   "label": "アリーナS複合(大アリーナ+器具庫+宿泊)",
   "type": "ring",
   "ring": [
    [
     -32.35,
     37.38
    ],
    [
     -32.78,
     44.96
    ],
    [
     -33.85,
     44.9
    ],
    [
     -34.56,
     44.86
    ],
    [
     -53.0,
     43.87
    ],
    [
     -114.11,
     40.56
    ],
    [
     -114.0,
     38.53
    ],
    [
     -122.78,
     38.04
    ],
    [
     -120.47,
     -2.46
    ],
    [
     -114.14,
     -2.1
    ],
    [
     -113.68,
     -10.03
    ],
    [
     -48.76,
     -6.31
    ],
    [
     -49.04,
     -1.44
    ],
    [
     -30.18,
     -0.36
    ],
    [
     -32.35,
     37.38
    ]
   ],
   "h": 19.871,
   "plt_id": "bldg_201a8894-473d-4e6a-9182-de27ee40ccf3",
   "plt_h": 20.2,
   "h_src": "図面確定(BLD-013)",
   "accuracy": "PLATEAU外形(複合一体)+図面高さ"
  },
  {
   "name": "bldg_arenaM",
   "label": "中アリーナ棟(武道場1F)",
   "type": "ring",
   "ring": [
    [
     -12.44,
     66.62
    ],
    [
     -13.22,
     84.87
    ],
    [
     -49.95,
     83.28
    ],
    [
     -49.92,
     82.52
    ],
    [
     -49.17,
     65.36
    ],
    [
     -49.16,
     65.03
    ],
    [
     -35.51,
     65.62
    ],
    [
     -34.75,
     65.65
    ],
    [
     -32.06,
     65.77
    ],
    [
     -12.44,
     66.62
    ]
   ],
   "h": 12.754,
   "plt_id": "bldg_b01d7688-a716-41e7-9147-91bbf9c042c7",
   "plt_h": 12.9,
   "h_src": "図面確定(BLD-012・中アリーナ棟)",
   "accuracy": "PLATEAU外形。両棟構成が確定"
  },
  {
   "name": "bldg_arenaS2",
   "label": "小アリーナ棟",
   "type": "ring",
   "ring": [
    [
     -55.49,
     65.08
    ],
    [
     -56.23,
     82.28
    ],
    [
     -93.11,
     80.69
    ],
    [
     -92.34,
     63.07
    ],
    [
     -55.47,
     64.67
    ],
    [
     -55.49,
     65.08
    ]
   ],
   "h": 12.754,
   "plt_id": "bldg_0c732e20-c8b1-494c-b725-ad31674dfc8a",
   "plt_h": 13.0,
   "h_src": "図面確定(BLD-012系列・3x読取13.0も観測)",
   "accuracy": "PLATEAU外形"
  },
  {
   "name": "bldg_arenaJoint",
   "label": "中/小アリーナ連結部(ガラス屋根?)",
   "type": "ring",
   "ring": [
    [
     -49.17,
     65.36
    ],
    [
     -49.92,
     82.52
    ],
    [
     -56.23,
     82.28
    ],
    [
     -55.49,
     65.08
    ],
    [
     -49.17,
     65.36
    ]
   ],
   "h": 12.5,
   "plt_id": "bldg_6097e0c4-0985-46ec-babb-9fa093475c07",
   "plt_h": 12.5,
   "h_src": "PLATEAU h",
   "accuracy": "PLATEAU外形(7.1x17.4 の細帯)"
  },
  {
   "name": "bldg_gymsub",
   "label": "体育付属棟(弓道場候補)",
   "type": "ring",
   "ring": [
    [
     -30.67,
     40.19
    ],
    [
     -32.06,
     65.77
    ],
    [
     -34.75,
     65.65
    ],
    [
     -33.85,
     44.9
    ],
    [
     -32.78,
     44.96
    ],
    [
     -32.35,
     37.38
    ],
    [
     5.64,
     39.02
    ],
    [
     5.44,
     41.67
    ],
    [
     -30.67,
     40.19
    ]
   ],
   "h": 8.0,
   "plt_id": "bldg_677aa8fc-8951-4a20-a5a1-cc72ffa13409",
   "plt_h": 8.0,
   "h_src": "PLATEAU h【仮置き同定】",
   "accuracy": "PLATEAU外形40.4x28.4・図面未突合"
  },
  {
   "name": "bldg_arenaN_low",
   "label": "アリーナ帯北側低層(ロッカー/付属)",
   "type": "ring",
   "ring": [
    [
     -40.74,
     90.08
    ],
    [
     -41.05,
     96.59
    ],
    [
     -64.06,
     95.57
    ],
    [
     -63.8,
     88.86
    ],
    [
     -57.3,
     89.11
    ],
    [
     -57.27,
     88.17
    ],
    [
     -52.29,
     88.37
    ],
    [
     -52.34,
     89.63
    ],
    [
     -40.74,
     90.08
    ]
   ],
   "h": 4.4,
   "plt_id": "bldg_20a71a89-c5c9-42ef-9cda-baf9b0f4f05d",
   "plt_h": 4.4,
   "h_src": "PLATEAU h",
   "accuracy": "PLATEAU外形"
  },
  {
   "name": "bldg_pool",
   "label": "屋内プール棟(65.9x39.8m 写真実測)",
   "type": "ring",
   "ring": [
    [
     -80.3,
     97.5
    ],
    [
     -13.9,
     97.5
    ],
    [
     -13.9,
     137.3
    ],
    [
     -80.3,
     137.3
    ]
   ],
   "h": 8.0,
   "h_src": "【推定8.0m】断面/立面未到着(一階大空間+機械帯)。写真の影・規模と整合",
   "accuracy": "外形=地理院seamlessphoto z18実測±1m(PLATEAU非収録を代替)・高さは【推定】",
   "plt_ref": "z18 232811,232812/103095 (jpg)→圃変換済"
  },
  {
   "name": "bldg_pool_out",
   "label": "屋外25mプール(水盤)",
   "type": "water",
   "ring": [
    [
     -18.3,
     94.3
    ],
    [
     6.3,
     94.3
    ],
    [
     6.3,
     111.8
    ],
    [
     -18.3,
     111.8
    ]
   ],
   "h": 0.3,
   "h_src": "地上面の水盤(水面+0.3)",
   "accuracy": "写真実測±1m【新規】PLATEAU非収録",
   "note": "デッキ/取水設備は Phase 3 で要現況照合"
  }
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

def make_mat(name, rgb, alpha=1.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, alpha)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.85
        if alpha < 1.0:
            bsdf.inputs["Alpha"].default_value = alpha
            m.blend_method = 'BLEND'
    return m

def extruded_mesh(name, ring, h):
    n = len(ring)
    verts = [(x, y, 0.0) for (x, y) in ring] + [(x, y, h) for (x, y) in ring]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    mesh = bpy.data.meshes.new(name + "_M")
    mesh.from_pydata(verts, [], faces); mesh.update()
    return mesh

def place_ring(name, ring, h, mat, col, props):
    obj = bpy.data.objects.get(name)
    mesh = extruded_mesh(name, ring, h)
    if obj is None:
        obj = bpy.data.objects.new(name, mesh)
        col.objects.link(obj)
    else:
        obj.data = mesh
    obj.data.materials.clear(); obj.data.materials.append(mat)
    for k, p in props.items(): obj[k] = str(p)
    return obj

def place_box(name, e0, e1, n0, n1, h, mat, col, props):
    cx, cy = (e0 + e1) / 2, (n0 + n1) / 2
    sx, sy = abs(e1 - e0), abs(n1 - n0)
    obj = bpy.data.objects.get(name)
    if obj is None:
        mesh = extruded_mesh(name, [(-.5,-.5),(.5,-.5),(.5,.5),(-.5,.5)], 1.0)
        obj = bpy.data.objects.new(name, mesh)
        col.objects.link(obj)
    obj.location = (cx, cy, 0); obj.scale = (sx, sy, h)
    obj.data.materials.clear(); obj.data.materials.append(mat)
    for k, p in props.items(): obj[k] = str(p)
    return obj

def main():
    col = ensure_collection(COL_MAIN)
    m_exact = make_mat("M_vol_確定", (0.62, 0.63, 0.65))
    m_pltH  = make_mat("M_vol_PLATEAU高", (0.55, 0.72, 0.92))
    m_tent  = make_mat("M_vol_仮置き", (0.95, 0.8, 0.25), alpha=0.55)
    m_water = make_mat("M_vol_水盤", (0.2, 0.5, 0.9), alpha=0.6)
    print("\n===== phase2_blockout v2 開始 =====")
    nn = 0
    for v in MASSES["volumes"]:
        hs = v.get("h_src", ""); acc = v.get("accuracy", "")
        mat = m_water if v.get("type")=="water" else (m_exact if "図面確定" in hs else (m_tent if "仮置き" in acc else m_pltH))
        props = {"label": v.get("label", v["name"]), "h_src": hs, "accuracy": acc,
                 "plt_id": v.get("plt_id", "-")}
        if v.get("type") == "ring":
            place_ring(v["name"], v["ring"], v["h"], mat, col, props)
        else:
            place_box(v["name"], v["E0"], v["E1"], v["N0"], v["N1"], v["h"], mat, col, props)
        nn += 1
        if v.get("type") == "ring":
            xs = [p[0] for p in v["ring"]]; ys = [p[1] for p in v["ring"]]
            w, dd = max(xs) - min(xs), max(ys) - min(ys)
        else:
            w, dd = abs(v["E1"] - v["E0"]), abs(v["N1"] - v["N0"])
        print(f"  [配置] {v['name']:16s} {v.get('label','')[:28]:28s} {w:5.1f}x{dd:5.1f}m h={v['h']:6.3f}  {hs[:22]}")
    print(f"  主要棟 {nn} 件（外形=PLATEAU実測+航空写真z18。プール棟=写真66.4x39.8置換）")

    col_p = ensure_collection(COL_REF)
    loaded = next((p for p in PLATEAU_JSON_CANDIDATES if os.path.exists(p)), None)
    if loaded:
        m_p = make_mat("M_plateau_ref", (0.2, 0.85, 0.45), alpha=0.35)
        data = json.load(open(loaded, encoding="utf-8"))
        made = set()
        for f in data.get("features", []):
            if f.get("kind") != "bldg": continue
            idkey = f.get("id", "")
            if any(v.get("plt_id") == idkey for v in MASSES["volumes"]): continue
            nm = "plt_" + idkey[:40]
            if nm in bpy.data.objects: continue
            mesh = extruded_mesh(nm, f["ring"], max(f.get("h", 10.0), 0.1))
            obj = bpy.data.objects.new(nm, mesh)
            col_p.objects.link(obj)
            obj.data.materials.append(m_p); obj.display_type = 'WIRE'
            made.add(idkey)
        print(f"  [PLATEAU] 同定済以外のLOD1建物 {len(made)} 棟を緑ワイヤー表示（周辺300mの建物群）")
    else:
        print("  [PLATEAU] plateau_53395597.json が見つからない → ユーザーホーム直下等に置いて再実行")
    if SAVE_AS_BLEND:
        try:
            bpy.ops.wm.save_as_mainfile(filepath=SAVE_PATH)
            print("  保存しました: " + SAVE_PATH)
        except Exception as exc:
            print("  [警告] 保存失敗: {}".format(exc))
    print("\n見方: Numpad 7 で上面。灰=図面確定高さ、淡青=PLATEAU/写真実測外形(高さPLATEAU/推定)、青透明=屋外プール水盤。緑ワイヤー=周辺建物。黄半透明は今回無し。")
    print("===== v3 完了 =====\n")

if __name__ == "__main__":
    main()
