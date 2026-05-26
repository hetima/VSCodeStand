import * as vscode from 'vscode';
import { selectMemoDirCommand } from './command/selectMemoDir';
import { selectWorkspaceDirCommand } from './command/selectWorkspaceDir';

export function activate(context: vscode.ExtensionContext) {

	const selectMemoDirCmd = vscode.commands.registerCommand(
		'extension.selectMemoDir',
		selectMemoDirCommand
	);

	const selectWorkspaceDirCmd = vscode.commands.registerCommand(
		'extension.selectWorkspaceDir',
		selectWorkspaceDirCommand
	);

	context.subscriptions.push(selectMemoDirCmd, selectWorkspaceDirCmd);
}
