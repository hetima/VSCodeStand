import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { resolveDir, resolveWorkspaceMainFolder } from '../workspaceUtil';

export async function convertToWorkspaceCommand() {
	if (vscode.workspace.workspaceFile) {
		vscode.window.showErrorMessage(vscode.l10n.t('A workspace is already open'));
		return;
	}

	const mainFolder = await resolveWorkspaceMainFolder();
	if (!mainFolder) {
		return;
	}

	const config = vscode.workspace.getConfiguration('vscode-stand');
	const workspaceDir = config.get<string>('workspaceDir', '');
	const memoDir = config.get<string>('memoDir', '');

	let mode: 'just' | 'withMemo';

	if (path.isAbsolute(memoDir)) {
		const picked = await vscode.window.showQuickPick(
			[
				{
					label: vscode.l10n.t('Just Convert'),
					description: vscode.l10n.t('Add current folder only'),
					value: 'just' as const,
				},
				{
					label: vscode.l10n.t('Add Memo Folder'),
					description: vscode.l10n.t('Add current folder and memo folder'),
					value: 'withMemo' as const,
				},
			],
			{ title: vscode.l10n.t('Convert to Workspace') }
		);
		if (!picked) {
			return;
		}
		mode = picked.value;
	} else {
		mode = 'just';
	}

	const resolvedWorkspaceDir = resolveDir(workspaceDir, mainFolder.name, mainFolder.uri.fsPath);
	const workspaceFilePath = path.join(resolvedWorkspaceDir, `${mainFolder.name}.code-workspace`);

	const folders: { path: string }[] = [{ path: mainFolder.uri.fsPath }];

	if (mode === 'withMemo') {
		const memoDirResolved = path.join(memoDir, mainFolder.name);
		if (!fs.existsSync(memoDirResolved)) {
			fs.mkdirSync(memoDirResolved, { recursive: true });
		}
		folders.push({ path: memoDirResolved, name: 'Memo' } as { path: string; name?: string });
	}

	const workspaceContent = {
		folders,
		settings: {
			'vscode-stand.workspaceMainFolder': mainFolder.name,
			'terminal.integrated.cwd': mainFolder.uri.fsPath,
		},
	};

	if (fs.existsSync(workspaceFilePath)) {
		vscode.window.showErrorMessage(vscode.l10n.t('.code-workspace file already exists'));
		return;
	}

	fs.mkdirSync(path.dirname(workspaceFilePath), { recursive: true });
	fs.writeFileSync(workspaceFilePath, JSON.stringify(workspaceContent, null, '\t') + '\n');

	const doc = await vscode.workspace.openTextDocument(workspaceFilePath);
	await vscode.window.showTextDocument(doc);
}
