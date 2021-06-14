import * as vscode from 'vscode';
import * as fs from 'fs';
import { join as pathJoin } from 'path';
import { IDataEntry } from './types';

export class Editor {

    private context: vscode.ExtensionContext;
    private config: vscode.WorkspaceConfiguration;
    private panel: vscode.WebviewPanel;
    private path: string;

    private files: string[] = [];
    private data: IDataEntry[] = [];

    constructor(context: vscode.ExtensionContext, config: vscode.WorkspaceConfiguration, panel: vscode.WebviewPanel, path: string) {
        this.context = context;
        this.config = config;
        this.panel = panel;
        this.path = path;

        this.readData();
        this.panel.webview.html = this.renderView();
    }

    readData() {
        let id = 1;

        fs.readdirSync(this.path).filter(f => f.endsWith('.json')).forEach(fileName => {
            const file = fileName.replace('.json', '');
            this.files.push(file);

            try {
                const fileData = JSON.parse(fs.readFileSync(pathJoin(this.path, file + '.json')).toString());

                if (fileData) {
                    const keys = Object.keys(fileData);

                    keys.forEach(key => {
                        const entry = this.data.find(x => x.key === key);

                        if (entry) {
                            entry.values[file] = fileData[key];
                        }
                        else {
                            this.data.push({
                                id: id++,
                                key: key,
                                values: { [file]: fileData[key] }
                            });
                        }
                    });
                }
            }
            catch {
                console.error(`${file} is invalid json`);
            }
        });
    }

    renderView(): string {
        const template = vscode.Uri.file(pathJoin(this.context.extensionPath, 'ui', 'index.html'));
        return fs.readFileSync(template.fsPath).toString();
    }
}