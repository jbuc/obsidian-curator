import { App, TFolder, TAbstractFile } from 'obsidian';

declare module 'obsidian' {
    interface App {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        plugins: any;
    }
}

// AbstractInputSuggest is not exported in the API types, so we define a minimal version here
// or we can just implement a simple suggester.
// Let's implement a simple one based on common patterns.

export class FolderSuggest {
    app: App;
    inputEl: HTMLInputElement;
    containerEl: HTMLElement;
    suggestions: TFolder[];
    isOpen: boolean;
    selectedIndex: number;

    constructor(app: App, inputEl: HTMLInputElement) {
        this.app = app;
        this.inputEl = inputEl;
        this.suggestions = [];
        this.isOpen = false;
        this.selectedIndex = -1;

        this.containerEl = createDiv('suggestion-container');
        this.containerEl.style.position = 'absolute';
        this.containerEl.style.zIndex = '1000';
        this.containerEl.style.display = 'none';
        this.containerEl.style.maxHeight = '200px';
        this.containerEl.style.overflowY = 'auto';
        this.containerEl.style.backgroundColor = 'var(--background-secondary)';
        this.containerEl.style.border = '1px solid var(--background-modifier-border)';

        document.body.appendChild(this.containerEl);

        this.inputEl.addEventListener('input', this.onInput.bind(this));
        this.inputEl.addEventListener('blur', () => setTimeout(() => this.close(), 200));
        this.inputEl.addEventListener('focus', this.onInput.bind(this));
        this.inputEl.addEventListener('keydown', this.onKeyDown.bind(this));
    }

    onInput() {
        const val = this.inputEl.value;
        this.suggestions = this.getSuggestions(val);
        this.selectedIndex = -1;
        if (this.suggestions.length > 0) {
            this.open();
            this.renderSuggestions();
        } else {
            this.close();
        }
    }

    onKeyDown(e: KeyboardEvent) {
        if (!this.isOpen || this.suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex + 1) % this.suggestions.length;
            this.renderSuggestions();
            this.scrollIntoView();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex - 1 + this.suggestions.length) % this.suggestions.length;
            this.renderSuggestions();
            this.scrollIntoView();
        } else if (e.key === 'Enter') {
            if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
                e.preventDefault();
                this.selectSuggestion(this.suggestions[this.selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            this.close();
        }
    }

    scrollIntoView() {
        const selectedEl = this.containerEl.children[this.selectedIndex] as HTMLElement;
        if (selectedEl) {
            selectedEl.scrollIntoView({ block: 'nearest' });
        }
    }

    getSuggestions(inputStr: string): TFolder[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        const folders: TFolder[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        abstractFiles.forEach((file: TAbstractFile) => {
            if (file instanceof TFolder) {
                if (file.path.toLowerCase().contains(lowerCaseInputStr)) {
                    folders.push(file);
                }
            }
        });

        return folders;
    }

    renderSuggestions() {
        this.containerEl.empty();
        const rect = this.inputEl.getBoundingClientRect();
        this.containerEl.style.top = `${rect.bottom}px`;
        this.containerEl.style.left = `${rect.left}px`;
        this.containerEl.style.width = `${rect.width}px`;

        this.suggestions.forEach((folder, index) => {
            const item = this.containerEl.createDiv('suggestion-item');
            item.setText(folder.path);
            item.style.padding = '5px';
            item.style.cursor = 'pointer';

            if (index === this.selectedIndex) {
                item.style.backgroundColor = 'var(--background-modifier-hover)';
                item.addClass('is-selected');
            }

            item.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.renderSuggestions();
            });

            item.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent blur
                this.selectSuggestion(folder);
            });
        });
    }

    selectSuggestion(folder: TFolder) {
        this.inputEl.value = folder.path;
        this.inputEl.trigger('input'); // Notify Obsidian listeners
        this.close();
    }

    open() {
        this.containerEl.style.display = 'block';
        this.isOpen = true;
    }

    close() {
        this.containerEl.style.display = 'none';
        this.isOpen = false;
        this.selectedIndex = -1;
    }
}
