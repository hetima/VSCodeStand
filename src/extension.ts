import * as vscode from 'vscode';
import { closeAllExceptMdCommand } from './command/closeAllExceptMd';
import { convertToWorkspaceCommand } from './command/convertToWorkspace';
import { activateFluentIconPreview } from './command/fluentIconPreview';
import { registerFluentIconViewerCommand } from './command/fluentIconViewer';
import { FilePickerProvider } from './command/filePicker';
import { MemoExplorerProvider } from './command/memoExplorer';
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

	const newMemoFromSelectionCmd = vscode.commands.registerCommand(
		'extension.newMemoFromSelection',
		newMemoCommand
	);

	const convertToWorkspaceCmd = vscode.commands.registerCommand(
		'extension.convertToWorkspace',
		convertToWorkspaceCommand
	);

	const closeAllExceptMdCmd = vscode.commands.registerCommand(
		'extension.closeAllExceptMd',
		closeAllExceptMdCommand
	);

	context.subscriptions.push(selectMemoDirCmd, selectWorkspaceDirCmd, newMemoCmd, newMemoFromSelectionCmd, convertToWorkspaceCmd, closeAllExceptMdCmd);

	activateFluentIconPreview(context);
	registerFluentIconViewerCommand(context);

	const retainContext = { webviewOptions: { retainContextWhenHidden: true } };

	const memoExplorerProvider = new MemoExplorerProvider(context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(MemoExplorerProvider.viewType, memoExplorerProvider, retainContext)
	);

	const filePickerProvider = new FilePickerProvider(context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(FilePickerProvider.viewType, filePickerProvider, retainContext)
	);
}
