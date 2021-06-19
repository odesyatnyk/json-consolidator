import * as vscode from 'vscode';
import * as fs from 'fs';
import { join as pathJoin } from 'path';
import { IDataEntry, ICommand, Errors, IValidationResult } from './types';
import { SAVE_ERROR, SAVE_SUCCESS } from './messages';

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
        this.bindCommands();
        this.panel.webview.html = this.renderView();
    }

    readData() {
        let id = 1;

        this.files = [];
        this.data = [];

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
                                errors: [],
                                values: { [file]: fileData[key] }
                            });
                        }
                    });
                }
            }
            catch {
                vscode.window.showErrorMessage(`Failed to parse ${fileName}`);
            }
        });
    }

    renderView(): string {
        const template = vscode.Uri.file(pathJoin(this.context.extensionPath, 'ui', 'index.html'));
        return fs.readFileSync(template.fsPath).toString();
    }

    bindCommands() {
        this.panel.webview.onDidReceiveMessage((message: ICommand) => {
            switch (message.command) {
                case 'refresh':
                    this.refreshData();
                    return;
                case 'saveAll':
                    this.saveAll(message.data);
                    return;
                }
            });
    }

    refreshData() {
        this.readData();

        this.send({
            command: 'populateData',
            data: {
                files: this.files,
                items: this.data.map(i => { return {
                    id: i.id,
                    key: i.key,
                    originalKey: i.key,
                    errors: i.errors,
                    ...i.values
                };
            })
            }
        });
    }

    saveAll(items: IDataEntry[]) {
        const errors = this.validate(items);

        if (errors.length > 0)
        {
            this.send({
                command: 'showErrors',
                data: { errors }
            });

            vscode.window.showErrorMessage(SAVE_ERROR);
        }
        else {
            this.proceedSave(items);
            this.refreshData();
            vscode.window.showInformationMessage(SAVE_SUCCESS);
        }
    }

    validate(items: IDataEntry[]): IValidationResult[] {
        let errors: IValidationResult[] = [];

        errors = items.filter(x => x.key === undefined || x.key === null || x.key === '')
            .map(x => {return {...x, errors: [ Errors.emptyKey ]};});;
        
        items.forEach(x => {
            const dup = items.filter(y => !errors.some(d => d.key === x.key) && y.key === x.key && y.id !== x.id)
                .map(x => {return {...x, errors: [ Errors.duplicatedKey ]};});

            if (dup.length > 0) {
                errors = [...errors, ...dup, ...[x]];
            }
        });
        
        return errors;
    }

    proceedSave(items: IDataEntry[]) {
        
    }

    private send(command: ICommand) {
        this.panel.webview.postMessage(command);
    }
}