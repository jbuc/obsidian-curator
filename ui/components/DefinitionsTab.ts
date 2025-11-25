import { App, Setting } from 'obsidian';
import { CuratorConfig, Group, Trigger, Action } from '../../core/types';

export class DefinitionsTab {
    private app: App;
    private containerEl: HTMLElement;
    private config: CuratorConfig;
    private onUpdate: (config: CuratorConfig) => void;
    private activeSection: 'groups' | 'triggers' | 'actions' = 'groups';

    constructor(app: App, containerEl: HTMLElement, config: CuratorConfig, onUpdate: (config: CuratorConfig) => void) {
        this.app = app;
        this.containerEl = containerEl;
        this.config = config;
        this.onUpdate = onUpdate;
    }

    public display(): void {
        this.containerEl.empty();
        this.containerEl.createEl('h3', { text: 'Definitions' });

        // Sub-navigation
        const navContainer = this.containerEl.createDiv('definitions-nav');
        navContainer.style.display = 'flex';
        navContainer.style.gap = '10px';
        navContainer.style.marginBottom = '20px';

        this.createNavButton(navContainer, 'Groups', 'groups');
        this.createNavButton(navContainer, 'Triggers', 'triggers');
        this.createNavButton(navContainer, 'Actions', 'actions');

        const contentContainer = this.containerEl.createDiv('definitions-content');

        switch (this.activeSection) {
            case 'groups': this.renderGroups(contentContainer); break;
            case 'triggers': this.renderTriggers(contentContainer); break;
            case 'actions': this.renderActions(contentContainer); break;
        }
    }

    private createNavButton(container: HTMLElement, text: string, section: typeof this.activeSection) {
        const btn = container.createEl('button', { text });
        if (this.activeSection === section) {
            btn.addClass('mod-cta');
        }
        btn.onclick = () => {
            this.activeSection = section;
            this.display();
        };
    }

    private renderGroups(container: HTMLElement) {
        new Setting(container)
            .setName('Add Group')
            .setDesc('Create a new group of notes using a Dataview query.')
            .addButton(btn => btn
                .setButtonText('Add Group')
                .setCta()
                .onClick(() => {
                    this.config.groups.push({
                        id: crypto.randomUUID(),
                        name: 'New Group',
                        query: ''
                    });
                    this.onUpdate(this.config);
                    this.display();
                }));

        this.config.groups.forEach((group, index) => {
            const div = container.createDiv('definition-item');
            div.style.border = '1px solid var(--background-modifier-border)';
            div.style.padding = '10px';
            div.style.marginBottom = '10px';
            div.style.borderRadius = '4px';

            new Setting(div)
                .setName('Name')
                .addText(text => text
                    .setValue(group.name)
                    .onChange(value => {
                        group.name = value;
                        this.onUpdate(this.config);
                    }))
                .addExtraButton(btn => btn
                    .setIcon('trash')
                    .onClick(() => {
                        this.config.groups.splice(index, 1);
                        this.onUpdate(this.config);
                        this.display();
                    }));

            new Setting(div)
                .setName('Dataview Query')
                .setDesc('Enter a Dataview source query (e.g. FROM "folder" AND #tag)')
                .addTextArea(text => text
                    .setPlaceholder('FROM "Daily Notes"')
                    .setValue(group.query)
                    .onChange(value => {
                        group.query = value;
                        this.onUpdate(this.config);
                    }));
        });
    }

    private renderTriggers(container: HTMLElement) {
        new Setting(container)
            .setName('Add Trigger')
            .setDesc('Define when rules should run.')
            .addButton(btn => btn
                .setButtonText('Add Trigger')
                .setCta()
                .onClick(() => {
                    this.config.triggers.push({
                        id: crypto.randomUUID(),
                        name: 'New Trigger',
                        type: 'obsidian_event',
                        event: 'modify'
                    });
                    this.onUpdate(this.config);
                    this.display();
                }));

        this.config.triggers.forEach((trigger, index) => {
            const div = container.createDiv('definition-item');
            div.style.border = '1px solid var(--background-modifier-border)';
            div.style.padding = '10px';
            div.style.marginBottom = '10px';
            div.style.borderRadius = '4px';

            new Setting(div)
                .setName('Name')
                .addText(text => text
                    .setValue(trigger.name)
                    .onChange(value => {
                        trigger.name = value;
                        this.onUpdate(this.config);
                    }))
                .addExtraButton(btn => btn
                    .setIcon('trash')
                    .onClick(() => {
                        this.config.triggers.splice(index, 1);
                        this.onUpdate(this.config);
                        this.display();
                    }));

            new Setting(div)
                .setName('Type')
                .addDropdown(dropdown => dropdown
                    .addOption('obsidian_event', 'Obsidian Event')
                    .addOption('system_event', 'System Event')
                    .addOption('folder_event', 'Folder Event')
                    .addOption('manual', 'Manual')
                    .setValue(trigger.type)
                    .onChange(value => {
                        trigger.type = value as any;
                        // Reset config defaults
                        if (trigger.type === 'system_event') trigger.event = 'startup';
                        else if (trigger.type === 'folder_event') trigger.event = 'enter';
                        else if (trigger.type === 'obsidian_event') trigger.event = 'modify';

                        this.onUpdate(this.config);
                        this.display();
                    }));

            if (trigger.type === 'obsidian_event') {
                new Setting(div)
                    .setName('Event')
                    .addDropdown(dropdown => dropdown
                        .addOption('create', 'File Created')
                        .addOption('modify', 'File Modified')
                        .addOption('rename', 'File Renamed')
                        .addOption('delete', 'File Deleted')
                        .setValue(trigger.event || 'modify')
                        .onChange(value => {
                            trigger.event = value as any;
                            this.onUpdate(this.config);
                        }));
            } else if (trigger.type === 'system_event') {
                new Setting(div)
                    .setName('Event')
                    .addDropdown(dropdown => dropdown
                        .addOption('startup', 'Obsidian Starts')
                        .addOption('sync_start', 'Sync Starts')
                        .addOption('sync_finish', 'Sync Finishes')
                        .setValue(trigger.event || 'startup')
                        .onChange(value => {
                            trigger.event = value as any;
                            this.onUpdate(this.config);
                        }));

                // Time Constraints
                const timeContainer = div.createDiv('time-constraints');
                timeContainer.style.marginLeft = '20px';
                timeContainer.style.borderLeft = '2px solid var(--background-modifier-border)';
                timeContainer.style.paddingLeft = '10px';

                new Setting(timeContainer)
                    .setName('Time Constraints (Optional)')
                    .setDesc('Only run within this time range');

                new Setting(timeContainer)
                    .setName('Start Time')
                    .setDesc('ISO format (e.g. 2023-01-01T09:00:00) or Time (09:00)')
                    .addText(text => text
                        .setPlaceholder('YYYY-MM-DDTHH:mm:ss')
                        .setValue(trigger.timeConstraints?.start || '')
                        .onChange(value => {
                            if (!trigger.timeConstraints) trigger.timeConstraints = {};
                            trigger.timeConstraints.start = value;
                            this.onUpdate(this.config);
                        }));

                new Setting(timeContainer)
                    .setName('End Time')
                    .setDesc('ISO format (e.g. 2023-01-01T17:00:00) or Time (17:00)')
                    .addText(text => text
                        .setPlaceholder('YYYY-MM-DDTHH:mm:ss')
                        .setValue(trigger.timeConstraints?.end || '')
                        .onChange(value => {
                            if (!trigger.timeConstraints) trigger.timeConstraints = {};
                            trigger.timeConstraints.end = value;
                            this.onUpdate(this.config);
                        }));
            } else if (trigger.type === 'folder_event') {
                new Setting(div)
                    .setName('Event')
                    .addDropdown(dropdown => dropdown
                        .addOption('enter', 'File Entered Folder')
                        .addOption('leave', 'File Left Folder')
                        .setValue(trigger.event || 'enter')
                        .onChange(value => {
                            trigger.event = value as any;
                            this.onUpdate(this.config);
                        }));

                new Setting(div)
                    .setName('Target Folder')
                    .addText(text => text
                        .setPlaceholder('folder/path')
                        .setValue(trigger.folder || '')
                        .onChange(value => {
                            trigger.folder = value;
                            this.onUpdate(this.config);
                        }));
            }
        });
    }

    private renderActions(container: HTMLElement) {
        new Setting(container)
            .setName('Add Action')
            .setDesc('Define what to do with notes.')
            .addButton(btn => btn
                .setButtonText('Add Action')
                .setCta()
                .onClick(() => {
                    this.config.actions.push({
                        id: crypto.randomUUID(),
                        name: 'New Action',
                        type: 'move',
                        config: { folder: '' }
                    });
                    this.onUpdate(this.config);
                    this.display();
                }));

        this.config.actions.forEach((action, index) => {
            const div = container.createDiv('definition-item');
            div.style.border = '1px solid var(--background-modifier-border)';
            div.style.padding = '10px';
            div.style.marginBottom = '10px';
            div.style.borderRadius = '4px';

            new Setting(div)
                .setName('Name')
                .addText(text => text
                    .setValue(action.name)
                    .onChange(value => {
                        action.name = value;
                        this.onUpdate(this.config);
                    }))
                .addExtraButton(btn => btn
                    .setIcon('trash')
                    .onClick(() => {
                        this.config.actions.splice(index, 1);
                        this.onUpdate(this.config);
                        this.display();
                    }));

            new Setting(div)
                .setName('Type')
                .addDropdown(dropdown => dropdown
                    .addOption('move', 'Move')
                    .addOption('rename', 'Rename')
                    .addOption('tag', 'Tag')
                    .setValue(action.type)
                    .onChange(value => {
                        action.type = value as any;
                        if (value === 'move') action.config = { folder: '' };
                        else if (value === 'rename') action.config = { prefix: '', suffix: '', replace: '' };
                        else if (value === 'tag') action.config = { tag: '', operation: 'add' };
                        this.onUpdate(this.config);
                        this.display();
                    }));

            if (action.type === 'move') {
                new Setting(div)
                    .setName('Folder')
                    .addText(text => text
                        .setPlaceholder('folder/path')
                        .setValue(action.config.folder)
                        .onChange(value => {
                            action.config.folder = value;
                            this.onUpdate(this.config);
                        }));
                new Setting(div)
                    .setName('Create if missing')
                    .addToggle(toggle => toggle
                        .setValue(action.config.createIfMissing || false)
                        .onChange(value => {
                            action.config.createIfMissing = value;
                            this.onUpdate(this.config);
                        }));
            } else if (action.type === 'rename') {
                new Setting(div)
                    .setName('Prefix')
                    .addText(text => text
                        .setValue(action.config.prefix || '')
                        .onChange(value => {
                            action.config.prefix = value;
                            this.onUpdate(this.config);
                        }));
                new Setting(div)
                    .setName('Suffix')
                    .addText(text => text
                        .setValue(action.config.suffix || '')
                        .onChange(value => {
                            action.config.suffix = value;
                            this.onUpdate(this.config);
                        }));
            } else if (action.type === 'tag') {
                new Setting(div)
                    .setName('Tag')
                    .addText(text => text
                        .setValue(action.config.tag)
                        .onChange(value => {
                            action.config.tag = value;
                            this.onUpdate(this.config);
                        }));
                new Setting(div)
                    .setName('Operation')
                    .addDropdown(dropdown => dropdown
                        .addOption('add', 'Add')
                        .addOption('remove', 'Remove')
                        .setValue(action.config.operation)
                        .onChange(value => {
                            action.config.operation = value;
                            this.onUpdate(this.config);
                        }));
            }
        });
    }

}
