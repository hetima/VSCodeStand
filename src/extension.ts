import * as vscode from 'vscode';
import { newMemoCommand } from './command/newMemo';
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

	const newMemoCmd = vscode.commands.registerCommand(
		'extension.newMemo',
		newMemoCommand
	);

	context.subscriptions.push(selectMemoDirCmd, selectWorkspaceDirCmd, newMemoCmd);
}
