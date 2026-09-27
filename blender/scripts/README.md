# Blender スクリプト実行手順（Phase 0-2）

> すべて Blender Text Editor で「Open → Run Script」。1行目コメントの「何が起きるか」を実行前に読むこと。

## 実行順序

| 順 | ファイル | 何が起きるか | 前提 | 所要 |
|----|----------|--------------|------|------|
| 0 | `00_setup_collections.py` | Unitをm/Scale1.0にし、コレクション16個とSunを作成 | なし | 5秒 |
| 1 | `01_import_plateau_and_tiles.py` | plateau 300mクリップでLOD1生成 + GSIタイル2枚を仮置き配置 | 00済、plateau JSONが隣にある | 10秒 |
| 2 | `02_blockout_kosha_from_drawing.py` | 27901確定値で校舎109.2m×2棟、アリーナS/N、プール、グラウンド外形をブロック化 | 00済 | 10秒 |

## 保存場所

- `.blend` は `kawaguchi_3d/kawaguchi_3d.blend` として保存（相対パスでplateau/tileを参照するため）
- スクリプト実行後 `File → Save` すること

## よくある失敗

- `plateau_53395597.json not found` → .blendを repo直下に保存していない。`01` の `candidates` を確認。
- タイルが浮く/沈む → Z=-0.05に配置しているため地形より下。BlenderGISのDEM導入後に `Z+0.3` に手動補正。
- ブロックが原点からズレる → `02` は校舎LS中央を原点とする仮置き。Phase1の敷地トレース後に `G` で移動する想定。

## アドオン導入（Phase1以降）

1. **BlenderGIS**: Edit→Preferences→Add-ons→Install から `BlenderGIS` zipを導入。Georeferencingを `EPSG:6677` に。
2. **fSpy**: 別途 `fSpy` アプリで写真の消失点を合わせ `.fspy` を Import。
3. **Sun Position**: Add-on有効化後、World Properties→Sun Positionで 緯度35.82613 経度139.71913 を入力。

## 検証

- `99_Valid` に寸法注記（MeasureIt）を入れて `L=109.2` が合うか確認。
- `00_Ref/TILE_*` と `PLATEAU_300m_LOD1` が同じ原点で重なるか Top View（Numpad7）で確認。ズレていれば `01` の `dx/dy` の簡易換算が原因 → BlenderGISで上書きするまで【推定】扱い。
