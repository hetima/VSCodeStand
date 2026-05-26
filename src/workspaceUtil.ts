import * as path from 'path';
import * as vscode from 'vscode';

export async function resolveWorkspaceMainFolder(): Promise<vscode.WorkspaceFolder | undefined> {
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

export function resolveDir(baseDir: string, folderName: string, folderPath: string): string {
	if (!baseDir || baseDir === '.') {
		return folderPath;
	} else if (path.isAbsolute(baseDir)) {
		return path.join(baseDir, folderName);
	} else {
		return path.join(folderPath, baseDir);
	}
}
