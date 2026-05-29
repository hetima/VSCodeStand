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
		'vscode-stand.selectMemoDir',
		selectMemoDirCommand
	);

	const selectWorkspaceDirCmd = vscode.commands.registerCommand(
		'vscode-stand.selectWorkspaceDir',
		selectWorkspaceDirCommand
	);

	const newMemoCmd = vscode.commands.registerCommand(
		'vscode-stand.newMemo',
		newMemoCommand
	);

	const newMemoFromSelectionCmd = vscode.commands.registerCommand(
		'vscode-stand.newMemoFromSelection',
		newMemoCommand
	);

	const convertToWorkspaceCmd = vscode.commands.registerCommand(
		'vscode-stand.convertToWorkspace',
		convertToWorkspaceCommand
	);

	const closeAllExceptMdCmd = vscode.commands.registerCommand(
		'vscode-stand.closeAllExceptMd',
		closeAllExceptMdCommand
	);

	const openStandMemoExplorerCmd = vscode.commands.registerCommand(
    "vscode-stand.openStandMemoExplorer",
    () =>
		vscode.commands.executeCommand(
			"workbench.view.extension.standMemoExplorer",
		),
	);
	
	const openStandFilePickerCmd = vscode.commands.registerCommand(
		"vscode-stand.openStandFilePicker",
		() =>
		vscode.commands.executeCommand(
			"workbench.view.extension.standFilePicker",
		),
  );

	context.subscriptions.push(
    selectMemoDirCmd,
    selectWorkspaceDirCmd,
    newMemoCmd,
    newMemoFromSelectionCmd,
    convertToWorkspaceCmd,
    closeAllExceptMdCmd,
    openStandMemoExplorerCmd,
    openStandFilePickerCmd,
  );

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
