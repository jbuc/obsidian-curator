import { App, Setting } from 'obsidian';
import { CuratorConfig, Identifier, Group, Trigger, Action, Job } from '../../core/types';

export class DefinitionsTab {
    private app: App;
    private containerEl: HTMLElement;
    private config: CuratorConfig;
    private onUpdate: (config: CuratorConfig) => void;
    private activeSection: 'identifiers' | 'groups' | 'triggers' | 'actions' | 'jobs' = 'identifiers';

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

        this.createNavButton(navContainer, 'Identifiers', 'identifiers');
        this.createNavButton(navContainer, 'Groups', 'groups');
        this.createNavButton(navContainer, 'Triggers', 'triggers');
        this.createNavButton(navContainer, 'Actions', 'actions');
        this.createNavButton(navContainer, 'Jobs', 'jobs');

        const contentContainer = this.containerEl.createDiv('definitions-content');

        switch (this.activeSection) {
            case 'identifiers': this.renderIdentifiers(contentContainer); break;
            case 'groups': this.renderGroups(contentContainer); break;
            case 'triggers': this.renderTriggers(contentContainer); break;
            case 'actions': this.renderActions(contentContainer); break;
            case 'jobs': this.renderJobs(contentContainer); break;
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

    private renderIdentifiers(container: HTMLElement) {
        new Setting(container)
            .setName('Add Identifier')
            .setDesc('Create a new test for your notes.')
            .addButton(btn => btn
                .setButtonText('Add Identifier')
                .setCta()
                .onClick(() => {
                    this.config.identifiers.push({
                        id: crypto.randomUUID(),
                        name: 'New Identifier',
                        type: 'tag',
                        config: { tag: '' }
                    });
                    this.onUpdate(this.config);
                    this.display();
                }));

        this.config.identifiers.forEach((identifier, index) => {
            const div = container.createDiv('definition-item');
            div.style.border = '1px solid var(--background-modifier-border)';
            div.style.padding = '10px';
            div.style.marginBottom = '10px';
            div.style.borderRadius = '4px';

            new Setting(div)
                .setName('Name')
                .addText(text => text
                    .setValue(identifier.name)
                    .onChange(value => {
                        identifier.name = value;
                        this.onUpdate(this.config);
                    }))
                .addExtraButton(btn => btn
                    .setIcon('trash')
                    .onClick(() => {
                        this.config.identifiers.splice(index, 1);
                        this.onUpdate(this.config);
                        this.display();
                    }));

            new Setting(div)
                .setName('Type')
                .addDropdown(dropdown => dropdown
                    .addOption('tag', 'Tag')
                    .addOption('folder', 'Folder')
                    .addOption('frontmatter', 'Frontmatter')
                    .setValue(identifier.type)
                    .onChange(value => {
                        identifier.type = value;
                        // Reset config based on type
                        if (value === 'tag') identifier.config = { tag: '' };
                        else if (value === 'folder') identifier.config = { folder: '' };
                        else if (value === 'frontmatter') identifier.config = { key: '', value: '' };
                        this.onUpdate(this.config);
                        this.display();
                    }));

            // Config based on type
            if (identifier.type === 'tag') {
                new Setting(div)
                    .setName('Tag')
                    .addText(text => text
                        .setPlaceholder('#tag')
                        .setValue(identifier.config.tag)
                        .onChange(value => {
                            identifier.config.tag = value;
                            this.onUpdate(this.config);
                        }));
            } else if (identifier.type === 'folder') {
                new Setting(div)
                    .setName('Folder')
                    .addText(text => text
                        .setPlaceholder('folder/path')
                        .setValue(identifier.config.folder)
                        .onChange(value => {
                            identifier.config.folder = value;
                            this.onUpdate(this.config);
                        }));
            } else if (identifier.type === 'frontmatter') {
                new Setting(div)
                    .setName('Key')
                    .addText(text => text
                        .setPlaceholder('key')
                        .setValue(identifier.config.key)
                        .onChange(value => {
                            identifier.config.key = value;
                            this.onUpdate(this.config);
                        }));
                new Setting(div)
                    .setName('Value (Optional)')
                    .addText(text => text
                        .setPlaceholder('value')
                        .setValue(identifier.config.value)
                        .onChange(value => {
                            identifier.config.value = value;
                            this.onUpdate(this.config);
                        }));
            }
        });
    }

    private renderGroups(container: HTMLElement) {
        new Setting(container)
            .setName('Add Group')
            .setDesc('Combine identifiers to select notes.')
            .addButton(btn => btn
                .setButtonText('Add Group')
                .setCta()
                .onClick(() => {
                    this.config.groups.push({
                        id: crypto.randomUUID(),
                        name: 'New Group',
                        identifiers: [],
                        operator: 'AND'
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
                .setName('Operator')
                .addDropdown(dropdown => dropdown
                    .addOption('AND', 'AND (All match)')
                    .addOption('OR', 'OR (Any match)')
                    .setValue(group.operator)
                    .onChange(value => {
                        group.operator = value as 'AND' | 'OR';
                        this.onUpdate(this.config);
                    }));

            // Identifiers Selection
            const idContainer = div.createDiv('identifiers-selection');
            idContainer.createEl('h4', { text: 'Identifiers' });

            this.config.identifiers.forEach(identifier => {
                new Setting(idContainer)
                    .setName(identifier.name)
                    .addToggle(toggle => toggle
                        .setValue(group.identifiers.includes(identifier.id))
                        .onChange(value => {
                            if (value) {
                                group.identifiers.push(identifier.id);
                            } else {
                                group.identifiers = group.identifiers.filter(id => id !== identifier.id);
                            }
                            this.onUpdate(this.config);
                        }));
            });
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

    private renderJobs(container: HTMLElement) {
        new Setting(container)
            .setName('Add Job')
            .setDesc('Combine actions into a sequence.')
            .addButton(btn => btn
                .setButtonText('Add Job')
                .setCta()
                .onClick(() => {
                    this.config.jobs.push({
                        id: crypto.randomUUID(),
                        name: 'New Job',
                        actionIds: []
                    });
                    this.onUpdate(this.config);
                    this.display();
                }));

        this.config.jobs.forEach((job, index) => {
            const div = container.createDiv('definition-item');
            div.style.border = '1px solid var(--background-modifier-border)';
            div.style.padding = '10px';
            div.style.marginBottom = '10px';
            div.style.borderRadius = '4px';

            new Setting(div)
                .setName('Name')
                .addText(text => text
                    .setValue(job.name)
                    .onChange(value => {
                        job.name = value;
                        this.onUpdate(this.config);
                    }))
                .addExtraButton(btn => btn
                    .setIcon('trash')
                    .onClick(() => {
                        this.config.jobs.splice(index, 1);
                        this.onUpdate(this.config);
                        this.display();
                    }));

            // Actions Selection (Ordered)
            // For simplicity, just a list of toggles for now, but ideally this should be reorderable.
            // Let's just do a multi-select style for now.

            const actionsContainer = div.createDiv('actions-selection');
            actionsContainer.createEl('h4', { text: 'Actions Sequence' });

            // Show current actions in order
            job.actionIds.forEach((actionId, actionIndex) => {
                const action = this.config.actions.find(a => a.id === actionId);
                if (action) {
                    new Setting(actionsContainer)
                        .setName(`${actionIndex + 1}. ${action.name}`)
                        .addExtraButton(btn => btn
                            .setIcon('cross')
                            .setTooltip('Remove from Job')
                            .onClick(() => {
                                job.actionIds.splice(actionIndex, 1);
                                this.onUpdate(this.config);
                                this.display();
                            }));
                }
            });

            // Add Action to Job
            new Setting(actionsContainer)
                .setName('Add Action to Sequence')
                .addDropdown(dropdown => {
                    dropdown.addOption('', 'Select Action');
                    this.config.actions.forEach(a => dropdown.addOption(a.id, a.name));
                    dropdown.onChange(value => {
                        if (value) {
                            job.actionIds.push(value);
                            this.onUpdate(this.config);
                            this.display();
                        }
                    });
                });
        });
    }
}
