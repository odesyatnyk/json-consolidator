export interface IDataEntry extends IValidationResult, IIndexable {
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

export interface IIndexable {
    [name: string]: string | number | string[] | { [file: string]: string; };
}

export enum Errors {
    duplicatedKey = "Key is duplicated",
    emptyKey = "Key is empty"
}