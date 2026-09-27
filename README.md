# 川口市立高等学校 3Dデジタルツイン (kawaguchi_3d)

埼玉県川口市立高等学校・附属中学校（第1校地: 川口市上青木3-1-40）と周辺約300mを、
公開図面・GIS・写真に基づき**実寸スケール**でBlender上に再現し、**Vercel公開の一人称ウォークスルーWebサイト**として納品するプロジェクト。

- 出力: Blender（モデリング）→ glTF/GLB → **Next.js + three.js** → **Vercel**（`docs/web_delivery_plan.md`）
- 座標系: JGD2011 平面直角座標系 第IX系 (EPSG:6677)、Z=0 はGL
- 単位: メートル (Unit Scale 1.0)
- 誠実性ルール: 全要素に 根拠／確度（確定・推定・仮置き）を `docs/master/facility_master_list.csv` で管理。不明は創作しない。

## ステータス

- [x] **Phase 0** 調査設計（2026-09-26）→ `docs/phase0/phase0_report.md`
- [x] **Phase 1** 敷地（2026-09-27）→ `docs/phase1/phase1_report.md`（OSM実座標ポリゴン+実施設計寸法群取得。ユーザーDL＆実行待ち）
- [ ] Phase 2 ボリューム（PLATEAU + 実施設計平面図）…ユーザー準備後開始
- [ ] Phase 3 外装（fSpy + 写真）
- [ ] Phase 4 内部
- [ ] Phase 5 マテリアル/光
- [ ] Phase 6 探索セットアップ
- [ ] Phase 7 検証

## ディレクトリ

| パス | 内容 |
|------|------|
| `docs/phase0/` | Phase 0 の成果物（レポート・チェックリスト・質問票）|
| `docs/master/` | 施設マスターリストCSV・未確定リスト（常に最新を維持）|
| `docs/references/` | ソース索引・ライセンスメモ |
| `blender/scripts/` | bpy スクリプト（実行前に1行説明を付す運用）|
| `tools/` | 座標換算などのCLIツール |
| `refs/` `data/` | ユーザー投入資料・GISデータ（**Git管理外**、著作権・サイズのため）|

## 法的・倫理

PLATEAU(CC BY 4.0)・地理院データ・OSM(ODbL)は出典表示。Google Earth/SVは目視のみ。
各種写真は個人の参照に留め再配布しない。生徒・教員の個人情報はモデルに含めない。
敷地内撮影は学校の許可が前提。
