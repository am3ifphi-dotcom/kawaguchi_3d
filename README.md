# 川口市立高等学校 デジタルツイン — Phase 2 外観／Phase 3 内装の検証スタディ

**これは竣工実測の完成モデルではありません。** 設計図を建物実寸の第一根拠とし、提供JSONは周辺LOD1・位置合わせの補助データとして扱います。現状、地形/敷地境界/道路および室別の竣工内装詳細の確定データはありません。

## 起動

```bash
npm ci
npm run dev
```

Viteが表示するURLを開く。PCブラウザでドラッグ回転、右ドラッグ移動、ホイール拡大縮小。「高質感モード」は影・AO・手続き質感を追加（描画負荷大）。「屋上設備スタディ」は2015設計図p.7の置場に仮の機器外装を配置し、専用スイッチで非表示にできます（実機種・台数ではありません）。「鑑賞モード」は画面のUIを隠しH/Escで戻ります。「一人称で歩く」は屋外モデル上のWASD/マウス視線、Shift速歩、Spaceジャンプ、Esc終了。ポインターロック許可が必要。左のスイッチで周辺建物・航空画像2枚（デフォルトOFF）・校舎外観・選択的な内装/共用部スタディ（初期ON）と学校棟の元LOD1候補（初期OFF）を切り替える。内装は2Fの通りと共用室の家具例、S棟3Fの教室一室サンプルのみ。屋内歩行・全室再現には未対応。東側入口・南北立面・アリーナ通り・中央広場から校舎2Fへの階段・2F通り内部・教室サンプルの比較視点も選択可能。`npm run build`で型検査と静的ビルド、`npm run audit`で入力・外観・選択的内装のモデル整合監査。Node.js 20.19+ または 22.12+ を推奨。

## 根拠・現状

- [Phase 0 原本監査](docs/phase0-audit.md)
- [Phase 1 PDF×JSON照合、閲覧できた公式写真、実装の限界](docs/phase1-site.md)
- [Phase 2 校舎・膜屋根・アリーナ外観スタディの出典/実装/限界](docs/exterior-study.md)
- [Phase 3 内装の実画像照合、選択的試作と未造形範囲](docs/interior-study.md)
- [階別・翼別の室用途台帳（未造形も明記）](data/interior-program.json)
- [公開アーカイブ探索と竣工写真の外観照合・矛盾修正](docs/archive-photo-review.md)
- [階段再照合・X字フレーム・高質感・一人称操作の検証記録](docs/interaction-study.md)
- [西側・中央広場の正面階段と2F接続の訂正・未確定事項](docs/west-circulation-study.md)
- [実ブラウザ描画・公式写真との7視点照合／未解消の端壁帰属](docs/screen-review.md)
- [施設マスターリスト（58要素、確度・出典を保持）](data/facility-master.json)
- [公式施設4アルバム31枚の個別画像URL台帳](data/photo-inventory.json)

`src/geo/coordinates.ts`: 提供JSONの原点からWGS84局所東北距を計算してタイル中心を配置（測地基準点の検証待ち）。`src/world/lod1.ts`: JSON全件を検査し、有効なリングだけを300m調査円内に絞り、1+1メッシュへバッチ統合。`src/world/tiles.ts`: 提供画像2枚をオンデマンドで表示。`src/world/exterior.ts`: GIS輪郭と設計断面値から作成した写真参照の外観スタディ（窓割・曲率・階段寸法は推定/仮置き）。`src/world/west-connection.ts`: 中央広場地上面、西→東の正面階段と2F連絡踊り場（南北からの側面直結2基は撤回。輪郭・段数は仮置き）。`src/world/roof-equipment.ts`: 校舎S/Nの屋外機置場の資料根拠と仮造形（実機器仕様・台数未確認）。`src/world/interior.ts`: 写真と平面用途からの室内比較（全室再現ではない）。`src/world/quality.ts`: オプションの描画強化。`src/world/walk.ts`: 屋外の試験的PointerLockControls・重力・段差と壁の簡易衝突。`src/main.ts`と`src/style.css`: Three.js画面/OrbitControls/Stats・UI。

**保留**：学校名サインと二翼の東端の写真方位照合、GL・標高・精密な敷地界、建物の竣工図どおりの立体形状、道路/歩道/DEM、屋内竣工間仕切図・家具表、公式写真全31点の画素確認、画像転載許諾。無根拠の地物を描かず、画面には暫定・推定を区別して表示しています。校舎の外観スタディはPhase 2で試作しましたが、再現精度目標（外形±0.3m）に未達です。

日本語表示用のNoto Sans JPは`public/fonts/`にSIL Open Font License 1.1で同梱（ライセンス本文は同フォルダの`LICENSE.txt`）。外部の写真やメッシュは配布物に含めません。
