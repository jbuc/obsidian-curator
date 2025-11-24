import { App, ButtonComponent } from 'obsidian';
import { BinderService } from '../../core/BinderService';

export class LogbookTab {
    private app: App;
    private containerEl: HTMLElement;
    private binder: BinderService;

    constructor(app: App, containerEl: HTMLElement, binder: BinderService) {
        this.app = app;
        this.containerEl = containerEl;
        this.binder = binder;
    }

    public display(): void {
        this.containerEl.empty();

        const header = this.containerEl.createDiv('logbook-header');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';

        const headerH3 = header.createEl('h3', { text: 'Logbook' });
        headerH3.style.margin = '0';

        new ButtonComponent(header)
            .setButtonText('Clear Log')
            .setWarning()
            .onClick(() => {
                this.binder.clear();
                this.display();
            });

        const entries = this.binder.getEntries();
        const logContainer = this.containerEl.createDiv('curator-logbook');
        logContainer.style.height = '400px';
        logContainer.style.overflowY = 'auto';
        logContainer.style.border = '1px solid var(--background-modifier-border)';
        logContainer.style.padding = '10px';
        logContainer.style.borderRadius = '4px';
        logContainer.style.backgroundColor = 'var(--background-primary)';
        logContainer.style.fontFamily = 'monospace';

        if (entries.length === 0) {
            const emptyMsg = logContainer.createDiv({ text: 'No entries found.' });
            emptyMsg.style.color = 'var(--text-muted)';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.padding = '20px';
            return;
        }

        entries.forEach(entry => {
            const entryEl = logContainer.createDiv('curator-log-entry');
            entryEl.style.marginBottom = '4px';
            entryEl.style.borderBottom = '1px solid var(--background-modifier-border)';
            entryEl.style.paddingBottom = '4px';

            const timeSpan = entryEl.createSpan({ text: `[${new Date(entry.timestamp).toLocaleTimeString()}] `, cls: 'curator-log-time' });
            timeSpan.style.color = 'var(--text-muted)';

            const typeSpan = entryEl.createSpan({ text: entry.type.toUpperCase(), cls: `curator-log-type-${entry.type}` });
            typeSpan.style.fontWeight = 'bold';
            typeSpan.style.marginRight = '5px';

            if (entry.type === 'error') typeSpan.style.color = 'var(--text-error)';
            else if (entry.type === 'warning') typeSpan.style.color = 'var(--text-warning)';
            else if (entry.type === 'success') typeSpan.style.color = 'var(--text-success)';
            else typeSpan.style.color = 'var(--text-normal)';

            entryEl.createSpan({ text: `: ${entry.message}`, cls: 'curator-log-message' });

            if (entry.relatedFile) {
                const fileSpan = entryEl.createSpan({ text: ` (${entry.relatedFile})`, cls: 'curator-log-file' });
                fileSpan.style.color = 'var(--text-accent)';
            }
        });
    }
}
