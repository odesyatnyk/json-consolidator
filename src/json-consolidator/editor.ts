import * as vscode from 'vscode';
import * as fs from 'fs';
import { join as pathJoin } from 'path';
import { IDataEntry, ICommand, IIndexable, Errors, IValidationResult } from './types';
import { SAVE_ERROR, SAVE_SUCCESS, DATA_RERESHED } from './messages';

const JSON_EX = '.json';
export class Editor {

    private context: vscode.ExtensionContext;
    private panel: vscode.WebviewPanel;
    private path: string;

    private files: string[] = [];
    private data: IDataEntry[] = [];

    constructor(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, path: string) {
        this.context = context;
        this.panel = panel;
        this.path = path;
        this.bindCommands();
        this.panel.webview.html = this.renderView();
    }

    readData() {
        let id = 1;

        this.files = [];
        this.data = [];

        fs.readdirSync(this.path).filter(f => f.endsWith(JSON_EX)).forEach(fileName => {
            const file = fileName.replace(JSON_EX, '');
            this.files.push(file);

            try {
                const fileData = JSON.parse(fs.readFileSync(pathJoin(this.path, file + JSON_EX)).toString());

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
        vscode.window.showInformationMessage(DATA_RERESHED);
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
        const mustOrder = vscode.workspace.getConfiguration('json-consolidator').get<boolean>('orderKeysOnSave');
        const desc = vscode.workspace.getConfiguration('json-consolidator').get<string>('orderKeysDirection') === 'Descending';
        
        const keyComparer = (a: IDataEntry, b: IDataEntry): number => {
            if (a.key < b.key) {
                return desc ? 1 : -1;
            }

            if (a.key > b.key) {
                return desc ? -1 : 1;
            }

            return 0;
        };

        this.files.forEach(f => {
            
            let content: IIndexable = {};

            if (mustOrder) {
                items.sort(keyComparer).map(x => {
                    content[x.key] = x[f] || '';
                });
            } else {
                items.map(x => {
                    content[x.key] = x[f] || '';
                });
            }

            const json = JSON.stringify(content, null, 4);
            fs.writeFileSync(pathJoin(this.path, f + JSON_EX), json);
        });
    }

    private send(command: ICommand) {
        this.panel.webview.postMessage(command);
    }
}