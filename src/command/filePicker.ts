import * as path from 'path';
import * as vscode from 'vscode';

interface FileNode {
    name: string;
    fullPath: string;
    isDir: boolean;
    children?: FileNode[];
}

/** URIのリストからフォルダ階層ツリーを構築 */
function buildTreeFromUris(uris: vscode.Uri[]): FileNode[] {
    // フォルダパス → FileNode のマップ
    const dirMap = new Map<string, FileNode>();

    function getOrCreateDir(dirPath: string): FileNode {
        if (dirMap.has(dirPath)) {
            return dirMap.get(dirPath)!;
        }
        const node: FileNode = {
            name: path.basename(dirPath),
            fullPath: dirPath,
            isDir: true,
            children: [],
        };
        dirMap.set(dirPath, node);
        return node;
    }

    const roots: FileNode[] = [];
    // ワークスペースルートパスのセット
    const rootPaths = new Set(
        (vscode.workspace.workspaceFolders ?? []).map(f => f.uri.fsPath)
    );

    for (const uri of uris) {
        const filePath = uri.fsPath;
        const dirPath = path.dirname(filePath);
        const fileNode: FileNode = {
            name: path.basename(filePath),
            fullPath: filePath,
            isDir: false,
        };

        if (rootPaths.has(dirPath)) {
            roots.push(fileNode);
        } else {
            const dir = getOrCreateDir(dirPath);
            dir.children!.push(fileNode);
        }
    }

    // ディレクトリを親に接続
    for (const [dirPath, dirNode] of dirMap) {
        const parentPath = path.dirname(dirPath);
        if (rootPaths.has(parentPath)) {
            roots.push(dirNode);
        } else {
            const parent = getOrCreateDir(parentPath);
            if (!parent.children!.includes(dirNode)) {
                parent.children!.push(dirNode);
            }
        }
    }

    function sortNodes(nodes: FileNode[]): FileNode[] {
        nodes.sort((a, b) => {
            if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        for (const n of nodes) {
            if (n.children) sortNodes(n.children);
        }
        return nodes;
    }

    // rootsのうちトップレベルの親だけ残す（子として登録済みのものを除外）
    const childDirPaths = new Set<string>();
    for (const [, dirNode] of dirMap) {
        for (const child of dirNode.children ?? []) {
            if (child.isDir) childDirPaths.add(child.fullPath);
        }
    }
    const topRoots = roots.filter(n => !childDirPaths.has(n.fullPath));

    return sortNodes(topRoots);
}

function getNonce(): string {
    let text = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}

function buildHtml(_webview: vscode.Webview, tree: FileNode[] | null): string {
    const treeJson = tree ? JSON.stringify(tree).replace(/</g, '\\u003c') : 'null';
    const msgSearch = vscode.l10n.t('Search to find files');
    const msgNotFound = vscode.l10n.t('No files found');
    const msgPlaceholder = vscode.l10n.t('Search files...');
    const nonce = getNonce();

    return /* html */`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>File Picker</title>
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

body[data-navigating] #search:focus {
    border-color: var(--vscode-input-border, transparent);
    caret-color: transparent;
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

.tree-indent {
    display: inline-block;
    width: 4px;
    flex-shrink: 0;
}

.tree-item:hover {
    background: var(--vscode-list-hoverBackground);
}

.tree-item.selected {
    background: var(--vscode-list-activeSelectionBackground);
    color: var(--vscode-list-activeSelectionForeground);
}

.tree-item[data-dir] {
    background: var(--vscode-sideBarSectionHeader-background, rgba(128,128,128,0.08));
}

.tree-item[data-dir]:hover {
    background: var(--vscode-list-hoverBackground);
}

.tree-item.keyboard-focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: -1px;
}

.tree-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    font-size: 14px;
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
    <input id="search" type="text" placeholder="${msgPlaceholder}" autocomplete="off" spellcheck="false">
</div>
<div id="tree-container">
    <div id="tree"></div>
</div>

<script nonce="${nonce}">
(function() {
    const vscode = acquireVsCodeApi();
    const treeEl = document.getElementById('tree');
    const searchInput = document.getElementById('search');

    const MSG_SEARCH = ${JSON.stringify(msgSearch)};
    const MSG_NOT_FOUND = ${JSON.stringify(msgNotFound)};
    let treeData = ${treeJson};
    let openState = {};
    let selectedPath = null;

    // -------------------------------------------------------
    // ユーティリティ
    // -------------------------------------------------------

    function collectAllDirs(nodes, result) {
        for (const n of nodes) {
            if (n.isDir) {
                result.add(n.fullPath);
                if (n.children) collectAllDirs(n.children, result);
            }
        }
    }

    function initOpenState(nodes) {
        const dirs = new Set();
        collectAllDirs(nodes, dirs);
        openState = {};
        for (const p of dirs) { openState[p] = true; }
    }

    function escHtml(s) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function highlightMatch(text, query) {
        if (!query) return escHtml(text);
        const idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx < 0) return escHtml(text);
        return escHtml(text.slice(0, idx))
            + '<mark>' + escHtml(text.slice(idx, idx + query.length)) + '</mark>'
            + escHtml(text.slice(idx + query.length));
    }

    // -------------------------------------------------------
    // レンダリング
    // -------------------------------------------------------

    function renderTree(nodes, depth) {
        let html = '';
        for (const node of nodes) {
            const indentHtml = '<span class="tree-indent"></span>'.repeat(depth);
            const isOpen = !!openState[node.fullPath];
            const isSelected = node.fullPath === selectedPath;

            if (node.isDir) {
                const toggle = isOpen ? '-' : '+';
                html += '<div class="tree-item' + (isSelected ? ' selected' : '') + '"'
                    + ' data-path="' + escHtml(node.fullPath) + '" data-dir="1">'
                    + indentHtml
                    + '<span class="tree-toggle">' + toggle + '</span>'
                    + '<span class="tree-label">' + escHtml(node.name) + '</span>'
                    + '</div>';
                if (isOpen && node.children) {
                    html += renderTree(node.children, depth + 1);
                }
            } else {
                html += '<div class="tree-item' + (isSelected ? ' selected' : '') + '"'
                    + ' data-path="' + escHtml(node.fullPath) + '">'
                    + indentHtml
                    + '<span class="tree-toggle"></span>'
                    + '<span class="tree-label">' + highlightMatch(node.name, searchInput.value.trim()) + '</span>'
                    + '</div>';
            }
        }
        return html;
    }

    function render() {
        const focusedPath = treeEl.querySelector('.tree-item.keyboard-focus')?.dataset.path;
        if (!treeData) {
            treeEl.innerHTML = '<div class="empty-msg">' + MSG_SEARCH + '</div>';
            return;
        }
        if (treeData.length === 0) {
            treeEl.innerHTML = '<div class="empty-msg">' + MSG_NOT_FOUND + '</div>';
            return;
        }
        treeEl.innerHTML = renderTree(treeData, 0);
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
        document.body.setAttribute('data-navigating', '1');
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
            treeData = null;
            render();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            moveSelection(e.shiftKey ? -1 : 1);
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
                render();
            } else {
                moveSelection(-1);
            }
        } else if (e.key === 'Enter' || e.key === ' ') {
            const focused = treeEl.querySelector('.tree-item.keyboard-focus');
            if (focused) { e.preventDefault(); activateItem(focused); }
        }
    });

    searchInput.addEventListener('click', () => {
        document.body.removeAttribute('data-navigating');
    });

    let debounceTimer = null;
    searchInput.addEventListener('input', () => {
        document.body.removeAttribute('data-navigating');
        const q = searchInput.value.trim();
        if (!q) {
            treeData = null;
            render();
            return;
        }
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            vscode.postMessage({ command: 'search', query: q });
        }, 200);
    });

    // TypeScript側からの結果受信
    window.addEventListener('message', (event) => {
        const msg = event.data;
        if (msg.command === 'searchResult') {
            treeData = msg.tree;
            if (treeData) initOpenState(treeData);
            render();
        } else if (msg.command === 'focusSearch') {
            searchInput.focus();
        }
    });

    render();
})();
</script>
</body>
</html>`;
}

export class FilePickerProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'filePicker.view';

    private _view?: vscode.WebviewView;

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
            async (message: { command: string; path?: string; query?: string }) => {
                if (message.command === 'open' && message.path) {
                    const uri = vscode.Uri.file(message.path);
                    vscode.window.showTextDocument(uri, { preserveFocus: true });
                } else if (message.command === 'search' && message.query) {
                    const tree = await this._search(message.query);
                    this._view?.webview.postMessage({ command: 'searchResult', tree });
                }
            },
            undefined,
            this._context.subscriptions,
        );

        this._view.webview.html = buildHtml(webviewView.webview, null);

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this._view?.webview.postMessage({ command: 'focusSearch' });
            }
        }, undefined, this._context.subscriptions);
    }

    private async _search(query: string): Promise<FileNode[]> {
        const pattern = `**/*${query}*`;
        const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 100);
        if (uris.length === 0) return [];
        return buildTreeFromUris(uris);
    }
}
