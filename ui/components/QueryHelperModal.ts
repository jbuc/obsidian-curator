import { App, Modal, Setting } from 'obsidian';

interface QueryTemplate {
    name: string;
    description: string;
    query: string;
}

export class QueryHelperModal extends Modal {
    private onSelect: (query: string) => void;

    private templates: QueryTemplate[] = [
        {
            name: 'Files in Folder with Property',
            description: 'Select files in a specific folder that have a property containing specific text.',
            query: 'FROM "Folder/Path" WHERE contains(my_property, "search text")'
        },
        {
            name: 'Tagged Notes Missing Property',
            description: 'Select notes with a specific tag that do NOT have a certain property.',
            query: 'FROM #tag WHERE !my_property'
        },
        {
            name: 'Match Filename',
            description: 'Select files where the filename contains a specific word.',
            query: 'WHERE contains(file.name, "Project")'
        },
        {
            name: 'Relative Date (Created Recently)',
            description: 'Select files created in the last 7 days.',
            query: 'WHERE file.cday >= date(today) - dur(7 days)'
        },
        {
            name: 'Relative Date (Modified Recently)',
            description: 'Select files modified in the last 24 hours.',
            query: 'WHERE file.mtime >= date(now) - dur(24 hours)'
        },
        {
            name: 'Tasks in Specific File',
            description: 'Select tasks from a specific file (if using task queries).',
            query: 'FROM "Projects/Active Project.md" WHERE !completed'
        }
    ];

    constructor(app: App, onSelect: (query: string) => void) {
        super(app);
        this.onSelect = onSelect;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Dataview Query Templates' });
        contentEl.createEl('p', { text: 'Click a template to insert it into your query field.' });

        const list = contentEl.createDiv('query-template-list');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '10px';

        this.templates.forEach(template => {
            const item = list.createDiv('query-template-item');
            item.style.border = '1px solid var(--background-modifier-border)';
            item.style.padding = '10px';
            item.style.borderRadius = '4px';
            item.style.cursor = 'pointer';
            item.style.transition = 'background-color 0.2s ease';

            item.onmouseover = () => {
                item.style.backgroundColor = 'var(--background-secondary)';
            };
            item.onmouseout = () => {
                item.style.backgroundColor = 'transparent';
            };

            item.onclick = () => {
                this.onSelect(template.query);
                this.close();
            };

            const header = item.createDiv('query-template-header');
            header.style.fontWeight = 'bold';
            header.style.marginBottom = '5px';
            header.setText(template.name);

            const desc = item.createDiv('query-template-desc');
            desc.style.fontSize = '0.9em';
            desc.style.color = 'var(--text-muted)';
            desc.style.marginBottom = '5px';
            desc.setText(template.description);

            const code = item.createEl('code');
            code.style.display = 'block';
            code.style.padding = '5px';
            code.style.backgroundColor = 'var(--background-primary)';
            code.style.borderRadius = '3px';
            code.style.fontFamily = 'var(--font-monospace)';
            code.setText(template.query);
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
