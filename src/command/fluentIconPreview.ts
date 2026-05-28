import * as vscode from 'vscode';

const CONFIG_KEY = 'vscode-stand.fluentIconPreview';

// Fluent アイコン用フォント（Windows 11 / Windows 10 のフォールバック付き）
const FONT_FAMILY = '"Segoe Fluent Icons", "Segoe MDL2 Assets"';

// &#xAAAA; / \uAAAA / \xAAAA の3形式を検出し、16進コードポイントを取り出す
const ICON_PATTERN = /&#x([0-9A-Fa-f]{1,6});|\\u([0-9A-Fa-f]{4})|\\x([0-9A-Fa-f]{2,6})/g;
// const ICON_PATTERN = /(?:&#x([0-9A-Fa-f]+);|\\\\x([0-9A-Fa-f]+)|\\\\u([0-9A-Fa-f]{4}))/g;

const UPDATE_DEBOUNCE_MS = 200;

/**
 * 対象ファイル（.cs / .xaml）かどうかを判定する。
 * xaml は言語IDが登録されていない環境もあるため拡張子で判定する。
 */
function isTargetDocument(document: vscode.TextDocument): boolean {
	const name = document.fileName.toLowerCase();
	return (
    name.endsWith(".cs") || name.endsWith(".xaml")
  );
}

/**
 * Fluent Icon Preview を有効化する。
 * 設定が ON の間、対象ファイル中の文字参照パターンの直後にグリフを装飾表示する。
 */
export function activateFluentIconPreview(context: vscode.ExtensionContext) {
	const decorationType = vscode.window.createTextEditorDecorationType({
		after: {
			margin: '0 0 0 0.3em',
			// VSCode の装飾には fontFamily 指定が無いため textDecoration 経由で CSS を注入する
			textDecoration: `none; font-family: ${FONT_FAMILY};`,
		},
	});
	context.subscriptions.push(decorationType);

	let enabled = vscode.workspace.getConfiguration().get<boolean>(CONFIG_KEY, false);

	/** 1エディタ分の装飾を更新する。 */
	function updateDecorations(editor: vscode.TextEditor) {
		if (!enabled || !isTargetDocument(editor.document)) {
			editor.setDecorations(decorationType, []);
			return;
		}

		const text = editor.document.getText();
		const decorations: vscode.DecorationOptions[] = [];
		ICON_PATTERN.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = ICON_PATTERN.exec(text)) !== null) {
			const hex = match[1] ?? match[2] ?? match[3];
			const code = parseInt(hex, 16);
			if (!Number.isFinite(code) || code < 50000 || code > 0x10ffff) {
				continue;
			}
			let glyph: string;
			try {
				glyph = String.fromCodePoint(code);
			} catch {
				continue;
			}
			const range = new vscode.Range(
				editor.document.positionAt(match.index),
				editor.document.positionAt(match.index + match[0].length)
			);
			decorations.push({
				range,
				renderOptions: { after: { contentText: glyph } },
				hoverMessage: `U+${code.toString(16).toUpperCase().padStart(4, '0')}`,
			});
		}
		editor.setDecorations(decorationType, decorations);
	}

	function updateAllVisible() {
		vscode.window.visibleTextEditors.forEach(updateDecorations);
	}

	let timer: NodeJS.Timeout | undefined;
	function scheduleUpdateAll() {
		if (timer) {
			clearTimeout(timer);
		}
		timer = setTimeout(updateAllVisible, UPDATE_DEBOUNCE_MS);
	}

	updateAllVisible();

	context.subscriptions.push(
		vscode.window.onDidChangeVisibleTextEditors(updateAllVisible),
		vscode.workspace.onDidChangeTextDocument((event) => {
			if (vscode.window.visibleTextEditors.some((e) => e.document === event.document)) {
				scheduleUpdateAll();
			}
		}),
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration(CONFIG_KEY)) {
				enabled = vscode.workspace.getConfiguration().get<boolean>(CONFIG_KEY, false);
				updateAllVisible();
			}
		})
	);
}
