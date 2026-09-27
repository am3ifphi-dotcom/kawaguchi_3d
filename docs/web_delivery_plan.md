# Web公開（Vercel）デリバリー計画（2026-09-27 設定）

ユーザー決定： **最終成果は Vercel でサイトとして公開する**。

## 1. パイプライン（確定方針）

```
[GIS/図面/写真] → [Blenderで実寸モデリング] → [glTF/GLBエクスポート]
      → [web/public/models/*.glb に配置] → [Next.js + three.js で描画]
      → [Vercel デプロイ（Git push 連携）]
```

- 3Dエンジン: **three.js**（`@react-three/fiber` + `@react-three/drei`）
- フレームワーク: **Next.js (App Router)**、Vercel の Root Directory は `web/`
- モデル形式: **GLB（バイナリ glTF）**。Blender標準エクスポータで出力
- ウォークスルー: PointerLock（一人称、視点高1.6m）＋WASD。コリジョンは Phase 6 で実装

## 2. 座標系の橋渡し（重要）

- Blender: `+X=東, +Y=北, +Z=上`（本プロジェクトの約束）
- glTF変換: Blender→glTFは自動で **Y-up** になる → three.js では **`+X=東, −Z=北, +Y=上`**
- つまりWeb上で「北」は **−Z方向**。カメラ初期位置・Sun Position（緯度経度→方位の再計算）はこの前提で書く（`web/components/CampusViewer.tsx` 内の定数に集約）

## 3. サイズ予算（Vercel/ブラウザ快適動作の目安）

| 項目 | 目標値 |
|------|--------|
| 全体GLB（Draco/Meshopt圧縮後） | **30MB以下**（目標10〜20MB） |
| 1ファイル上限（GitHub/Vercel実用） | 100MB未満 |
| テクスチャ | 2K以下・KTX2/Basis化は余裕があれば |
| 読み込み戦略 | 校舎内部(重い)と外観を **分割GLB** にして遅延ロード（コレクション単位=命名規則と一致） |
| 60fps目安 | Webでも同様（遠景はLOD1箱のまま） |

## 4. 法的表示（公開時に必須。サイトの /credits ページに掲載）

- **PLATEAU**: 「国土交通省 Project PLATEAU（2024年度 川口市）」CC BY 4.0相当
- **OpenStreetMap**: 「© OpenStreetMap contributors (ODbL 1.0)」— 派生データベースの扱いに注意（ポリゴンをそのまま再配布する場合、帰属表示＋同一条件での提供が求められるため、**ポリゴン自体は最小限の参照に留め、建物形状は独自モデルとする**）
- **国土地理院タイル（標高・写真・淡色地図）**: 「国土地理院」出典表示
- **川口市の公開資料（実施設計・基本設計）**: 参照元として明記（公文書。PDF自体の再配布はしない）
- **JIA/久米設計/学校公式/コトブキシーティングの写真**: **使用禁止を明記**（個人参照のみ。サイトに掲載しない）
- **個人情報**: 生徒・教員名は含めない、を明記
- #### 推奨：学校への事前連絡を検討（法的義務ではないが、公開後トラブル回避に有効）

## 5. Git/プライバシー運用

- このリポジトリの **`data/`・`refs/`（写真・DLしたPDF）は .gitignore で永続的に非公開**（現状維持）
- サイトに乗せるのは `web/public/models/` の GLB と `docs/` のみ
- 質問: **リポジトリ自体は Public/Private のどちら**で運用しますか？（docs に調査過程が全部載るため、公開なら Private 推奨だがユーザー判断）

## 6. セットアップ手順（受け渡し）

```bash
cd web
npm install     # Node 20+（私の環境では未検証。ローカルで確認してください）
npm run dev     # http://localhost:3000
# デプロイ（GitHub連携）: Vercelダッシュボードで New Project → このリポジトリを選択
#   → Root Directory を「web」に設定 → Deploy
```

## 7. モデル配置フロー（以降のフェーズ）

1. Blender側: `blender/scripts/export_glb.py` を実行 → コレクション単位で GLB 出力（`export_yup=True`）
2. 出力された GLB を `web/public/models/` にコピー（`campus.glb` 等）
3. `npm run dev` で表示確認 → push で Vercel 公開

> Phase 6（探索セットアップ）はこのWeb版に置き換わります（Godot/Unreal への書き出しは不要になりました）。
> Blender内の Walk Navigation は検証用として併用可ですが、公開基準はWeb。
