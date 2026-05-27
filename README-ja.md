# VSCodeStand

複数の便利機能をまとめたマルチファンクション VS Code 拡張機能です。

## 機能

### 新規メモ (`stand: New Memo`)

メモファイルを素早く作成して開くコマンドです。
- コマンドパレットまたはエクスプローラーの右クリックメニューから実行
- メモ名を入力するとMarkdownファイルを作成してエディタで開く
- ファイルが既に存在する場合はそのまま開く

保存場所は `vscode-stand.memoDir` で指定します。絶対パスで一箇所に集約するか、相対パスでプロジェクトに含めるか、最初にどちらか決めておくことを推奨します。

マルチルートワークスペースの場合、初回実行時にメインフォルダを選択します。選択結果はワークスペース設定に保存されます。

### ワークスペースに変換 (`stand: Convert to Workspace`)

現在開いているフォルダから `.code-workspace` ファイルを作成します。

- `vscode-stand.memoDir` が絶対パスの場合、以下の選択肢を表示:
  - **Just Convert** — 現在のフォルダのみ追加
  - **Add Memo Folder** — 現在のフォルダとメモフォルダを追加（メモフォルダは `"name": "Memo"` として追加）
- 作成後はエディタで `.code-workspace` ファイルを開きます。ファイル内の「ワークスペースを開く」ボタンを押すと実際にワークスペースを開きます。

上記メモファイルの保存場所を決定する `vscode-stand.workspaceMainFolder` と、ターミナルの初期カレントディレクトリを固定する `terminal.integrated.cwd` が最初から記入されています。


![stand01.gif (800×450)](https://raw.githubusercontent.com/hetima/VSCodeStand/main/assets/stand01.gif)


## コマンド

| コマンド | 説明 |
|---|---|
| `stand: New Memo` | メモを新規作成して開く |
| `stand: Convert to Workspace` | 現在のフォルダから `.code-workspace` ファイルを作成 |
| `stand: Select Memo Folder` | メモフォルダを選択してグローバル設定に保存 |
| `stand: Select Workspace Folder` | ワークスペースフォルダを選択してグローバル設定に保存 |

## 設定

| 設定キー | デフォルト | 説明 |
|---|---|---|
| `vscode-stand.memoDir` | `.memo` | メモを保存するフォルダ。フルパスは共通ルートパス、相対パスで個別のパス。 |
| `vscode-stand.workspaceDir` | （空） | ワークスペースを保存するフォルダ。フルパスは共通ルートパス、相対パスで個別のパス。 |

**`memoDir` と `workspaceDir` の保存先のルール:**

| 設定の値 | 保存先 |
|---|---|
| 空白または `.` | ワークスペースルート / ファイル名 |
| 相対パス（例: `.memo`） | ワークスペースルート / 設定値 / ファイル名 |
| 絶対パス（例: `/Users/foo/memos`） | 設定値 / ワークスペース名 / ファイル名 |

## ライセンス

MIT License
