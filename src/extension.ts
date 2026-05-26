import * as vscode from 'vscode';
import { selectMemoDirCommand } from './command/selectMemoDir';

export function activate(context: vscode.ExtensionContext) {

	const selectMemoDirCmd = vscode.commands.registerCommand(
		'extension.selectMemoDir',
		selectMemoDirCommand
	);

	context.subscriptions.push(selectMemoDirCmd);
}
