# 03_site_terrain.py — Phase 1: 敷地・道路・竪川を実寸で配置（配置図p03トレース）
# 実行前: 何が起きるか → 600m四方の地面、敷地境界カーブ、竪川カーブ、周辺道路カーブを 10_Site_Terrain に生成する
# 前提: 00_setup_collections.py 実行済み。原点は plateau origin (校舎LS中央 35.82613,139.71913)。Z=0がGL。
# 寸法は27901p03配置図をトレースした【推定】値（印刷図のため±1m）。Phase2でGSI建物外周線と照合して微調整可能。
# 既存の同名オブジェクトがあれば削除して再生成する。
import bpy, math

def get_col(name):
    return bpy.data.collections.get(name)

col_site = get_col("10_Site_Terrain")
if not col_site:
    print("ERROR: 00_setup_collections.py を先に実行してください")
    raise SystemExit

# --- 0. 既存のSiteオブジェクトをクリア（同名のみ） ---
for obj in list(col_site.objects):
    if obj.name.startswith("SITE_") or obj.name.startswith("TERRAIN_"):
        bpy.data.objects.remove(obj, do_unlink=True)

# --- 1. 地形（仮置き: フラット） ---
# DEM5mはBlenderGISで後から置換。ここでは -0.1m に600×600mの平面を置く。
# 600mは半径300m要件を満たす。
import bmesh
mesh = bpy.data.meshes.new("TERRAIN_Flat")
obj = bpy.data.objects.new("TERRAIN_Flat_600m", mesh)
col_site.objects.link(obj)
# 頂点は原点中心
verts = [(-300,-300,-0.1),(300,-300,-0.1),(300,300,-0.1),(-300,300,-0.1)]
faces = [(0,1,2,3)]
mesh.from_pydata(verts, [], faces)
mesh.update()
mat_ground = bpy.data.materials.get("MAT_Terrain")
if not mat_ground:
    mat_ground = bpy.data.materials.new("MAT_Terrain")
    mat_ground.use_nodes = True
    bsdf = mat_ground.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs[0].default_value = (0.72, 0.68, 0.60, 1)  # 土色
        bsdf.inputs[7].default_value = 1.0
obj.data.materials.append(mat_ground)
obj["certainty"] = "仮置き：DEM5mで後置換"
print("[03] TERRAIN_Flat_600m created")

# --- 2. 敷地境界（第1校地）---
# 27901p03配置図をBlenderの上から見たTop Viewでトレースした座標（m）。X=東, Y=北。
# 基準: 原点(0,0)を校舎ラーニングストリート中央とする。校舎はp03で敷地の中央北寄り。
# 座標は配置図の印刷寸法を定規で比測定し、109.2mの校舎を物差しに換算した【推定】。
# 誤差 ±1-2m。GSIとの照合で後補正可能とするため、カーブのまま残す。
site_ring = [
    # 北東角（都市の門付近）から時計回り
    (  98.0,  88.5),  # 都市の門 東端
    ( 105.0,  85.0),  # 東道路に沿って南下
    ( 112.0,  20.0),
    ( 110.5, -45.0),  # テニスコート南東角
    (  88.0, -82.0),  # 南端（竪川側）尖端
    (  42.0, -68.0),  # 竪川に沿って西へ
    ( -28.0, -58.0),  # 車両出入口付近で北へ屈曲
    ( -38.0, -42.0),
    ( -95.0, -38.0),  # アリーナS西側
    (-118.0, -18.0),  # 西端（伝統の門入口）
    (-122.0,  18.0),  # 西道路沿い北上
    (-115.0,  52.0),  # 弓道場西
    ( -88.0,  78.0),  # プール北西角
    ( -38.0,  92.0),  # 北側中央（来客出入口付近で東へ）
    (  22.0,  98.0),  # 北道路沿い
    (  68.0,  92.5),  # 北東道路カーブ
    (  98.0,  88.5),  # 閉じる
]

def create_curve(name, coords, closed=True, bevel_depth=0.0):
    curve_data = bpy.data.curves.new(name+"_Curve", type='CURVE')
    curve_data.dimensions = '3D'
    curve_data.resolution_u = 12
    spline = curve_data.splines.new('POLY')
    spline.points.add(len(coords)-1)
    for i, (x,y) in enumerate(coords):
        spline.points[i].co = (x, y, 0, 1)
    spline.use_cyclic_u = closed
    # ベベルは道路表現で使う場合のみ
    if bevel_depth > 0:
        curve_data.bevel_depth = bevel_depth
        curve_data.bevel_resolution = 2
    obj = bpy.data.objects.new(name, curve_data)
    col_site.objects.link(obj)
    return obj

site_obj = create_curve("SITE_Boundary_第1校地", site_ring, closed=True)
site_obj.data.bevel_depth = 0  # 線のみ
site_obj["certainty"] = "推定：p03配置図トレース ±1.5m"
site_obj["source"] = "27901p03 配置図 校舎109.2mを物差しに換算"
# 表示: ワイヤ＋フリースタイル的に見やすく
site_obj.color = (1, 0.3, 0.2, 1)
print(f"[03] SITE_Boundary created {len(site_ring)} pts")

# --- 3. 竪川（敷地南側の水路） ---
# p03で緑の南側、p02俯瞰で南縁を流れる。幅約6-8m、敷地境界の南に接する。
river_ring = [
    (-130.0, -42.0),
    (-80.0, -48.0),
    (-20.0, -60.0),
    (  40.0, -72.0),
    (  95.0, -85.0),
    ( 115.0, -82.0),
    (  45.0, -66.0),
    ( -15.0, -54.0),
    (-90.0, -38.0),
    (-130.0, -42.0),
]
river_obj = create_curve("SITE_River_竪川", river_ring, closed=True)
# マテリアル（水色）
mat_river = bpy.data.materials.get("MAT_River")
if not mat_river:
    mat_river = bpy.data.materials.new("MAT_River")
    mat_river.use_nodes = True
    bsdf = mat_river.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs[0].default_value = (0.35, 0.55, 0.75, 1)
        bsdf.inputs[14].default_value = 0.2  # IOR
        bsdf.inputs[7].default_value = 0.1
# カーブをメッシュ化して面にする簡易：Curveを2D Fillにする
river_obj.data.dimensions = '2D'
river_obj.data.fill_mode = 'BOTH'
# 少し沈める
river_obj.location.z = -0.05
# マテリアル割当（カーブの場合はObject Colorに依存するため、メッシュ化は任意）
# ここではCurveのまま色で表現。レンダ時はメッシュ化推奨。
river_obj.color = (0.35, 0.55, 0.75, 1)
river_obj["certainty"] = "推定：p03/p02の水路幅6m想定"
print("[03] SITE_River created")

# --- 4. 周辺道路（敷地を囲む3本） ---
# 東側道路（都市の門に面する）— 幅約12m（2車線+歩道）
east_road = [
    ( 102.0, 110.0),
    ( 108.0,  90.0),
    ( 116.0,  30.0),
    ( 114.0, -50.0),
    ( 100.0,-100.0),
]
east_obj = create_curve("SITE_Road_東", east_road, closed=False, bevel_depth=6.0)
east_obj.location.z = -0.02
east_obj["note"] = "東道路 都市の門に面する"

# 西側道路（伝統の門）— 幅約8m
west_road = [
    (-128.0,  80.0),
    (-130.0,  20.0),
    (-125.0, -30.0),
    (-120.0, -80.0),
]
west_obj = create_curve("SITE_Road_西", west_road, closed=False, bevel_depth=4.0)
west_obj.location.z = -0.02

# 北側道路（来客出入口）— 幅約10m
north_road = [
    (-90.0,  96.0),
    (  20.0, 104.0),
    (  80.0,  96.0),
    ( 110.0,  80.0),
]
north_obj = create_curve("SITE_Road_北", north_road, closed=False, bevel_depth=5.0)
north_obj.location.z = -0.02

# 共通道路マテリアル
mat_road = bpy.data.materials.get("MAT_Road")
if not mat_road:
    mat_road = bpy.data.materials.new("MAT_Road")
    mat_road.use_nodes = True
    bsdf = mat_road.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs[0].default_value = (0.18, 0.18, 0.18, 1)
        bsdf.inputs[7].default_value = 0.9
for o in [east_obj, west_obj, north_obj]:
    if len(o.data.materials)==0:
        o.data.materials.append(mat_road)

print("[03] Roads created (East/West/North)")

# --- 5. 校舎ブロックの正位置補正（必要なら） ---
# 02で作った校舎が原点中心だが、p03では校舎は敷地の北寄り（Y+10〜+15m）。
# ここで +Yにオフセットを掛ける。既存ブロックがあれば移動。
offset_y = 12.0  # 校舎を北へ12m移動して敷地中央に寄せる（推定）
# 調整量はp03の校舎北端が北道路から約30m離れていることを基準に算出
try:
    for obj in bpy.data.objects:
        if obj.name.startswith("BLOCK_Kosha") or obj.name.startswith("BLOCK_LearningStreet") or obj.name.startswith("BLOCK_Bridge"):
            obj.location.y += offset_y
    print(f"[03] Moved Kosha blocks Y+{offset_y}m to fit site")
except Exception as e:
    print(f"[03] move skipped {e}")

# --- 6. 注記オブジェクト ---
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0,0,0))
ax = bpy.context.active_object
ax.name = "SITE_Origin_校舎LS中央"
for c in ax.users_collection:
    if c != col_site:
        c.objects.unlink(ax)
col_site.objects.link(ax)
ax.empty_display_size = 5
ax["note"] = "plateau origin = 校舎LS中央（仮置き）→ Phase1トレースで補正済み Y+12m"

print("[03] Done. SITE created. 次は 04でアリーナの正位置を微調整し、BlenderGISでDEM置換。")
print("【推定】敷地境界は印刷図トレースのため ±1.5m。GSI基盤地図の敷地ポリゴン取得後に上書きしてください。")
