# 02_blockout_kosha_from_drawing.py — Phase 2: 27901実施設計の通り芯から校舎・アリーナをブロックアウト
# 実行前: 何が起きるか → 109.2m×2棟の直方体を1F床4000/2-5F3600で積み、ラーニングストリートを空ける。寸法は27901p04/p09確定値。
# 前提: 00_setup_collections.py 実行済み。原点はplateau origin。
# 校舎位置: 図面p03配置図の校舎は原点からやや南東。ここでは原点を校舎中心に合わせる【仮置き】で作成し、Phase1の敷地トレース後に移動可能。
import bpy, math

# --- ユーティリティ ---
def get_col(name):
    return bpy.data.collections.get(name)

def create_box(name, col, size_xyz, loc, mat=None):
    # size_xyz=(sx,sy,sz), locは中心
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = size_xyz
    # Apply scale via dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    # コレクション移動
    for c in obj.users_collection:
        c.objects.unlink(obj)
    col.objects.link(obj)
    if mat and len(obj.data.materials)==0:
        obj.data.materials.append(mat)
    return obj

# マテリアル
def get_mat(name, color):
    m = bpy.data.materials.get(name)
    if not m:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        bsdf = m.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs[0].default_value = (*color, 1)
            bsdf.inputs[7].default_value = 0.8
    return m

mat_south = get_mat("MAT_Kosha_South", (0.88, 0.86, 0.78))
mat_north = get_mat("MAT_Kosha_North", (0.82, 0.84, 0.88))
mat_ls = get_mat("MAT_LearningStreet", (0.5, 0.5, 0.55))
mat_arena_s = get_mat("MAT_ArenaS", (0.7, 0.7, 0.72))
mat_arena_n = get_mat("MAT_ArenaN", (0.68, 0.71, 0.68))

# --- 寸法（27901確定） ---
L = 109.2  # 全長 X方向
W_south = 15.0  # 南棟奥行 Y方向（推定 9425を丸め、吹抜との兼ね合いで15m）
W_north = 15.5  # 北棟奥行
W_ls = 6.5      # ラーニングストリート幅（推定 6200-6800）
# 配置: 南棟中心Y = - (W_south/2 + W_ls/2) / 北棟中心Y = + (W_north/2 + W_ls/2) として原点がLS中央
W_total = W_south + W_ls + W_north
print(f"W_total {W_total} south {W_south} ls {W_ls} north {W_north}")

# 階高
h1 = 4.0
h2 = 3.6
h3 = 3.6
h4 = 3.6
h5 = 3.6
rf = 3.4
# Z位置（GL=0、1F床+0.1m? ここではGLを1F床面とする）
z1 = h1/2
z2 = h1 + h2/2
z3 = h1 + h2 + h3/2
z4 = h1 + h2 + h3 + h4/2
z5 = h1 + h2 + h3 + h4 + h5/2
z_rf = h1+h2+h3+h4+h5 + rf/2

col_kosha = get_col("20_Ext_校舎")
col_arena_s = get_col("21_Ext_アリーナS")
col_arena_n = get_col("22_Ext_アリーナN")

# 既存のブロックアウトをクリア（同名があれば削除）
for col in [col_kosha, col_arena_s, col_arena_n]:
    if not col: continue
    for obj in list(col.objects):
        if obj.name.startswith("BLOCK_"):
            bpy.data.objects.remove(obj, do_unlink=True)

# --- 校舎 南棟（普通教室側） ---
# 南棟は1-5Fまでフル
for i, (z, h, mat) in enumerate([(z1,h1,mat_south),(z2,h2,mat_south),(z3,h3,mat_south),(z4,h4,mat_south),(z5,h5,mat_south)], start=1):
    # 南棟Y = - (W_ls/2 + W_south/2)
    y = -(W_ls/2 + W_south/2)
    # 寸法は全長Lで、欠き込みは無し（LOD1ブロックアウト）
    obj = create_box(f"BLOCK_Kosha_South_F{i}", col_kosha, (L, W_south, h), (0, y, z), mat)
    obj["phase"]="Phase2 blockout"
    obj["certainty"]="確定(高さ) / 推定(奥行)"
    # 1Fは大ホール部分で南東側を欠くが、ブロックアウトでは簡略化

# --- 校舎 北棟（特別教室側） ---
for i, (z, h) in enumerate([(z1,h1),(z2,h2),(z3,h3),(z4,h4),(z5,h5)], start=1):
    y = (W_ls/2 + W_north/2)
    obj = create_box(f"BLOCK_Kosha_North_F{i}", col_kosha, (L, W_north, h), (0, y, z), mat_north)
    obj["certainty"]="確定(高さ)"

# --- ラーニングストリート 屋根（膜） ---
# 中央の吹抜上部、2F床からRFまで吹抜。屋根はアーチ。
# 簡易: RF高さに薄いボックス+アーチモディファイアはPhase3で。ここではワイヤ表示の膜ボックス。
ls_mat = get_mat("MAT_Membrane", (0.92, 0.93, 0.95))
# 膜は校舎全長に掛かるが、端部は少し短い（p07 R階で膜が中央寄り）
L_mem = 88.0
ls_obj = create_box("BLOCK_LearningStreet_Membrane", col_kosha, (L_mem, W_ls, 0.3), (0, 0, z_rf+1.0), ls_mat)
ls_obj.display_type = 'WIRE'
ls_obj["note"]="膜屋根 S造アーチ 風が抜ける半屋外 2-5F吹抜"

# --- 渡り廊下 4F（2箇所） ---
for x in [-28, 28]:
    w = create_box(f"BLOCK_Bridge_4F_{x}", col_kosha, (4, W_ls, 0.4), (x, 0, z4), get_mat("MAT_Bridge", (0.6,0.6,0.6)))
    w["note"]="4F渡り廊下 ラーニングストリートを跨ぐ"

# --- アリーナS棟（大アリーナ） ---
# 27901p04: アリーナS 88m×約40m（5000グリッド×17+7000×2）
# 高さ: 1F 4500? 2F? 断面p09で大アリーナ高さ約13m。ここでは PHF 12.754としてブロック化
col = col_arena_s
# 位置: 校舎から西へ約 -90m、西門側。正確な配置はp03配置図トレース後に補正する仮置き。
arena_s_x = -92.0  # 校舎西端から約40m離し
arena_s_y = -2.0   # 中央広場を挟む
arena_s_w = 88.0
arena_s_d = 42.0
arena_s_h = 16.5  # 下部倉庫+大アリーナ
a_s = create_box("BLOCK_ArenaS_Main", col, (arena_s_w, arena_s_d, arena_s_h), (arena_s_x, arena_s_y, arena_s_h/2), mat_arena_s)
a_s["note"]="大アリーナ バスケ3面 観客480+240"

# --- アリーナN棟（中・小・柔剣道） ---
# 27901p04: 左上 36m×? 14.7m付近
arena_n_x = -72.0
arena_n_y = 42.0
arena_n_w = 36.0
arena_n_d = 26.0
# 高さ: 1F 5050 + 2F 4750 + RBL 3700 → 計12.7m（p09左断面）
arena_n_h = 10.5
a_n1 = create_box("BLOCK_ArenaN_Main", col_arena_n, (arena_n_w, arena_n_d, arena_n_h), (arena_n_x, arena_n_y, arena_n_h/2), mat_arena_n)
# 剣道場側の小棟
a_n2 = create_box("BLOCK_ArenaN_Kendo", col_arena_n, (22, 18, arena_n_h), (arena_n_x+28, arena_n_y, arena_n_h/2), mat_arena_n)

# --- プール（既存） ---
col_pool = get_col("23_Ext_プール弓道")
pool = create_box("BLOCK_Pool_Existing", col_pool, (32, 22, 2.5), (-68, 78, 1.25), get_mat("MAT_Pool", (0.6,0.75,0.85)))
pool["note"]="既存プール 存置 p03北端"

# --- グラウンド外形（ランドスケープ） ---
col_land = get_col("40_Landscape")
# 27901p03: 校舎南側に楕円トラック。長径約120m。
ground = create_box("BLOCK_Ground_Outline", col_land, (110, 68, 0.2), (4, -52, 0.1), get_mat("MAT_Ground", (0.65,0.78,0.55)))
ground.display_type = 'WIRE'
ground["note"]="グラウンド人工芝 トラックはPhase3でカーブ化"

print("[02] Blockout done. L=109.2m H=4.0+3.6*4+3.4=21.8m (GL基準)")
print("位置は原点を校舎LS中央とする仮置き。Phase1で敷地トレース後、正確な配置（北東/南西）に移動してください。")
print("南立面は p08参照: バルコニー手摺、膜屋根アーチ。次はPhase3で窓割りへ。")
