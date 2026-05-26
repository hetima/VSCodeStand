import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

async function resolveWorkspaceMainFolder(): Promise<vscode.WorkspaceFolder | undefined> {
	const folders = vscode.workspace.workspaceFolders;
	if (!folders || folders.length === 0) {
		vscode.window.showErrorMessage(vscode.l10n.t('No workspace is open'));
		return undefined;
	}
	if (folders.length === 1) {
		return folders[0];
	}

	const config = vscode.workspace.getConfiguration('vscode-stand');
	const savedName = config.get<string>('workspaceMainFolder', '');
	if (savedName) {
		const found = folders.find(f => f.name === savedName);
		if (found) {
			return found;
		}
	}

	const picked = await vscode.window.showQuickPick(
		folders.map(f => ({ label: f.name, folder: f })),
		{ title: vscode.l10n.t('Select main folder for this workspace') }
	);
	if (!picked) {
		return undefined;
	}

	await config.update('workspaceMainFolder', picked.folder.name, vscode.ConfigurationTarget.Workspace);
	return picked.folder;
}

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

	let filePath: string;
	if (!memoDir || memoDir === '.') {
		filePath = path.join(mainFolder.uri.fsPath, `${memoName}.md`);
	} else if (path.isAbsolute(memoDir)) {
		filePath = path.join(memoDir, mainFolder.name, `${memoName}.md`);
	} else {
		filePath = path.join(mainFolder.uri.fsPath, memoDir, `${memoName}.md`);
	}

	if (!fs.existsSync(filePath)) {
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, '');
	}

	const doc = await vscode.workspace.openTextDocument(filePath);
	await vscode.window.showTextDocument(doc);
}
