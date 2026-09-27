# 01_import_plateau_and_tiles.py — Phase 1: PLATEAU LOD1とGSIタイルを実座標で配置
# 実行前: 何が起きるか → plateau_53395597.json を読み込み、半径300mでクリップしLOD1ボリュームを生成。z18タイル2枚を平面に貼る。
# 前提: 00_setup_collections.py を実行済み、.blendファイルを // （kawaguchi_3d直下）に保存済みと仮定
# 配置: bx+ X=東, by+ Y=北 をそのままBlender X,Yに。Z=0がGL。
import bpy, json, os, math
from pathlib import Path
import mathutils

blend_dir = Path(bpy.data.filepath).parent if bpy.data.filepath else Path(os.getcwd())
# リポジトリルートを推定（plateauファイルがある場所）
candidates = [blend_dir, blend_dir.parent, Path("/home/user/kawaguchi_3d")]
plateau_path = None
for c in candidates:
    p = c / "plateau_53395597.json"
    if p.exists():
        plateau_path = p
        repo_root = c
        break
if plateau_path is None:
    # フォールバック: 絶対パス
    plateau_path = Path("/home/user/kawaguchi_3d/plateau_53395597.json")
    repo_root = Path("/home/user/kawaguchi_3d")

print(f"[01] plateau: {plateau_path}")
with open(plateau_path, "r", encoding="utf-8") as f:
    data = json.load(f)

origin = data.get("origin", {"lat":35.8261337, "lon":139.7191328})
print(f"origin lat {origin['lat']} lon {origin['lon']} note={data.get('note','')}")

# コレクション取得
col_ref = bpy.data.collections.get("00_Ref")
col_site = bpy.data.collections.get("10_Site_Terrain")
if not col_ref: col_ref = bpy.data.collections.new("00_Ref")
if not col_site: col_site = bpy.data.collections.new("10_Site_Terrain")

# --- 1. PLATEAU LOD1をメッシュ化 ---
# 半径300mでクリップ（中心はorigin）。h=-9999は除外（欠測）。
import bmesh

def poly_area(ring):
    s=0
    for i in range(len(ring)-1):
        x1,y1=ring[i]; x2,y2=ring[i+1]
        s+=x1*y2-x2*y1
    return abs(s)/2

# 新規オブジェクト用メッシュ
mesh = bpy.data.meshes.new("PLATEAU_300m")
obj = bpy.data.objects.new("PLATEAU_300m_LOD1", mesh)
col_ref.objects.link(obj)

verts = []
faces = []
# 壁と屋根を簡易押出で作成。リングが (x,y) ローカルメートル。
# X=東, Y=北 なのでそのまま X,Y に。

# 半径300mフィルタ
R = 300.0
count_in = 0
count_skip_h = 0
for feat in data["features"]:
    h = feat.get("h", 0)
    if h == -9999 or h <= 0:
        count_skip_h += 1
        continue
    ring = feat["ring"]
    # 中心を計算して半径判定（重心が300m以内）
    cx = sum(p[0] for p in ring)/len(ring)
    cy = sum(p[1] for p in ring)/len(ring)
    if math.hypot(cx, cy) > R+50:  # 50mマージンで建物が跨ぐ場合も拾う
        continue
    # 面積が極小（<4m2）はノイズとして除外
    if poly_area(ring) < 4:
        continue
    count_in += 1
    # 頂点追加
    base_idx = len(verts)
    # ringは閉じている（最後が最初と同じ）ので最後を除く
    ring_closed = ring[:-1] if ring[0]==ring[-1] else ring
    n = len(ring_closed)
    # 下側リング
    for x,y in ring_closed:
        verts.append((x, y, 0))
    # 上側リング
    for x,y in ring_closed:
        verts.append((x, y, h))
    # 側面: 四角ポリゴン (i -> i+1 -> i+1+n -> i+n)
    for i in range(n):
        j = (i+1)%n
        a = base_idx + i
        b = base_idx + j
        c = base_idx + j + n
        d = base_idx + i + n
        faces.append((a,b,c,d))
    # 屋根: 上面ポリゴン（三角化せずn角形）— 法線が上向きになるよう逆順に注意
    # Blenderは多角形をサポートするが、凹多角形は崩れることがある。簡易的に扇状に分割。
    top_start = base_idx + n
    for i in range(1, n-1):
        faces.append((top_start, top_start+i, top_start+i+1))
    # 底面は不要（地面と重なるため）

mesh.from_pydata(verts, [], faces)
mesh.update()
# スムーズ解除・フラット
for poly in mesh.polygons:
    poly.use_smooth = False
mesh.update()

# マテリアル（半透明グレー、LOD1遠景用）
mat = bpy.data.materials.get("MAT_PLATEAU_LOD1")
if not mat:
    mat = bpy.data.materials.new("MAT_PLATEAU_LOD1")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs[0].default_value = (0.75, 0.75, 0.75, 1)
        bsdf.inputs[7].default_value = 0.9  # Roughness
mat.blend_method = 'BLEND'
# 透過を少し
if mat.node_tree:
    # Alphaを0.6に
    try:
        bsdf.inputs[21].default_value = 0.6
    except: pass
if len(obj.data.materials)==0:
    obj.data.materials.append(mat)

# 原点を0,0,0に（既にローカル座標がorigin基準なので移動不要）
obj.location = (0,0,0)

print(f"[01] PLATEAU: {count_in}棟を半径{R}mで生成, h欠測スキップ{count_skip_h}")

# --- 2. GSIタイルを平面に貼る（簡易） ---
# 手持ち2枚を 00_Ref にイメージプレーンとして配置。z18の1ピクセル≒0.6m。
# タイルの地理座標→ローカルメートルへの変換は簡易式（平面直角IXの厳密変換ではなく、0.6m/pxの近似で配置）。
# 正確な位置合わせはBlenderGISで上書きされる前提の「仮置き」。

def tile_xy_to_lonlat(x,y,z):
    lon = x / (2**z)*360 -180
    n = math.pi - 2*math.pi*y/(2**z)
    lat = math.degrees(math.atan(math.sinh(n)))
    return lon, lat

# originのタイル
z=18
lon0, lat0 = origin["lon"], origin["lat"]
# 緯度35.826度での1度あたりメートル: lat 111km, lon 91km*cos
m_per_deg_lat = 111000
m_per_deg_lon = 111000*math.cos(math.radians(lat0))
print(f"m/deg lat {m_per_deg_lat:.0f} lon {m_per_deg_lon:.0f}")

# タイル1枚のメートルサイズ（赤道で約 40075000/262144 ≒152.9m、緯度35度ではlon方向がcos倍で縮むがタイルは正方形なのでlat方向が基準）
# 簡易: タイル幅 = 360/262144 * m_per_deg_lon ≈ 85m? 実際はWebメルカトルで歪む。ここでは 152m を基準に近似。
tile_m = 40075016.686 / (2**z)  # 約152.87m at equator, メルカトルではそのまま
# 緯度35度では見かけ上同じピクセル数なので、ローカル座標への変換は「タイルの中心をlon/lat差からメートル換算」で行う。

for fname in ["z18_232811_103095.png", "z18_232812_103095.png"]:
    img_path = repo_root / fname
    if not img_path.exists():
        print(f"[01] tile not found {img_path}")
        continue
    # タイルのx,y
    parts = fname.replace(".png","").split("_")
    tx, ty = int(parts[1]), int(parts[2])
    # タイル左上lon/lat
    lon_left, lat_top = tile_xy_to_lonlat(tx, ty, z)
    lon_right, lat_bottom = tile_xy_to_lonlat(tx+1, ty+1, z)
    # 中心
    lon_c = (lon_left+lon_right)/2
    lat_c = (lat_top+lat_bottom)/2
    # originからのメートルオフセット
    dx = (lon_c - lon0) * m_per_deg_lon
    dy = (lat_c - lat0) * m_per_deg_lat
    # メルカトル補正: WebメルカトルのYは緯度で非線形。簡易補正として dy *= 1.2程度?
    # ここでは簡易のまま近似し、【推定】として扱う。
    print(f"[01] tile {fname} tile({tx},{ty}) lon {lon_c:.6f} lat {lat_c:.6f} -> dx {dx:.1f} dy {dy:.1f}")

    # 画像をロード
    img = bpy.data.images.get(fname)
    if not img:
        img = bpy.data.images.load(str(img_path))

    # 平面メッシュ作成
    # タイル1枚は 256px = 約 152m相当（赤道）。緯度35度でも同ピクセルだが地上ではやや小さく見える。ここでは 150m 四方として作成。
    size = 152.7  # 仮置き
    mesh_t = bpy.data.meshes.new(f"MESH_{fname}")
    obj_t = bpy.data.objects.new(f"TILE_{fname}", mesh_t)
    col_ref.objects.link(obj_t)
    # 頂点: 中心dx,dyを基準に四隅
    h = size/2
    verts_t = [(dx-h, dy+h, -0.05), (dx+h, dy+h, -0.05), (dx+h, dy-h, -0.05), (dx-h, dy-h, -0.05)]
    faces_t = [(0,1,2,3)]
    mesh_t.from_pydata(verts_t, [], faces_t)
    mesh_t.update()
    # UV
    # UVは自動で0-1に割り当て
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(mesh_t)
    uv_layer = bm.loops.layers.uv.new()
    # 頂点順にUV割り当て
    for face in bm.faces:
        for i, loop in enumerate(face.loops):
            if i==0: loop[uv_layer].uv = (0,1)
            elif i==1: loop[uv_layer].uv = (1,1)
            elif i==2: loop[uv_layer].uv = (1,0)
            elif i==3: loop[uv_layer].uv = (0,0)
    bm.to_mesh(mesh_t)
    bm.free()
    # マテリアル
    mat_t = bpy.data.materials.get(f"MAT_{fname}")
    if not mat_t:
        mat_t = bpy.data.materials.new(f"MAT_{fname}")
        mat_t.use_nodes = True
        nodes = mat_t.node_tree.nodes
        links = mat_t.node_tree.links
        nodes.clear()
        out = nodes.new("ShaderNodeOutputMaterial")
        bsdf = nodes.new("ShaderNodeBsdfPrincipled")
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = img
        # Non-ColorではなくsRGBのまま
        links.new(tex.outputs[0], bsdf.inputs[0])
        links.new(bsdf.outputs[0], out.inputs[0])
        bsdf.inputs[7].default_value = 1.0
    if len(obj_t.data.materials)==0:
        obj_t.data.materials.append(mat_t)

# --- 3. 原点マーカー ---
if "Origin_Marker" not in bpy.data.objects:
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0,0,1))
    m = bpy.context.active_object
    m.name = "Origin_Marker"
    m.display_type = 'WIRE'
    # ワイヤーフレームで原点可視化
    col_ref.objects.link(m)
    # 元のコレクションから外す場合
    for c in m.users_collection:
        if c != col_ref:
            c.objects.unlink(m)

print("[01] Done. PLATEAUとタイルを00_Refに配置。Phase2で校舎は27901通り芯を優先してモデリングしてください。")
print("【推定】タイル位置は簡易換算のためPhase1でBlenderGISにより上書き要。")
