import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { resolveDir, resolveWorkspaceMainFolder } from '../workspaceUtil';

export async function newMemoCommand() {
	const mainFolder = await resolveWorkspaceMainFolder();
	if (!mainFolder) {
		return;
	}

	const memoName = await vscode.window.showInputBox({
		title: vscode.l10n.t('New Memo'),
		prompt: vscode.l10n.t('Enter memo name'),
	});
	if (!memoName) {
		return;
	}

	const config = vscode.workspace.getConfiguration('vscode-stand');
	const memoDir = config.get<string>('memoDir', '');

	const safeFileName = memoName.replace(/[\\/:*?"<>|]/g, '_');
	const dir = resolveDir(memoDir, mainFolder.name, mainFolder.uri.fsPath);
	const filePath = path.join(dir, `${safeFileName}.md`);

	if (!fs.existsSync(filePath)) {
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, `# ${memoName}\n`);
	}

	const doc = await vscode.workspace.openTextDocument(filePath);
	await vscode.window.showTextDocument(doc);
}
