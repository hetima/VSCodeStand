import * as vscode from 'vscode';

export async function selectMemoDirCommand() {
	const result = await vscode.window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		title: vscode.l10n.t('stand: Select Memo Folder'),
	});

	if (!result || result.length === 0) {
		return;
	}

	const config = vscode.workspace.getConfiguration('vscode-stand');
	await config.update('memoDir', result[0].fsPath, vscode.ConfigurationTarget.Global);
}
