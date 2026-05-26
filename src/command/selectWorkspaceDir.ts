import * as vscode from 'vscode';

export async function selectWorkspaceDirCommand() {
	const result = await vscode.window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		title: vscode.l10n.t('stand: Select Workspace Folder'),
	});

	if (!result || result.length === 0) {
		return;
	}

	const config = vscode.workspace.getConfiguration('vscode-stand');
	await config.update('workspaceDir', result[0].fsPath, vscode.ConfigurationTarget.Global);
}
