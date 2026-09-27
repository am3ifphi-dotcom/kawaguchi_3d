# ダウンロードガイド（2026-09-27 改訂版）

「どこから何を、どのフォルダに保存すればよいか」の完全版。優先度順。
※「画像（写真）」のDLは**任意・後回しでOK**です。必須は ❶〜❸ です。
※**大きなファイルはGitに入りません**（`data/` は `.gitignore` 済み）。ローカル作業用です。

---

## ❶ 【最優先】実施設計の図面PDF（Wayback Machine から直接）

ブラウザのアドレスバーに貼り付けて開く → PDFが直接ダウンロードされます
（ダウンロードされない場合は右クリック→「名前を付けてリンク先を保存」）。

| ファイル | 内容 | URL | 保存先 |
|---|---|---|---|
| **27901siryou.pdf** | **各階平面図・配置図・南立面図・断面図・工事工程**（最重要！） | `https://web.archive.org/web/20161017163448id_/http://www.city.kawaguchi.lg.jp/kbn/Files/1/72011034/attach/27901siryou.pdf` | `refs/city_pdf/` |
| P02.pdf | 補助資料（実施設計関連。内容未確認） | `https://web.archive.org/web/20170825145501id_/http://www.city.kawaguchi.lg.jp/kbn/Files/1/72011034/attach/P02.pdf` | `refs/city_pdf/` |
| （任意）260604shinkoukihonsekkei.pdf | 基本設計について 本文 | `https://web.archive.org/web/20160326191641id_/http://www.city.kawaguchi.lg.jp/kbn/Files/1/72011031/attach/260604shinkoukihonsekkei.pdf` | `refs/city_pdf/` |
| （任意）270901jissi.pdf | 実施設計等について 本文 | `https://web.archive.org/web/20160326192002id_/http://www.city.kawaguchi.lg.jp/kbn/Files/1/72011034/attach/270901jissi.pdf` | `refs/city_pdf/` |

> ⚠️ Waybackのページが挟まる場合は、URL中の `<タイムスタンプ>id_` の `id_` が残っているか確認してください（例：`/web/20161017163448id_/`）。

---

## ❷ PLATEAU 川口市2024（周辺300mモデル・校舎外形の自動化用）

**サイズとGitについて（重要・安心してください）**：約400MBのZIPでも **Gitには入りません**。
`data/plateau/` は最初から `.gitignore` で除外済みで、ZIPはローカル作業用です。
解凍後に必要メッシュ（533975 近辺）だけ取り出し、残りは削除してOKです。

取得方法（2つのうち好きな方）:

- **A. まるごとDL（推奨・確実）**
  1. **直リンク（このボタンの実体）**: 
     `https://assets.cms.plateau.reearth.io/assets/e2/adab26-a177-47ff-a6d8-18bd04f6baae/11203_kawaguchi-shi_pref_2024_citygml_1_op.zip`
     （ページ) `https://www.geospatial.jp/ckan/dataset/plateau-11203-kawaguchi-shi-2024/resource/22e9b2fe-8375-43aa-961a-d41b6ed8b226` の「ダウンロード」でも同じ）
  2. ZIP（約411MB）を `data/plateau/` に保存（**Git管理外**。解凍は私の指示で）
  3. 索引図PDF（小さい）: `https://assets.cms.plateau.reearth.io/assets/26/842232-c17c-4cff-b3c4-58dbb93ffc8e/11203_indexmap_op.pdf` も同フォルダへ

> **⚠️ 私からの訂正（索引図で判明）**：川口市2024の建物は **LOD1が全域（61.95km²）** ですが、**LOD2は「川口市指定5施設（0.16km²）のみ」** でした。本校がその5施設に含まれる可能性は低いです。
> つまり **PLATEAUからは「建物の外形ポリゴン＋高さ属性付きの直方体（LOD1）」は確実に取れる**ものの、**屋根形状（LOD2）は原則取れません** — 校舎の屋根・外観は当初通り「実施設計図＋写真」で作ります（方針は正しかったことが確認された形です）。索引図の目視で本校がLOD2対象かどうか最終確認をお願いします。

- **B. 必要メッシュだけ切り出す（軽い）**: 国交省公式 **PLATEAU-GIS-Converter**
  `https://github.com/Project-PLATEAU/PLATEAU-GIS-Converter`（無料・Win/Mac）
  → 変換元で川口市2024を選び、**メッシュ 533975** を指定して DL＆CityGML→FBX/OBJ/GeoJSON 変換まで一括。
  大量DLを避けたい場合はこちら。

> ライセンスはPLATEAUサイトポリシー（CC BY相当・要出典表示）。
> 参考：索引図で 533975 が LOD2 整備範囲かを確認してください（たぶん含まれます）。
>
> **（任意）GeoTIFF オルソ写真**: も欲しければ `https://assets.cms.plateau.reearth.io/assets/c9/00a35a-abe4-45a4-bfc0-c25a6a2628cb/11203_kawaguchi-shi_pref_2024_ortho_1_op.zip`（約1.2GB、40cm解像度、撮影2021年1月、JGD2011/6668）→ `data/plateau/`。BLENDERでの貼付けに強いが大きい。無理なら地理院タイル z16〜18 手動保存 or BlenderGIS で代替可。

---

## ❸ GL標高（FGDの代わりに地理院タイルで。登録不要・開けるはず）

~~基盤地図情報（fgd.gsi.go.jp）~~ は**不要になりました**。代わりに **国土地理院タイル（cyberjapandata）** をブラウザで直接保存します（登録なし）。
下記URLをブラウザで開き、PNGが標高のグレースケール画像で出たら「名前を付けて保存」→ `data/dem_tiles/` へ。
各タイルにつき **dem5b → dem5a → dem_png の順で試して**、表示できたもの1枚だけ保存でOK。

**第1校地（2タイル）**
- `https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/15/29101/12886.png`（駄目なら dem5a_png、最後に dem_png に置き換え）
- `https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/15/29101/12887.png`

**第2校地（4タイル）**
- `https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/15/29103/12888.png`
- `https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/15/29103/12889.png`
- `https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/15/29104/12888.png`
- `https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/15/29104/12889.png`

> このURL群は `tools/gsi_tiles.py` で計算できます（任意）。見え方：真っ白に近いグレーの画像が標高です。
> 川口はほぼ平坦なので、取れなくても致命傷ではありません（PLATEAU dem でも代替可）。

---

## ❸.5 【任意】空中写真を自分で持ちたい場合（BlenderGISを使わない選択肢）

ブラウザで以下を保存 → `data/raw/photo_tiles/`（z16・各枚PNG。**BlenderGISで一括取得できるなら不要**）

第1校地 seamlessphoto z16（6枚）:
```
https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/16/58202/25773.png
https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/16/58202/25774.png
https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/16/58202/25775.png
https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/16/58203/25773.png
https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/16/58203/25774.png
https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/16/58203/25775.png
```
第2校地 seamlessphoto z16（6枚）:
```
https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/16/58207/25777.png
https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/16/58207/25778.png
https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/16/58208/25777.png
https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/16/58208/25778.png
https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/16/58209/25777.png
https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/16/58209/25778.png
```
（淡色地図stdも同じ x/y で layer を `std` に変えるだけ。z17〜18の高精細は BlenderGIS が楽です）

---

## ❹ 【任意・後回しOK】写真（個人の参照用のみ。再配布不可）

Phase 3（外装）以降で使います。今はブラウザで眺めるだけでもOK。

| 対象 | URL | 保存先 |
|---|---|---|
| 校舎棟 竣工写真 15枚 | `https://kawaguchicity-hs.ed.jp/p/photo_albums/photo_list/224/52?frame_id=439` | `refs/photos/publish/` |
| アリーナ棟 竣工写真 11枚 | `https://kawaguchicity-hs.ed.jp/p/photo_albums/photo_list/224/51?frame_id=439` | 同上 |
| グラウンド 3枚 / 第2校地 2枚 | `.../224/55?frame_id=439` / `.../224/60?frame_id=439` | 同上 |
| 令和9年度 学校案内PDF（2026.7発行） | `https://kawaguchicity-hs.ed.jp/files/download/17442` | `refs/school_docs/` |
| （現地に行ける時）外観写真 | 自分で撮影 | `refs/photos/` |

> © Blue Hours（撮影）。個人の参照に留め、テクスチャへの直接使用・再配布は不可です。

---

## ❺ ダウンロード完了後にやること

1. Blender（4.x）で新規ファイル → Scripting で
   `blender/scripts/phase0_project_setup.py` を開いて Run Script（必須。保存されます）
2. 続けて `blender/scripts/phase1_site_setup.py` を Run Script
3. 3Dビューで Numpad「7」（上面図）にして、グリッド＋敷地ポリゴンが見えるか確認
4. **実行ログ（Infoコンソール）か画面キャプチャを共有** → Phase 2（ボリューム）へ進みます

---
最短ルートは ❶ の2PDFだけ先にやってしまうことです。これだけでも Phase 2 がかなり進められます。
