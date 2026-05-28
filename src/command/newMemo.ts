import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { resolveDir, resolveWorkspaceMainFolder } from '../workspaceUtil';

export async function newMemoCommand() {
	const mainFolder = await resolveWorkspaceMainFolder();
	if (!mainFolder) {
		return;
	}

	const editor = vscode.window.activeTextEditor;
	const selectedText = editor && !editor.selection.isEmpty
		? editor.document.getText(editor.selection)
		: '';

	// 先頭の空白・改行をスキップして markdown ヘッダを探す
	const headingMatch = selectedText.match(/^[\s\n]*#+\s+(.+)/);
	let memoName: string;
	if (headingMatch) {
		memoName = headingMatch[1].trim();
	} else {
		const input = await vscode.window.showInputBox({
			title: vscode.l10n.t('New Memo'),
			prompt: vscode.l10n.t('Enter memo name'),
		});
		if (!input) {
			return;
		}
		memoName = input;
	}

	const config = vscode.workspace.getConfiguration('vscode-stand');
	const memoDir = config.get<string>('memoDir', '');
	const eol = config.get<string>('memoEol', 'LF') === 'CRLF' ? '\r\n' : '\n';

	// 選択テキストの改行コードを設定値に統一
	const normalizedText = selectedText.replace(/\r\n|\r|\n/g, eol);

	const safeFileName = memoName.replace(/[\\/:*?"<>|]/g, '_');
	const dir = resolveDir(memoDir, mainFolder.name, mainFolder.uri.fsPath);
	const filePath = path.join(dir, `${safeFileName}.md`);

	if (!fs.existsSync(filePath)) {
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		const content = headingMatch
			? `${normalizedText}${eol}`
			: normalizedText
				? `# ${memoName}${eol}${eol}${normalizedText}${eol}`
				: `# ${memoName}${eol}`;
		fs.writeFileSync(filePath, content);
	}

	const doc = await vscode.workspace.openTextDocument(filePath);
	await vscode.window.showTextDocument(doc);
}
