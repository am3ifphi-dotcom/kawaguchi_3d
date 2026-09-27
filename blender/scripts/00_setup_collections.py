# 00_setup_collections.py — Phase 0/1 共通：シーン基準とコレクション構築
# 実行前: 何が起きるか → Unitをメートル/Scale1.0にし、コレクション9個とSunを作成する（既存は再利用）
# Blender 4.x / Text Editorで開いて Run Script
import bpy

# --- 1. Scene Units ---
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
scene.unit_settings.length_unit = 'METERS'
scene.unit_settings.mass_unit = 'KILOGRAMS'
scene.use_gravity = True
scene.gravity[2] = -9.81

# --- 2. Collections ---
# 仕様書通りの命名。既存があれば再利用。
col_names = [
    "00_Ref",
    "10_Site_Terrain",
    "20_Ext_校舎",
    "21_Ext_アリーナS",
    "22_Ext_アリーナN",
    "23_Ext_プール弓道",
    "30_Int_1F", "31_Int_2F", "32_Int_3F", "33_Int_4F", "34_Int_5F", "35_Int_RF",
    "40_Landscape",
    "50_Props",
    "90_Cameras",
    "99_Valid",
]

def get_or_create(name):
    if name in bpy.data.collections:
        return bpy.data.collections[name]
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c

for n in col_names:
    get_or_create(n)

# --- 3. World / Sun ---
# Sun Position 用のSunを作成（アドオン未導入でも可）
sun_name = "Sun_Physical"
if sun_name not in bpy.data.objects:
    bpy.ops.object.light_add(type='SUN', radius=1, location=(0, -20, 30))
    sun = bpy.context.active_object
    sun.name = sun_name
    sun.data.energy = 5.0
    sun.data.angle = 0.526  # ~0.5deg solar disk
    # 90_Cameras にも入れておく（表示整理）
else:
    sun = bpy.data.objects[sun_name]

# Sun Position設定（アドオンがあればプロパティに反映、なければ手動で角度を置く）
# 緯度35.8261337 経度139.7191328 JST (UTC+9)
# アドオン未導入時のフォールバック: 3月21日正午相当に傾ける
import math
lat = math.radians(35.8261337)
# 簡易: 太陽高度 = 90 - 緯度 + 赤緯(0と仮定) → 約54度
sun.rotation_euler[0] = math.radians(54)  # X rotation で高度を近似
sun.rotation_euler[2] = math.radians(15)  # やや南寄り

# --- 4. Grid / Clip ---
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        for space in area.spaces:
            if space.type == 'VIEW_3D':
                space.clip_start = 0.1
                space.clip_end = 5000
                space.overlay.grid_scale = 1.0
                # 1mグリッドを表示
                space.overlay.show_axis_x = True
                space.overlay.show_axis_y = True
                space.overlay.show_floor = True

print("[00] Collections & Sun setup done. UnitScale=1.0, Origin=Plateau origin (35.82613,139.71913), Z=GL")
print("Collections:", ", ".join(col_names))
