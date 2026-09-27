# 参照ソース一覧（Phase 0 一次確認済み 2026-09-26）

凡例： ✅=実際に開いて内容を確認済 / 📥=生存確認済・実体DLはユーザー側 / ❓=未確認

## A. 図面系（最優先ルート）

| # | 資料 | 状態 | URL / 入手方法 |
|---|------|------|----------------|
| A1 | 川口市「新市立高等学校の実施設計等について」(2015-09-01) PDF | 📥 Wayback に **9キャプチャ生存確認済**（2016-03-26〜2025-11） | 原本: `http://www.city.kawaguchi.lg.jp/kbn/Files/1/72011034/attach/270901jissi.pdf`<br>DL用（元ファイル直取得）: `https://web.archive.org/web/20160326192002id_/http://www.city.kawaguchi.lg.jp/kbn/Files/1/72011034/attach/270901jissi.pdf` |
| A2 | 川口市「新市立高等学校基本設計について」(H26-06-04) PDF | 📥 Wayback **9キャプチャ生存確認済** | 原本: `http://www.city.kawaguchi.lg.jp/kbn/Files/1/72011031/attach/260604shinkoukihonsekkei.pdf`<br>DL用: `https://web.archive.org/web/20160326191641id_/http://www.city.kawaguchi.lg.jp/kbn/Files/1/72011031/attach/260604shinkoukihonsekkei.pdf` |
| A3 | 関連市PDF（新校案内H28等） | ❓ URLのみ控え、内容未確認 | `2705H28shinkouannai.pdf`, `P02.pdf`, `27901siryou.pdf`（同上 `kbn/Files/1/.../attach/` 配下） |
| A4 | 『近代建築』2019年7月号 | ❓ 未入手。JIAページの「掲載雑誌」欄で掲載確定 | バックナンバー購入（彰国社）or 図書館。平面・断面図の掲載濃厚 |
| A5 | 日本建築学会『作品選集』・『School Amenity』2018.7・『文教施設』2019夏・『ランドスケープデザイン』No.125/No.148 | ❓ | 同上 |

## B. 設計者・受賞公表情報

| # | 資料 | 状態 | 得られた事実 |
|---|------|------|--------------|
| B1 | JIA優秀建築選2023 https://jia-award.jia.or.jp/kenchikusen/2023/best-architecture/2443/ | ✅ | 面積・高さ・構造・工期の確定値一式。キャンパスロード全長300m。アリーナN棟に柔道場。カツラ並木＋ゴムチップ舗装。掲載誌リスト |
| B2 | 久米設計プロジェクト https://www.kumesekkei.co.jp/project/0276.html | ✅ | **校舎棟 延床21,041㎡**。南＝普通教室／北＝特別教室／中央＝ラーニングストリート（半屋外・膜屋根）。市産鋳物・植木、県産ヒノキ。PC工学会賞・学会作品選集 |
| B3 | 久米設計デザインストーリー | ✅ | 設計意図の記述（定量情報はB1/B2と同値） |

## C. 行政・公式

| # | 資料 | 状態 | 得られた事実 |
|---|------|------|--------------|
| C1 | 広報かわぐち 2015年9月号 別冊?（施設計画）PDF https://www.city.kawaguchi.lg.jp/material/files/group/3/47267235.pdf | ✅ | 計画値（建築13,562㎡/延床31,632㎡…竣工値と差異あり）。配置イメージ：校舎棟／アリーナN・S棟／プール／テニスコート／第1グラウンド／SKIPシティ／竪川。大アリーナ＝バスケ3面・480席。第1グラウンド人工芝。避難施設機能 |
| C2 | 学校公式「学校施設」 https://kawaguchicity-hs.ed.jp/about/facility | ✅ | 写真インベントリ：校舎棟15枚／アリーナ棟11枚／グラウンド3枚／第2校地2枚（全てBlue Hours撮影の竣工写真）。サブページ building/arena/ground。第2校地：体育館（旧川口高校・耐震補強）・野球場・グラウンド・テニスコート |
| C3 | 埼玉県タウンガイド https://www.pref.saitama.lg.jp/a0109/sr-main/sr-townguide/townguide/school.html | ✅ | 所在地・最寄駅（埼玉高速鉄道 鳩ヶ谷駅）確認 |
| C4 | コトブキシーティング納入事例 https://www.kotobuki-seating.co.jp/projects/list/detail.html?pdid1=01041 | ✅ | **大ホール＝1階・約500席**。イスの仕様・色（黒/Sグレー/Dグレー3色ランダム、背テーブル、木部） |

## D. GIS / 位置

| # | データ | 状態 | 備考 |
|---|--------|------|------|
| D1 | **PLATEAU 川口市（2024年度版）** | ✅存在確認・📥要DL | LOD0/1/2 建築物・道路LOD1・都市計画・地形オルソ(GeoTIFF)。G空間情報センター `plateau-11203-kawaguchi-shi-2024` https://www.geospatial.jp/ckan/dataset/plateau-11203-kawaguchi-shi-2024 （利用規約同意が必要→ユーザー側でDL。CC BY 4.0、要出典表示） |
| D2 | 基盤地図情報（建物外周線・道路縁・DEM5m）| 📥要DL | https://fgd.gsi.go.jp/download/ 要無料登録。対象2次メッシュ: **5339（東京）** |
| D3 | OpenStreetMap | ✅ | 校舎棟 way=127212336、中心 35.8261337N/139.7191328E。bbox約南北276.8m×東西295.5m（ラーニングストリート300m記述と整合）。ODbL |
| D4 | Wikipedia 座標 | ✅ | 35°49′35.5″N 139°43′06.3″E（校舎棟西寄り） |
| D5 | 地理院タイル（空中写真・淡色地図・DEM）| 📥 | BlenderGISから直接取得可 |
| D6 | Google Earth / Street View | 目視のみ（方針）| メッシュ吸出し禁止・寸法根拠にしない |

## F. Phase 1 で追加取得（2026-09-27）

| # | 資料 | 状態 | URL / 備考 |
|---|------|------|-------------|
| F1 | **実施設計 別添資料（各階平面図・配置図・南立面図・断面図・事業工程）** | ✅テキスト層取得（面積表・通心寸法・室名ラベル）。📥図版バイナリはユーザーDL（キャプチャ 20161017, 2.6MB） | DL: `https://web.archive.org/web/20161017163448id_/http://www.city.kawaguchi.lg.jp/kbn/Files/1/72011034/attach/27901siryou.pdf` |
| F2 | 補助資料 P02.pdf | 📥有効キャプチャ特定（20170825, 617KB）。本文未読 | DL: `https://web.archive.org/web/20170825145501id_/http://www.city.kawaguchi.lg.jp/kbn/Files/1/72011034/attach/P02.pdf` |
| F3 | 実施設計等について PDF 本文 | ✅取得（id_方式で成功） | 上記A1のid_リンクがそのまま本文取得に有効 |
| F4 | 基本設計について PDF 本文 | ✅取得 | 同上（A2のid_）。概算事業費180億→192億上限の経緯、第1校地の敷地構成（現川口総合+上青木公民館跡+廃道・貯留槽+北側三角地）を確認 |
| F5 | OSM ポリゴン3件 | ✅Overpass JSON取得、 tools/site_geometry.py に保持 | way 127212336（第1校地） / 601835163（第2校地） / 938140491（第2校地体育館） ©OpenStreetMap contributors ODbL |
| F6 | 2027 学校案内パンフレット PDF（2026.7発行） | ✅本文取得 | `https://kawaguchicity-hs.ed.jp/files/download/17442` |
| F7 | 学校公式 施設紹介（校舎棟） / （アリーナ棟） / （グラウンド） | ✅取得 | `https://kawaguchicity-hs.ed.jp/about/facility/building` 等。室配置・写真キャプション一覧 |
| F8 | PLATEAU 川口市2024 CKAN メタデータ | ✅ | `https://www.geospatial.jp/ckan/api/3/action/package_show?id=plateau-11203-kawaguchi-shi-2024` |

### メモ：Wayback の確実な取得手順
1. まず CDX で有効キャプチャを探す: `https://web.archive.org/cdx/search/cdx?url=<元URL>&output=text&limit=10`
   → `application/pdf 200` の行の timestamp を使う（`text/html 404` は失敗キャプチャ=削除後）
2. 取得は `https://web.archive.org/web/<timestamp>id_/<元URL>`（`id_` で元ファイルが直接返る）

## E. ライセンス・倫理メモ

- PLATEAU：CC BY 4.0／出典「国土交通省 Project PLATEAU（2024年度 川口市）」等をクレジットへ
- 地理院データ：測量法に基づく出典表示「国土地理院」
- OSM：© OpenStreetMap contributors (ODbL 1.0)
- JIA・久米設計・学校公式・コトブキシーティングの写真・文言：**個人の参照に留め、転載・再配布しない**（テクスチャへの写真流用禁止）
- モデルに生徒・教員の氏名・時間割等の個人情報を含めない
- 敷地内撮影は学校の許可前提。公道からの撮影でも児童生徒の映り込みに配慮
