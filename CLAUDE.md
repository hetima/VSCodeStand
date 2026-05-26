# VSCodeStand

VSCode拡張機能のプロジェクト。複数機能をまとめたマルチファンクション拡張。

## 構成

```
src/
  extension.ts        # activate/deactivate エントリポイント
  cli.ts              # サブプロセスとして起動されるCLIスクリプト
  command/
    sayBye.ts         # コマンド実装（コマンドごとにファイルを分ける構成）
l10n/
  bundle.l10n.ja.json # コード内文字列の日本語翻訳
package.nls.json      # package.json 内文字列のデフォルト（英語）
package.nls.ja.json   # package.json 内文字列の日本語翻訳
out/                  # tsc コンパイル出力（gitignore済み）
```

## ビルド・デプロイ

```bash
pnpm compile          # TypeScript コンパイル
pnpm watch            # ウォッチモード
pnpm deploy:win       # パッケージ化 → VSCodeにインストール
```

## l10n（ローカライズ）

2系統の仕組みが共存している。

### 1. package.nls — 静的テキスト（コマンドタイトル等）

`package.json` 内の `%キー名%` 記法。VSCodeが言語に応じて自動選択。

- `package.nls.json` — 英語（デフォルト）
- `package.nls.ja.json` — 日本語

### 2. @vscode/l10n — コード内動的テキスト

TypeScriptコード内で `vscode.l10n.t()` または `l10n.t()` を使う。

```typescript
vscode.l10n.t('Hello')                          // シンプル
vscode.l10n.t('Hello {0}', name)                // 位置引数
vscode.l10n.t('Hello {done}', { done: 'val' })  // 名前付き引数
l10n.t({ message: 'Bye {0}', args: ['Joey'], comment: ['{0} is a name'] })
```

翻訳ファイル: `l10n/bundle.l10n.ja.json`（英語はソース文字列がそのまま使われる）

`package.json` の `"l10n": "./l10n"` でディレクトリを指定。

### CLIサブプロセスでの使い方

`cli.ts` は拡張からサブプロセスとして起動される。翻訳バンドルのパスを環境変数で渡す。

```typescript
// extension.ts 側（渡す）
env: { EXTENSION_BUNDLE_PATH: vscode.l10n.uri?.fsPath }

// cli.ts 側（受け取る）
if (process.env['EXTENSION_BUNDLE_PATH']) {
  l10n.config({ fsPath: process.env['EXTENSION_BUNDLE_PATH'] });
}
```

## コマンドのラベル規則

コマンドタイトルには常に `stand: ` プレフィクスを付ける。

```json
{ "title": "stand: Select Memo Folder" }
```

## 新しいコマンドの追加手順

1. `src/command/` に実装ファイルを作成
2. `package.json` の `contributes.commands` にコマンドを追加
3. `src/extension.ts` の `activate()` でコマンドを登録
4. 必要に応じて `package.nls.json` / `package.nls.ja.json` に文字列を追加
5. コード内文字列は `vscode.l10n.t()` を使い、`l10n/bundle.l10n.ja.json` に翻訳を追加
