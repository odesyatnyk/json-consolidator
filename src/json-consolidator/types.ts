export interface IDataEntry extends IValidationResult {
    id: number;
    key: string;
    errors: string[];
    values: { [file: string]: string; };
}

export interface IValidationResult {
    id: number;
    key: string;
    errors: string[];
}

export interface ICommand<T = any> {
    command: string;
    data: T;
}

export enum Errors {
    duplicatedKey = "Key is duplicated",
    emptyKey = "Key is empty"
}