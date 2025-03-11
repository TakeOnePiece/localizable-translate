export interface StringUnit {
    state: string;
    value: string;
}
export interface Localization {
    stringUnit: StringUnit;
}
export interface Localizations {
    [language: string]: Localization;
}
export interface StringEntry {
    localizations?: Localizations;
    [key: string]: any;
}
export interface StringsObject {
    [key: string]: StringEntry;
}
export interface FileContent {
    strings: StringsObject;
    version: string;
}
export interface LocalizableConfig {
    languages: string[];
}
