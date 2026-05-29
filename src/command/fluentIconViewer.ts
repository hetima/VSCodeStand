import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const FONT_FAMILY = '"Segoe Fluent Icons", "Segoe MDL2 Assets"';

interface IconEntry {
    Code: string;
    Name: string;
    Tags: string[];
}

/** Webview 用 HTML を生成する */
function buildHtml(webview: vscode.Webview, icons: IconEntry[]): string {
    // </script> がJSON内にあるとスクリプトブロックが早期終了するためエスケープ
    const iconsJson = JSON.stringify(icons).replace(/</g, '\\u003c');
    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fluent Icon Viewer</title>
<style nonce="${nonce}">
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
}

/* ヘッダ */
#header {
    padding: 10px 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
}

#header h1 {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
}

#search {
    flex: 1;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    padding: 4px 8px;
    outline: none;
    font-size: var(--vscode-font-size);
    font-family: var(--vscode-font-family);
}

#search:focus {
    border-color: var(--vscode-focusBorder);
}

#count {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
}

/* アイコングリッド */
#grid-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
}

#grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 8px;
}

.icon-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 4px 6px;
    border: 1px solid transparent;
    cursor: default;
    border-radius: 4px;
    overflow: hidden;
}

.icon-card:hover {
    background: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-list-hoverBackground);
}

.icon-card.selected {
    background: var(--vscode-list-activeSelectionBackground);
    color: var(--vscode-list-activeSelectionForeground);
    border-color: var(--vscode-focusBorder);
}

.icon-glyph {
    font-family: ${FONT_FAMILY};
    font-size: 24px;
    line-height: 1.2;
    height: 30px;
    display: flex;
    align-items: center;
}

.icon-name {
    font-size: 11px;
    text-align: center;
    word-break: break-all;
    line-height: 1.3;
    margin-top: 4px;
    color: var(--vscode-descriptionForeground);
    max-height: 2.6em;
    overflow: hidden;
}

.icon-card.selected .icon-name {
    color: var(--vscode-list-activeSelectionForeground);
}

/* 詳細パネル */
#detail {
    border-top: 1px solid var(--vscode-panel-border);
    padding: 8px 16px;
    font-size: 12px;
    min-height: 48px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 16px;
    color: var(--vscode-descriptionForeground);
}

#detail .detail-glyph {
    font-family: ${FONT_FAMILY};
    font-size: 28px;
}

#detail .detail-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

#detail .detail-name {
    font-weight: 600;
    color: var(--vscode-foreground);
    font-size: 13px;
}

#detail .detail-tags {
    color: var(--vscode-descriptionForeground);
}

#detail .detail-copies {
    display: flex;
    gap: 8px;
    margin-top: 2px;
}

.copy-chip {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    padding: 2px 7px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 3px;
    cursor: pointer;
    user-select: none;
}

.copy-chip:hover {
    opacity: 0.8;
}
</style>
</head>
<body>
<div id="header">
    <h1>Fluent Icon Viewer</h1>
    <input id="search" type="text" placeholder="Search by name or tag..." autocomplete="off" spellcheck="false">
    <span id="count"></span>
</div>
<div id="grid-container">
    <div id="grid"></div>
</div>
<div id="detail">
    <span style="color: var(--vscode-descriptionForeground);">アイコンをクリックして詳細を表示</span>
</div>

<script nonce="${nonce}">
(function() {
    const vscode = acquireVsCodeApi();
    const icons = ${iconsJson};
    const grid = document.getElementById('grid');
    const searchInput = document.getElementById('search');
    const countEl = document.getElementById('count');
    const detailEl = document.getElementById('detail');

    let selectedCard = null;

    function codeToChar(hex) {
        try {
            return String.fromCodePoint(parseInt(hex, 16));
        } catch {
            return '?';
        }
    }

    function renderGrid(filtered) {
        grid.innerHTML = '';
        filtered.forEach(icon => {
            const card = document.createElement('div');
            card.className = 'icon-card';
            card.dataset.code = icon.Code;

            const glyph = document.createElement('div');
            glyph.className = 'icon-glyph';
            glyph.textContent = codeToChar(icon.Code);

            const name = document.createElement('div');
            name.className = 'icon-name';
            name.textContent = icon.Name;

            card.appendChild(glyph);
            card.appendChild(name);

            card.addEventListener('click', () => selectCard(card, icon));
            grid.appendChild(card);
        });
        countEl.textContent = filtered.length + ' / ' + icons.length;
    }

    function selectCard(card, icon) {
        if (selectedCard) {
            selectedCard.classList.remove('selected');
        }
        selectedCard = card;
        card.classList.add('selected');

        const hexRef = '&#x' + icon.Code + ';';
        const unicodeEsc = '\\\\u' + icon.Code;

        detailEl.innerHTML =
            '<span class="detail-glyph">' + codeToChar(icon.Code) + '</span>' +
            '<div class="detail-info">' +
                '<span class="detail-name">U+' + icon.Code + ' &nbsp; ' + escHtml(icon.Name) + '</span>' +
                '<span class="detail-tags">' + icon.Tags.map(escHtml).join(', ') + '</span>' +
                '<div class="detail-copies">' +
                    '<span class="copy-chip" data-copy="' + escHtml(hexRef) + '">' + escHtml(hexRef) + '</span>' +
                    '<span class="copy-chip" data-copy="' + escHtml(unicodeEsc) + '">' + escHtml(unicodeEsc) + '</span>' +
                '</div>' +
            '</div>';

        detailEl.querySelectorAll('.copy-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const text = chip.getAttribute('data-copy');
                vscode.postMessage({ command: 'copy', text });
            });
        });
    }

    function escHtml(s) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function filter() {
        const q = searchInput.value.trim().toLowerCase();
        if (!q) {
            renderGrid(icons);
            return;
        }
        const words = q.split(/\s+/);
        const result = icons.filter(icon => {
            const name = icon.Name.toLowerCase();
            const tags = icon.Tags.map(t => t.toLowerCase());
            return words.every(w =>
                name.includes(w) || tags.some(t => t.includes(w))
            );
        });
        renderGrid(result);
    }

    searchInput.addEventListener('input', filter);

    renderGrid(icons);
})();
</script>
</body>
</html>`;
}

function getNonce(): string {
    let text = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}

/** 「stand: Fluent Icon Viewer」コマンドを登録する */
export function registerFluentIconViewerCommand(context: vscode.ExtensionContext): void {
    const cmd = vscode.commands.registerCommand('vscode-stand.fluentIconViewer', () => {
        const dataPath = path.join(context.extensionPath, 'resources', 'FluentIconsData.json');
        let icons: IconEntry[];
        try {
            icons = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as IconEntry[];
        } catch (e) {
            vscode.window.showErrorMessage(`FluentIconsData.json の読み込みに失敗しました: ${e}`);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'fluentIconViewer',
            'Fluent Icon Viewer',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [],
            }
        );

        panel.webview.html = buildHtml(panel.webview, icons);

        panel.webview.onDidReceiveMessage(
            (message: { command: string; text: string }) => {
                if (message.command === 'copy') {
                    vscode.env.clipboard.writeText(message.text).then(() => {
                        vscode.window.showInformationMessage(`コピーしました: ${message.text}`);
                    });
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(cmd);
}
