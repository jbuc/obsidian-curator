import { App, Setting } from 'obsidian';
import { CuratorConfig, Ruleset } from '../../core/types';

export class RulesTab {
    private app: App;
    private containerEl: HTMLElement;
    private config: CuratorConfig;
    private onUpdate: (config: CuratorConfig) => void;

    constructor(app: App, containerEl: HTMLElement, config: CuratorConfig, onUpdate: (config: CuratorConfig) => void) {
        this.app = app;
        this.containerEl = containerEl;
        this.config = config;
        this.onUpdate = onUpdate;
    }

    public display(): void {
        this.containerEl.empty();
        this.containerEl.createEl('h3', { text: 'Rules Configuration' });
        this.containerEl.createEl('p', { text: 'Connect Triggers, Groups, and Jobs to create automated workflows.' });

        new Setting(this.containerEl)
            .setName('Add New Ruleset')
            .setDesc('Create a new rule to automate your notes.')
            .addButton(button => button
                .setButtonText('Add Ruleset')
                .setCta()
                .onClick(() => {
                    this.addRuleset();
                }));

        const rulesetsList = this.containerEl.createDiv('rulesets-list');

        this.config.rulesets.forEach((ruleset, index) => {
            this.renderRuleset(rulesetsList, ruleset, index);
        });
    }

    private addRuleset() {
        const newRuleset: Ruleset = {
            id: crypto.randomUUID(),
            name: 'New Ruleset',
            enabled: true,
            triggerId: '',
            groupId: '',
            jobId: ''
        };
        this.config.rulesets.push(newRuleset);
        this.onUpdate(this.config);
        this.display();
    }

    private renderRuleset(container: HTMLElement, ruleset: Ruleset, index: number) {
        const rulesetContainer = container.createDiv('ruleset-container');
        rulesetContainer.style.border = '1px solid var(--background-modifier-border)';
        rulesetContainer.style.padding = '10px';
        rulesetContainer.style.marginBottom = '10px';
        rulesetContainer.style.borderRadius = '4px';

        // Header: Name and Enabled Toggle
        new Setting(rulesetContainer)
            .setName('Ruleset Name')
            .addText(text => text
                .setValue(ruleset.name)
                .onChange(value => {
                    ruleset.name = value;
                    this.onUpdate(this.config);
                }))
            .addToggle(toggle => toggle
                .setValue(ruleset.enabled)
                .setTooltip('Enable/Disable Ruleset')
                .onChange(value => {
                    ruleset.enabled = value;
                    this.onUpdate(this.config);
                }))
            .addExtraButton(btn => btn
                .setIcon('trash')
                .setTooltip('Delete Ruleset')
                .onClick(() => {
                    this.config.rulesets.splice(index, 1);
                    this.onUpdate(this.config);
                    this.display();
                }));

        // Configuration: Trigger, Group, Job
        const configContainer = rulesetContainer.createDiv('ruleset-config');
        configContainer.style.display = 'grid';
        configContainer.style.gridTemplateColumns = '1fr 1fr 1fr';
        configContainer.style.gap = '10px';

        // Trigger Dropdown
        new Setting(configContainer)
            .setName('Trigger')
            .setDesc('When to run')
            .addDropdown(dropdown => {
                dropdown.addOption('', 'Select Trigger');
                this.config.triggers.forEach(t => dropdown.addOption(t.id, t.name));
                dropdown.setValue(ruleset.triggerId);
                dropdown.onChange(value => {
                    ruleset.triggerId = value;
                    this.onUpdate(this.config);
                });
            });

        // Group Dropdown
        new Setting(configContainer)
            .setName('Group')
            .setDesc('Which notes')
            .addDropdown(dropdown => {
                dropdown.addOption('', 'Select Group');
                this.config.groups.forEach(g => dropdown.addOption(g.id, g.name));
                dropdown.setValue(ruleset.groupId);
                dropdown.onChange(value => {
                    ruleset.groupId = value;
                    this.onUpdate(this.config);
                });
            });

        // Job Dropdown
        new Setting(configContainer)
            .setName('Job')
            .setDesc('What to do')
            .addDropdown(dropdown => {
                dropdown.addOption('', 'Select Job');
                this.config.jobs.forEach(j => dropdown.addOption(j.id, j.name));
                dropdown.setValue(ruleset.jobId);
                dropdown.onChange(value => {
                    ruleset.jobId = value;
                    this.onUpdate(this.config);
                });
            });
    }
}
