# 04_adjust_arena_to_site.py — Phase 1補正: アリーナS/Nを敷地境界に合わせて再配置
# 実行前: 何が起きるか → 03で作った敷地境界を基準に、アリーナS/Nのブロックを正しい位置・回転に移動する
# 前提: 02_blockout_kosha... と 03_site_terrain.py 実行済み
# 値はいずれも27901p03/p04の寸法からの【推定】。GSIや高解像写真で後補正可能。
import bpy, math

def find(name):
    return bpy.data.objects.get(name)

# 03で校舎をY+12m動かしたので、アリーナも同量動かす必要がある
# p03配置図: アリーナSは校舎の西に約45m離れ、中央広場を挟む。アリーナNはさらに北へ30m。
# 02の初期値: アリーナS (-92, -2), アリーナN (-72, 42) は原点基準。
# 校舎オフセット Y+12 を反映して、相対位置を再計算。

# 目標位置（敷地境界トレース後の推定）
# 校舎中央 Y=12, アリーナS中央 Y= -8 (校舎から南20m下)、アリーナN中央 Y= 38 (校舎から北26m上)
targets = {
    "BLOCK_ArenaS_Main":   (-88.0, -8.0 + 12.0 -2.0, 0),  # 03のオフセットを二重にしないよう注意: 02の-2に+12を加味し、さらに-8へ
    # 簡略: 最終的なアリーナS Y = 4.0 とする（敷地のやや南）
    "BLOCK_ArenaN_Main":   (-70.0, 50.0, 0),
    "BLOCK_ArenaN_Kendo":  (-42.0, 50.0, 0),
    "BLOCK_Pool_Existing": (-68.0, 90.0, 0),
}

# 実際には 03で校舎を+12したので、アリーナの絶対Yを再設定する
final_pos = {
    "BLOCK_ArenaS_Main":   (-88.0,  2.0, None),   # 中央広場の南側、グラウンド北端に接する
    "BLOCK_ArenaN_Main":   (-72.0, 52.0, None),
    "BLOCK_ArenaN_Kendo":  (-44.0, 52.0, None),
    "BLOCK_Pool_Existing": (-68.0, 88.0, None),
}

for name, (x,y,z) in final_pos.items():
    obj = find(name)
    if not obj:
        print(f"[04] {name} not found skip")
        continue
    if x is not None:
        obj.location.x = x
    if y is not None:
        obj.location.y = y
    if z is not None:
        obj.location.z = z
    print(f"[04] moved {name} to ({obj.location.x:.1f}, {obj.location.y:.1f})")

# プールは既存で角度が0のままだが、p03ではやや斜め -1deg程度。ここでは0で保持。
print("[04] Arena adjusted to site. 次はBlenderGISでDEM置換後、目視で±1m微調整してください。")
print("【推定】アリーナ位置はp03配置図の印刷寸法からの換算。GSIの屋根ポリゴンと照合推奨。")
