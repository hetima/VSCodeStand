import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

interface FileNode {
    name: string;
    fullPath: string;
    isDir: boolean;
    children?: FileNode[];
}

/** memoDirのツリーを再帰的に構築 */
function buildTree(dirPath: string): FileNode[] {
    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
        return [];
    }

    const dirs: FileNode[] = [];
    const files: FileNode[] = [];

    for (const entry of entries) {
        if (entry.name.startsWith('.')) {
            continue;
        }
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            dirs.push({
                name: entry.name,
                fullPath,
                isDir: true,
                children: buildTree(fullPath),
            });
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push({ name: entry.name, fullPath, isDir: false });
        }
    }

    dirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    return [...dirs, ...files];
}

function getNonce(): string {
    let text = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}

function buildHtml(_webview: vscode.Webview, tree: FileNode[], savedOpenState: Record<string, boolean>): string {
    const treeJson = JSON.stringify(tree).replace(/</g, '\\u003c');
    const savedJson = JSON.stringify(savedOpenState).replace(/</g, '\\u003c');
    const nonce = getNonce();

    return /* html */`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Memo Explorer</title>
<style nonce="${nonce}">
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    user-select: none;
}

#search-bar {
    padding: 6px 8px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, transparent);
}

#search {
    width: 100%;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    padding: 3px 6px;
    outline: none;
    font-size: var(--vscode-font-size);
    font-family: var(--vscode-font-family);
}

#search:focus {
    border-color: var(--vscode-focusBorder);
}

#tree-container {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
}

.empty-msg {
    padding: 12px;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
}

.tree-item {
    display: flex;
    align-items: center;
    padding: 1px 0;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
}

.tree-item:hover {
    background: var(--vscode-list-hoverBackground);
}

.tree-item.selected {
    background: var(--vscode-list-activeSelectionBackground);
    color: var(--vscode-list-activeSelectionForeground);
}

.tree-item.dimmed {
    opacity: 0.35;
}

.tree-item.keyboard-focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: -1px;
}

.tree-item[data-dir] {
    background: var(--vscode-sideBarSectionHeader-background, rgba(128,128,128,0.08));
}

.tree-item[data-dir]:hover {
    background: var(--vscode-list-hoverBackground);
}

.tree-indent {
    display: inline-block;
    width: 16px;
    flex-shrink: 0;
}

.tree-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: var(--vscode-foreground);
    font-size: 10px;
}

.tree-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin-right: 4px;
}

.tree-label {
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    padding-right: 4px;
}

.tree-label mark {
    background: var(--vscode-editor-findMatchHighlightBackground, rgba(255,255,0,0.3));
    color: inherit;
    border-radius: 2px;
}
</style>
</head>
<body>
<div id="search-bar">
    <input id="search" type="text" placeholder="ファイル名を検索..." autocomplete="off" spellcheck="false">
</div>
<div id="tree-container">
    <div id="tree"></div>
</div>

<script nonce="${nonce}">
(function() {
    const vscode = acquireVsCodeApi();
    const treeData = ${treeJson};
    const treeEl = document.getElementById('tree');
    const searchInput = document.getElementById('search');

    // 全ディレクトリを収集し、保存済み状態とすり合わせて初期化
    // 保存済みにないフォルダは true（展開）、存在しないパスは除去
    const allDirs = new Set();
    collectAllDirs(treeData, allDirs);
    const persisted = ${savedJson};
    let openState = {};
    for (const p of allDirs) {
        openState[p] = persisted.hasOwnProperty(p) ? persisted[p] : true;
    }
    // 検索前の開閉状態を保存
    let savedOpenState = null;

    let currentQuery = '';
    let selectedPath = null;

    // -------------------------------------------------------
    // ユーティリティ
    // -------------------------------------------------------

    /** ノードのフルパスをキーにする文字列 */
    function nodeKey(node) { return node.fullPath; }

    /** ツリー内の全ディレクトリのパスを収集 */
    function collectAllDirs(nodes, result) {
        for (const n of nodes) {
            if (n.isDir) {
                result.add(n.fullPath);
                if (n.children) collectAllDirs(n.children, result);
            }
        }
    }

    /** クエリにマッチするmdファイルを持つディレクトリパスのセットを返す */
    function findMatchingAncestors(nodes, query, result) {
        let found = false;
        for (const n of nodes) {
            if (n.isDir) {
                const childFound = findMatchingAncestors(n.children || [], query, result);
                if (childFound) {
                    result.add(n.fullPath);
                    found = true;
                }
            } else {
                if (n.name.toLowerCase().includes(query)) {
                    found = true;
                }
            }
        }
        return found;
    }

    /** テキストのマッチ部分をハイライト */
    function highlightMatch(text, query) {
        if (!query) return escHtml(text);
        const idx = text.toLowerCase().indexOf(query);
        if (idx < 0) return escHtml(text);
        return escHtml(text.slice(0, idx))
            + '<mark>' + escHtml(text.slice(idx, idx + query.length)) + '</mark>'
            + escHtml(text.slice(idx + query.length));
    }

    function escHtml(s) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // -------------------------------------------------------
    // レンダリング
    // -------------------------------------------------------

    function renderTree(nodes, depth, query, ancestorPaths) {
        let html = '';
        for (const node of nodes) {
            const indent = depth * 16;
            const isOpen = !!openState[nodeKey(node)];
            const isSelected = node.fullPath === selectedPath;

            if (node.isDir) {
                const toggle = isOpen ? '-' : '+';
                // 検索中: マッチ子孫がいないフォルダは薄くする
                const dimmed = query && !ancestorPaths.has(node.fullPath) ? ' dimmed' : '';
                html += '<div class="tree-item' + dimmed + (isSelected ? ' selected' : '') + '"'
                    + ' data-path="' + escHtml(node.fullPath) + '" data-dir="1"'
                    + ' style="padding-left:' + indent + 'px">'
                    + '<span class="tree-toggle">' + toggle + '</span>'
                    + '<span class="tree-label">' + escHtml(node.name) + '</span>'
                    + '</div>';
                if (isOpen && node.children) {
                    html += renderTree(node.children, depth + 1, query, ancestorPaths);
                }
            } else {
                const matches = !query || node.name.toLowerCase().includes(query);
                // 検索中で非マッチのファイルは表示しない
                if (query && !matches) continue;
                const dimCls = isSelected ? ' selected' : '';
                html += '<div class="tree-item' + dimCls + '"'
                    + ' data-path="' + escHtml(node.fullPath) + '"'
                    + ' style="padding-left:' + indent + 'px">'
                    + '<span class="tree-toggle"></span>'
                    + '<span class="tree-label">' + highlightMatch(node.name, query) + '</span>'
                    + '</div>';
            }
        }
        return html;
    }

    function render() {
        const focusedPath = treeEl.querySelector('.tree-item.keyboard-focus')?.dataset.path;
        const query = currentQuery;
        let ancestorPaths = new Set();
        if (query) {
            findMatchingAncestors(treeData, query, ancestorPaths);
        }
        const html = renderTree(treeData, 0, query, ancestorPaths);
        treeEl.innerHTML = html || '<div class="empty-msg">ファイルが見つかりません</div>';
        if (focusedPath) {
            const el = treeEl.querySelector('.tree-item[data-path="' + CSS.escape(focusedPath) + '"]');
            if (el) { el.classList.add('keyboard-focus'); el.scrollIntoView({ block: 'nearest' }); }
        }
    }

    // -------------------------------------------------------
    // イベント
    // -------------------------------------------------------

    function getVisibleItems() {
        return Array.from(treeEl.querySelectorAll('.tree-item'));
    }

    function activateItem(item) {
        const p = item.dataset.path;
        const isDir = !!item.dataset.dir;
        if (isDir) {
            openState[p] = !openState[p];
            if (savedOpenState) {
                savedOpenState[p] = openState[p];
            }
            vscode.postMessage({ command: 'openStateChanged', openState: Object.assign({}, openState) });
        } else {
            selectedPath = p;
            vscode.postMessage({ command: 'open', path: p });
        }
        render();
    }

    function moveSelection(dir) {
        const items = getVisibleItems();
        if (items.length === 0) return;
        const current = treeEl.querySelector('.tree-item.keyboard-focus');
        const idx = current ? items.indexOf(current) : -1;
        const next = items[Math.max(0, Math.min(items.length - 1, idx + dir))];
        items.forEach(el => el.classList.remove('keyboard-focus'));
        next.classList.add('keyboard-focus');
        next.scrollIntoView({ block: 'nearest' });
    }

    treeEl.addEventListener('click', (e) => {
        const item = e.target.closest('.tree-item');
        if (!item) return;
        getVisibleItems().forEach(el => el.classList.remove('keyboard-focus'));
        item.classList.add('keyboard-focus');
        activateItem(item);
        searchInput.focus();
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            moveSelection(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            moveSelection(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            const focused = treeEl.querySelector('.tree-item.keyboard-focus');
            if (!focused) return;
            if (focused.dataset.dir) {
                const p = focused.dataset.path;
                if (!openState[p]) {
                    openState[p] = true;
                    if (savedOpenState) savedOpenState[p] = true;
                    vscode.postMessage({ command: 'openStateChanged', openState: Object.assign({}, openState) });
                    render();
                } else {
                    moveSelection(1);
                }
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const focused = treeEl.querySelector('.tree-item.keyboard-focus');
            if (!focused) return;
            const p = focused.dataset.path;
            if (focused.dataset.dir && openState[p]) {
                openState[p] = false;
                if (savedOpenState) savedOpenState[p] = false;
                vscode.postMessage({ command: 'openStateChanged', openState: Object.assign({}, openState) });
                render();
            } else {
                moveSelection(-1);
            }
        } else if (e.key === 'Enter' || e.key === ' ') {
            const focused = treeEl.querySelector('.tree-item.keyboard-focus');
            if (focused) { e.preventDefault(); activateItem(focused); }
        }
    });

    searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        if (!currentQuery && q) {
            // 検索開始: 現在の開閉状態を保存
            savedOpenState = Object.assign({}, openState);
        }
        if (currentQuery && !q) {
            // 検索終了: 保存した開閉状態を復元
            if (savedOpenState !== null) {
                openState = savedOpenState;
                savedOpenState = null;
            }
        }
        currentQuery = q;
        if (q) {
            // マッチするファイルを持つフォルダを自動展開
            const ancestors = new Set();
            findMatchingAncestors(treeData, q, ancestors);
            for (const p of ancestors) {
                openState[p] = true;
            }
        }
        render();
    });

    // 外部からのリフレッシュ要求
    window.addEventListener('message', (event) => {
        const msg = event.data;
        if (msg.command === 'refresh') {
            // 開閉状態を維持したまま再レンダリング（ツリーデータは同じ）
            render();
        }
    });

    render();
})();
</script>
</body>
</html>`;
}

const OPEN_STATE_KEY = 'memoExplorer.openState';

export class MemoExplorerProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'memoExplorer.view';

    private _view?: vscode.WebviewView;
    private _memoDir: string = '';
    private _currentOpenState: Record<string, boolean> = {};

    constructor(private readonly _context: vscode.ExtensionContext) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [],
        };

        webviewView.webview.onDidReceiveMessage(
            (message: { command: string; path: string; openState?: Record<string, boolean> }) => {
                if (message.command === 'open') {
                    const uri = vscode.Uri.file(message.path);
                    vscode.window.showTextDocument(uri, { preserveFocus: true });
                } else if (message.command === 'openStateChanged' && message.openState) {
                    this._currentOpenState = message.openState;
                }
            },
            undefined,
            this._context.subscriptions,
        );

        webviewView.onDidDispose(() => {
            this._context.globalState.update(OPEN_STATE_KEY, this._currentOpenState);
        }, undefined, this._context.subscriptions);

        this._refresh();

        // 設定変更を監視
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('vscode-stand.memoDir')) {
                this._refresh();
            }
        }, undefined, this._context.subscriptions);
    }

    /** ビューを再読み込みする（外部から呼び出し可能） */
    public refresh(): void {
        this._refresh();
    }

    private _refresh(): void {
        if (!this._view) return;

        const config = vscode.workspace.getConfiguration('vscode-stand');
        this._memoDir = config.get<string>('memoDir', '');

        if (!this._memoDir) {
            this._view.webview.html = this._buildEmptyHtml('memoDir が設定されていません');
            return;
        }

        if (!path.isAbsolute(this._memoDir)) {
            this._view.webview.html = this._buildEmptyHtml(`memoDir にはフルパスを指定してください:\n${this._memoDir}`);
            return;
        }

        if (!fs.existsSync(this._memoDir)) {
            this._view.webview.html = this._buildEmptyHtml(`フォルダが存在しません:\n${this._memoDir}`);
            return;
        }

        const tree = buildTree(this._memoDir);
        const saved = this._context.globalState.get<Record<string, boolean>>(OPEN_STATE_KEY, {});
        this._view.webview.html = buildHtml(this._view.webview, tree, saved);
    }

    private _buildEmptyHtml(message: string): string {
        const nonce = getNonce();
        return /* html */`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}';">
<style nonce="${nonce}">
body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size);
    color: var(--vscode-descriptionForeground); padding: 12px; }
</style>
</head>
<body>${message.replace(/\n/g, '<br>')}</body>
</html>`;
    }
}
