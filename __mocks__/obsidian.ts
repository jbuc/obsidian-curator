export class App {
    vault: any;
    metadataCache: any;
    workspace: any;
    constructor() {
        this.vault = {
            on: jest.fn(),
            offref: jest.fn(),
            getMarkdownFiles: jest.fn().mockReturnValue([]),
            read: jest.fn(),
        };
        this.metadataCache = {
            on: jest.fn(),
            getFileCache: jest.fn(),
        };
        this.workspace = {
            onLayoutReady: jest.fn(),
            getActiveViewOfType: jest.fn(),
            on: jest.fn(),
        };
    }
}

export class TFile {
    path: string;
    basename: string;
    extension: string;
    parent: any;
    constructor() {
        this.path = '';
        this.basename = '';
        this.extension = '';
        this.parent = { path: '' };
    }
}

export class Notice {
    constructor(message: string) { }
}

export class WorkspaceLeaf {
    view: any;
    constructor() {
        this.view = { file: null };
    }
}

export class Plugin {
    app: App;
    constructor(app: App) {
        this.app = app;
    }
    loadData() { return Promise.resolve({}); }
    saveData() { return Promise.resolve(); }
    addCommand() { }
    addSettingTab() { }
    registerEvent() { }
    registerDomEvent() { }
    addStatusBarItem() { return { setText: jest.fn() }; }
}

export class PluginSettingTab {
    constructor(app: App, plugin: any) { }
    display() { }
}

export class Setting {
    constructor(containerEl: HTMLElement) { }
    setName() { return this; }
    setDesc() { return this; }
    addToggle() { return this; }
    addText() { return this; }
    addButton() { return this; }
    addDropdown() { return this; }
    addSearch() { return this; }
    addExtraButton() { return this; }
    setClass() { return this; }
}

export function normalizePath(path: string) {
    return path; // Simple mock
}

export function getAllTags(cache: any): string[] {
    return [];
}
