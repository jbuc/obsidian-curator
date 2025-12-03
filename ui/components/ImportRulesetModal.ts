import { App, Modal, TFile } from 'obsidian';
import { FileSuggest } from '../../suggests/file-suggest';

export class ImportRulesetModal extends Modal {
    private onSubmit: (file: TFile) => void;
    private file: TFile | null = null;

    constructor(app: App, onSubmit: (file: TFile) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Import Ruleset' });

        contentEl.createEl('p', { text: 'Select a markdown file to import as a ruleset.' });

        const input = contentEl.createEl('input', { type: 'text' });
        input.style.width = '100%';
        input.placeholder = 'Type to search files...';

        new FileSuggest(this.app, input, (file: TFile) => {
            this.file = file;
            input.value = file.path;
        });

        const btnDiv = contentEl.createDiv();
        btnDiv.style.marginTop = '15px';
        btnDiv.style.textAlign = 'right';

        const btn = btnDiv.createEl('button', { text: 'Import' });
        btn.addClass('mod-cta');
        btn.onclick = () => {
            if (this.file) {
                this.close();
                this.onSubmit(this.file);
            } else {
                // Try to resolve text input to file if user typed exact path
                const file = this.app.vault.getAbstractFileByPath(input.value);
                if (file instanceof TFile) {
                    this.close();
                    this.onSubmit(file);
                } else {
                    input.style.borderColor = 'var(--text-error)';
                }
            }
        };
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
