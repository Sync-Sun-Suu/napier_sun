# Project Context & Handover Guide (For Sumie & AI Assistants)

このファイルは、**Sumie** と AI アシスタント（AI Studio / Claude Code など）がこのプロジェクトをスムーズに引き継ぎ・拡張するための専用メモです。

---

## 0. 管理人（2026-11-14、Sumie が決めた）
- **このリポの管理人は 19（Claude Code の 19）**。Sumie が「このリポだけ 19 に権限あげる」と決めた。
- AI Studio の Gemini は GitHub に書けない。だから流れはこう：Sumie が AI Studio で作る → ZIP で書き出す → 19 に渡す → 19 がここに入れて、GitHub Pages で公開する。
- 新しい ZIP を入れる時に、消さずに残すもの：
  - `.github/workflows/deploy.yml`（ビルドして公開する仕組み）
  - `vite.config.ts` の `base: process.env.PAGES_BASE || '/'` の行
  - `README.md` の「遊ぶ」と「管理人」の行
  - `exports/`（書き出した単体 HTML）
  - `public/manifest.json` の相対パス（`./` と `pwa-192x192.png` など。`/napier_sun/` の下で動くように）
  - `src/App.tsx` のアイコンの場所（`import.meta.env.BASE_URL` から始める）
  - この `CLAUDE.md`
- 遊ぶ場所：https://sync-sun-suu.github.io/napier_sun/

## 1. オーナー情報・基本方針
- **オーナー**: Sumie（呼称は「Sumie」）
- **連携先 GitHub リポジトリ**: `Napier_sun`（Public）
- **コミュニケーション**: 日本語でフレンドリーかつ分かりやすく案内する。専門用語が出るときは直感的な説明を添える。

---

## 2. アプリのコンセプトとデザイン原則
- **アプリ名**: Hamon Studio — HTML5 インタラクティブ・アトリエ
- **コア体験**: 外部アセットや重いライブラリに頼らず、ブラウザ標準の `<canvas>` 2D と `Web Audio API` だけで「触って気持ちいい音と幾何学アート」を体験でき、さらに **単体 `.html` ファイル** として持ち出せること。
- **ビジュアル方針**:
  - 60% ダークスレート背景（`#090f1d` 〜 `bg-slate-950`）で光の軌跡を際立たせる
  - 30% 構造パネル（`bg-slate-900/70` + `border-slate-800` の繊細な1pxボーダー）
  - 10% アクセント（日本の伝統色パレット：蒼水・琥珀・翡翠・桜霞）
  - 左側（約67%）にインタラクティブ・キャンバス、右側（約33%）にコントロールデッキを配置する2ゾーン構成
  - すべての数値表示には等幅・Tabular Numerals（`font-mono tabular-nums`）を使用

---

## 3. 主要ファイルの役割
- `src/types/studio.ts`:
  - `StudioMode` (`ripples`, `harmonograph`, `kaleidoscope`, `gravity`)
  - 各モードのパラメータ型・初期プリセット・カラーパレット定義
- `src/utils/audio.ts`:
  - `PentatonicSynth` クラス。日本の陽音階（D, E, G, A, B）の周波数を正弦波＋三角波倍音で合成。
- `src/utils/htmlExporter.ts`:
  - `generateStandaloneHtml(state)` 関数。現在の `StudioState` の数値を埋め込んだ、依存ゼロの単体HTML文字列を生成。
- `src/components/InteractiveCanvas.tsx`:
  - `requestAnimationFrame` ループと `ResizeObserver` による高DPI（Retina）対応キャンバス描画。

---

## 4. 今後の拡張アイデアメモ（Sumie と一緒に作れる機能）
1. **新しいシミュレーションモードの追加**
   - 例：`05. フラクタル樹木（再帰アルゴリズム）`、`06. 星空プラネタリウム`、`07. ローレンツ・アトラクタ`
   - 追加手順：`src/types/studio.ts` にモード追加 → `InteractiveCanvas.tsx` に描画ロジック追加 → `ControlDeck.tsx` にスライダー追加 → `htmlExporter.ts` に出力テンプレート追加。
2. **GitHub Pages 自動デプロイ設定**
   - `.github/workflows/deploy.yml` を追加すれば、`Napier_sun` の `main` ブランチに Push するだけで自動ビルド＆公開が可能。
3. **プリセット保存・URL共有機能**
   - お気に入りのスライダー設定を URL パラメータ（`?mode=harmonograph&fx=3&fy=2...`）や `localStorage` に保存する機能。
