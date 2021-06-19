import * as vscode from 'vscode';
import { join as pathJoin } from 'path';
import { Editor } from './json-consolidator/editor';
import { DONT_SHOW_AGAIN } from './json-consolidator/modalActions';

export function activate(context: vscode.ExtensionContext) {

	const config = vscode.workspace.getConfiguration('json-consolidator');

	const supportedDirectories = config.get<Array<string>>('supportedDirectories');
	const triggerEverywhere = config.get<boolean>('triggerEverywhere');
	const suppressInitNotification = config.get<boolean>('suppressInitNotification');
	const targetEditorWindow = config.get<string>('targetEditorWindow') || 'Two';

	vscode.commands.executeCommand('setContext', 'ext.supportedDirectories', supportedDirectories);
	vscode.commands.executeCommand('setContext', 'ext.triggerEverywhere', triggerEverywhere);

	let disposable = vscode.commands.registerCommand('json-consolidator.editor', (path: vscode.Uri) => {

		const panel = vscode.window.createWebviewPanel('json-consolidator', `Json Consolidator - ${getLastSegment(path)}`,
			getViewColumn(targetEditorWindow),
			{
				retainContextWhenHidden: true,
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(pathJoin(context.extensionPath, 'ui'))]
			});

		const editor = new Editor(context, panel, path.fsPath);
	});

	context.subscriptions.push(disposable);

	if (!suppressInitNotification)
	{
		vscode.window.showInformationMessage('Json Consolidator is ready to rock 🚀', DONT_SHOW_AGAIN)
			.then(action => {
				if (action && action === DONT_SHOW_AGAIN) {
					config.update('suppressInitNotification', true, vscode.ConfigurationTarget.Global);
				}
			});
	}
}

export function deactivate() {}

function getViewColumn(targetEditorWindow: string): vscode.ViewColumn {
	switch (targetEditorWindow) {
		case 'Active':
			return vscode.ViewColumn.Active;
		case 'One':
			return vscode.ViewColumn.One;
		case 'Two':
			return vscode.ViewColumn.Two;
		default:
			return vscode.ViewColumn.Two;
	}
}

function getLastSegment(uri: vscode.Uri): string {
	return uri.path.split('/')?.pop() || '';
}
