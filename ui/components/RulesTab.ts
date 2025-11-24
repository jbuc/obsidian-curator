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
            rules: []
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

        // Trigger Configuration
        new Setting(rulesetContainer)
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

        // Rules Configuration
        const rulesContainer = rulesetContainer.createDiv('rules-container');
        rulesContainer.style.marginTop = '10px';
        rulesContainer.style.paddingLeft = '10px';
        rulesContainer.style.borderLeft = '2px solid var(--background-modifier-border)';

        rulesContainer.createEl('h4', { text: 'Rules (Processed in order)' });

        ruleset.rules.forEach((rule, ruleIndex) => {
            const ruleDiv = rulesContainer.createDiv('rule-item');
            ruleDiv.style.marginBottom = '10px';
            ruleDiv.style.padding = '5px';
            ruleDiv.style.backgroundColor = 'var(--background-secondary)';
            ruleDiv.style.borderRadius = '4px';

            const ruleHeader = ruleDiv.createDiv('rule-header');
            ruleHeader.style.display = 'flex';
            ruleHeader.style.justifyContent = 'space-between';
            ruleHeader.style.alignItems = 'center';

            const title = rule.groupId
                ? `If matches Group: ${this.config.groups.find(g => g.id === rule.groupId)?.name || 'Unknown'}`
                : 'Always (No Group)';

            ruleHeader.createEl('span', { text: title, cls: 'rule-title' });

            new Setting(ruleHeader)
                .addExtraButton(btn => btn
                    .setIcon('trash')
                    .setTooltip('Delete Rule')
                    .onClick(() => {
                        ruleset.rules.splice(ruleIndex, 1);
                        this.onUpdate(this.config);
                        this.display();
                    }));

            // Edit Group
            new Setting(ruleDiv)
                .setName('Condition (Group)')
                .setDesc('Leave empty to run always')
                .addDropdown(dropdown => {
                    dropdown.addOption('', 'Always (No Group)');
                    this.config.groups.forEach(g => dropdown.addOption(g.id, g.name));
                    dropdown.setValue(rule.groupId || '');
                    dropdown.onChange(value => {
                        rule.groupId = value || undefined;
                        this.onUpdate(this.config);
                        this.display(); // Re-render to update title
                    });
                });

            // Actions
            const actionsDiv = ruleDiv.createDiv('rule-actions');
            actionsDiv.createEl('h5', { text: 'Actions' });

            rule.actionIds.forEach((actionId, actionIndex) => {
                const action = this.config.actions.find(a => a.id === actionId);
                if (action) {
                    new Setting(actionsDiv)
                        .setName(`${actionIndex + 1}. ${action.name}`)
                        .addExtraButton(btn => btn
                            .setIcon('cross')
                            .setTooltip('Remove Action')
                            .onClick(() => {
                                rule.actionIds.splice(actionIndex, 1);
                                this.onUpdate(this.config);
                                this.display();
                            }));
                }
            });

            new Setting(actionsDiv)
                .setName('Add Action')
                .addDropdown(dropdown => {
                    dropdown.addOption('', 'Select Action');
                    this.config.actions.forEach(a => dropdown.addOption(a.id, a.name));
                    dropdown.onChange(value => {
                        if (value) {
                            rule.actionIds.push(value);
                            this.onUpdate(this.config);
                            this.display();
                        }
                    });
                });
        });

        // Add Rule Button
        new Setting(rulesContainer)
            .addButton(btn => btn
                .setButtonText('Add Rule')
                .onClick(() => {
                    ruleset.rules.push({
                        actionIds: []
                    });
                    this.onUpdate(this.config);
                    this.display();
                }));
    }
}
