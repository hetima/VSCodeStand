import * as vscode from 'vscode';

// ピン留め・MD・未保存以外のタブをすべて閉じる
export async function closeAllExceptMdCommand(): Promise<void> {
    const tabsToClose: vscode.Tab[] = [];

    for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
            if (tab.isPinned || tab.isDirty) {
                continue;
            }
            if (tab.input instanceof vscode.TabInputText) {
                const ext = tab.input.uri.path.split('.').pop()?.toLowerCase();
                if (ext === 'md') {
                    continue;
                }
            }
            tabsToClose.push(tab);
        }
    }

    if (tabsToClose.length > 0) {
        await vscode.window.tabGroups.close(tabsToClose);
    }
}
