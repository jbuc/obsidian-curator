import { App, Setting, Modal, setIcon } from 'obsidian';
import { CuratorConfig, Ruleset } from '../../core/types';
import { FolderSuggest } from './FolderSuggest';
import { QueryHelperModal } from './QueryHelperModal';
import { GroupService } from '../../core/GroupService';

export class RulesTab {
    private app: App;
    private containerEl: HTMLElement;
    private config: CuratorConfig;
    private onUpdate: (config: CuratorConfig) => void;

    // State for collapsed items (Ruleset ID or Rule ID)
    private collapsedItems: Set<string> = new Set();
    private groupService: GroupService;

    constructor(app: App, containerEl: HTMLElement, config: CuratorConfig, onUpdate: (config: CuratorConfig) => void) {
        this.app = app;
        this.containerEl = containerEl;
        this.config = config;
        this.onUpdate = onUpdate;
        this.groupService = new GroupService(app);
    }

    private async validateQueryInput(inputEl: HTMLTextAreaElement, statusEl: HTMLElement, query: string) {
        statusEl.setText('Checking...');
        statusEl.style.color = 'var(--text-muted)';

        const { valid, error } = await this.groupService.validateQuery(query);

        if (valid) {
            statusEl.setText('Valid');
            statusEl.style.color = 'var(--text-success)';
            inputEl.style.borderColor = '';
        } else {
            statusEl.setText(`Invalid: ${error}`);
            statusEl.style.color = 'var(--text-error)';
            inputEl.style.borderColor = 'var(--text-error)';
        }
    }

    public display(): void {
        this.containerEl.empty();
        this.containerEl.createEl('h3', { text: 'Rules Configuration' });
        this.containerEl.createEl('p', { text: 'Connect Triggers, Groups, and Jobs to create automated workflows.' });

        const globalControls = this.containerEl.createDiv('curator-global-controls');

        new Setting(globalControls)
            .addButton(btn => btn
                .setButtonText('Expand All')
                .onClick(() => {
                    this.collapsedItems.clear();
                    this.display();
                }))
            .addButton(btn => btn
                .setButtonText('Collapse All')
                .onClick(() => {
                    this.config.rulesets.forEach(r => {
                        this.collapsedItems.add(r.id);
                        r.rules.forEach(rule => {
                            if (rule.id) this.collapsedItems.add(rule.id);
                        });
                    });
                    this.display();
                }));

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
            trigger: { type: 'change_to', query: '' },
            rules: []
        };
        this.config.rulesets.push(newRuleset);
        this.onUpdate(this.config);
        this.display();
    }

    private renderRuleset(container: HTMLElement, ruleset: Ruleset, index: number) {
        const rulesetContainer = container.createDiv('curator-ruleset-container');

        // Header
        const header = rulesetContainer.createDiv('curator-ruleset-header');
        if (this.collapsedItems.has(ruleset.id)) {
            header.classList.add('collapsed');
        }

        // Name Input
        const nameInputDiv = header.createDiv('curator-ruleset-name-input');
        const nameInput = nameInputDiv.createEl('input', { type: 'text', value: ruleset.name });
        nameInput.placeholder = 'Ruleset Name';
        nameInput.oninput = () => {
            ruleset.name = nameInput.value;
            this.onUpdate(this.config);
        };
        // Stop propagation to prevent collapse when typing
        nameInput.onclick = (e) => e.stopPropagation();

        // Controls
        const controls = header.createDiv('curator-ruleset-controls');

        // Enabled Toggle
        const toggleLabel = controls.createEl('label');
        toggleLabel.className = 'checkbox-container';
        const toggle = toggleLabel.createEl('input', { type: 'checkbox' });
        toggle.checked = ruleset.enabled;
        toggle.onclick = (e) => {
            e.stopPropagation();
            ruleset.enabled = toggle.checked;
            this.onUpdate(this.config);
        };
        toggleLabel.createEl('span', { cls: 'checkbox-switch' }); // Optional custom styling hook
        toggleLabel.title = 'Enable/Disable Ruleset';

        // Reordering
        const moveUpBtn = controls.createEl('button', { cls: 'clickable-icon' });
        setIcon(moveUpBtn, 'arrow-up');
        moveUpBtn.onclick = (e) => {
            e.stopPropagation();
            if (index > 0) {
                [this.config.rulesets[index - 1], this.config.rulesets[index]] = [this.config.rulesets[index], this.config.rulesets[index - 1]];
                this.onUpdate(this.config);
                this.display();
            }
        };
        if (index === 0) moveUpBtn.disabled = true;

        const moveDownBtn = controls.createEl('button', { cls: 'clickable-icon' });
        setIcon(moveDownBtn, 'arrow-down');
        moveDownBtn.onclick = (e) => {
            e.stopPropagation();
            if (index < this.config.rulesets.length - 1) {
                [this.config.rulesets[index + 1], this.config.rulesets[index]] = [this.config.rulesets[index], this.config.rulesets[index + 1]];
                this.onUpdate(this.config);
                this.display();
            }
        };
        if (index === this.config.rulesets.length - 1) moveDownBtn.disabled = true;

        // Collapse/Expand
        const collapseBtn = controls.createEl('button', { cls: 'clickable-icon' });
        setIcon(collapseBtn, this.collapsedItems.has(ruleset.id) ? 'chevron-right' : 'chevron-down');
        collapseBtn.onclick = (e) => {
            e.stopPropagation();
            if (this.collapsedItems.has(ruleset.id)) {
                this.collapsedItems.delete(ruleset.id);
            } else {
                this.collapsedItems.add(ruleset.id);
            }
            this.display();
        };

        // Delete
        const deleteBtn = controls.createEl('button', { cls: 'clickable-icon' });
        setIcon(deleteBtn, 'trash');
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete ruleset "${ruleset.name}"?`)) {
                this.config.rulesets.splice(index, 1);
                this.onUpdate(this.config);
                this.display();
            }
        };

        // Header Click to Collapse
        header.onclick = () => {
            if (this.collapsedItems.has(ruleset.id)) {
                this.collapsedItems.delete(ruleset.id);
            } else {
                this.collapsedItems.add(ruleset.id);
            }
            this.display();
        };

        if (this.collapsedItems.has(ruleset.id)) {
            return;
        }

        // Body
        const body = rulesetContainer.createDiv('curator-ruleset-body');

        // Trigger Section
        const triggerDiv = body.createDiv('curator-trigger-config');
        triggerDiv.createDiv('curator-section-title').setText('Trigger');

        new Setting(triggerDiv)
            .setName('When...')
            .addDropdown(dropdown => dropdown
                .addOption('change_from', 'Notes change from...')
                .addOption('change_to', 'Notes change to...')
                .addOption('startup', 'Obsidian starts')
                .addOption('schedule', 'Scheduled time')
                .addOption('manual', 'A command runs')
                .setValue(ruleset.trigger.type)
                .onChange(value => {
                    ruleset.trigger.type = value as any;
                    if (ruleset.trigger.type === 'manual') ruleset.trigger.commandName = 'Run My Rule';
                    this.onUpdate(this.config);
                    this.display();
                }));

        if (ruleset.trigger.type === 'change_from' || ruleset.trigger.type === 'change_to') {
            new Setting(triggerDiv)
                .setName('Dataview Query')
                .setDesc('Define the set of notes to monitor.')
                .addExtraButton(btn => btn
                    .setIcon('help-circle')
                    .setTooltip('Query Templates')
                    .onClick(() => {
                        new QueryHelperModal(this.app, (query) => {
                            ruleset.trigger.query = query;
                            this.onUpdate(this.config);
                            this.display();
                        }).open();
                    }))
                .addTextArea(text => {
                    text.setPlaceholder('FROM "projects" AND #active')
                        .setValue(ruleset.trigger.query || '');

                    const statusEl = triggerDiv.createDiv('query-status');
                    statusEl.style.fontSize = '0.8em';
                    statusEl.style.marginTop = '5px';

                    this.validateQueryInput(text.inputEl, statusEl, ruleset.trigger.query || '');

                    text.inputEl.oninput = (e) => {
                        const val = (e.target as HTMLTextAreaElement).value;
                        ruleset.trigger.query = val;
                        this.onUpdate(this.config);
                        this.validateQueryInput(text.inputEl, statusEl, val);
                    };
                });
        } else if (ruleset.trigger.type === 'schedule') {
            new Setting(triggerDiv)
                .setName('Time (HH:mm)')
                .addText(text => text
                    .setPlaceholder('09:00')
                    .setValue(ruleset.trigger.time || '')
                    .onChange(value => {
                        ruleset.trigger.time = value;
                        this.onUpdate(this.config);
                    }));

            const daysDiv = triggerDiv.createDiv('days-of-week');
            daysDiv.style.marginTop = '10px';
            daysDiv.createEl('span', { text: 'Days: ' });

            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            days.forEach((day, index) => {
                const label = daysDiv.createEl('label');
                label.style.marginRight = '10px';
                const checkbox = label.createEl('input', { type: 'checkbox' });
                checkbox.checked = ruleset.trigger.days ? ruleset.trigger.days.includes(index) : true;
                checkbox.onchange = () => {
                    if (!ruleset.trigger.days) ruleset.trigger.days = [0, 1, 2, 3, 4, 5, 6];
                    if (checkbox.checked) {
                        if (!ruleset.trigger.days.includes(index)) ruleset.trigger.days.push(index);
                    } else {
                        ruleset.trigger.days = ruleset.trigger.days.filter(d => d !== index);
                    }
                    this.onUpdate(this.config);
                };
                label.createEl('span', { text: day });
            });
        } else if (ruleset.trigger.type === 'manual') {
            new Setting(triggerDiv)
                .setName('Command Name')
                .addText(text => text
                    .setValue(ruleset.trigger.commandName || '')
                    .onChange(value => {
                        ruleset.trigger.commandName = value;
                        this.onUpdate(this.config);
                    }));
        }

        // Test Run Button
        const testBtnDiv = body.createDiv();
        testBtnDiv.style.textAlign = 'right';
        testBtnDiv.style.marginBottom = '15px';
        const testBtn = testBtnDiv.createEl('button', { text: 'Test Run (Dry Run)' });
        testBtn.onclick = async () => {
            const { RulesetService } = await import('../../core/RulesetService');
            const { GroupService } = await import('../../core/GroupService');
            const { TriggerService } = await import('../../core/TriggerService');
            const { BinderService } = await import('../../core/BinderService');
            const { ActionService } = await import('../../core/ActionService');

            const binder = new BinderService(this.app);
            const groupService = new GroupService(this.app);
            const triggerService = new TriggerService(this.app);
            const actionService = new ActionService(this.app, binder);
            const rulesetService = new RulesetService(this.app, triggerService, groupService, binder, actionService);

            rulesetService.updateConfig(this.config);
            const results = await rulesetService.dryRun(ruleset.id);

            const modal = new Modal(this.app);
            modal.titleEl.setText(`Dry Run: ${ruleset.name}`);
            if (results.length === 0) {
                modal.contentEl.createEl('p', { text: 'No files matched the criteria.' });
            } else {
                modal.contentEl.createEl('p', { text: `Found ${results.length} matches:` });
                const list = modal.contentEl.createEl('div');
                list.style.maxHeight = '400px';
                list.style.overflowY = 'auto';
                results.forEach(r => {
                    const item = list.createDiv();
                    item.style.marginBottom = '5px';
                    item.style.borderBottom = '1px solid var(--background-modifier-border)';
                    item.createEl('strong', { text: r.file.path });
                    const actionsList = item.createEl('ul');
                    r.actions.forEach(a => actionsList.createEl('li', { text: `Action: ${a}` }));
                });
            }
            modal.open();
        };

        // Rules List
        const rulesList = body.createDiv('curator-rules-list');
        rulesList.createDiv('curator-section-title').setText('Rules');

        ruleset.rules.forEach((rule, ruleIndex) => {
            if (!rule.id) rule.id = crypto.randomUUID();

            const ruleItem = rulesList.createDiv('curator-rule-item');

            // Rule Header
            const ruleHeader = ruleItem.createDiv('curator-rule-header');
            ruleHeader.createSpan({ text: `Rule ${ruleIndex + 1}`, cls: 'curator-rule-title' });

            const ruleControls = ruleHeader.createDiv('curator-controls');

            const rMoveUp = ruleControls.createEl('button', { cls: 'clickable-icon' });
            setIcon(rMoveUp, 'arrow-up');
            rMoveUp.onclick = (e) => {
                e.stopPropagation();
                if (ruleIndex > 0) {
                    [ruleset.rules[ruleIndex - 1], ruleset.rules[ruleIndex]] = [ruleset.rules[ruleIndex], ruleset.rules[ruleIndex - 1]];
                    this.onUpdate(this.config);
                    this.display();
                }
            };
            if (ruleIndex === 0) rMoveUp.disabled = true;

            const rMoveDown = ruleControls.createEl('button', { cls: 'clickable-icon' });
            setIcon(rMoveDown, 'arrow-down');
            rMoveDown.onclick = (e) => {
                e.stopPropagation();
                if (ruleIndex < ruleset.rules.length - 1) {
                    [ruleset.rules[ruleIndex + 1], ruleset.rules[ruleIndex]] = [ruleset.rules[ruleIndex], ruleset.rules[ruleIndex + 1]];
                    this.onUpdate(this.config);
                    this.display();
                }
            };
            if (ruleIndex === ruleset.rules.length - 1) rMoveDown.disabled = true;

            const rCollapse = ruleControls.createEl('button', { cls: 'clickable-icon' });
            setIcon(rCollapse, this.collapsedItems.has(rule.id!) ? 'chevron-right' : 'chevron-down');
            rCollapse.onclick = (e) => {
                e.stopPropagation();
                if (this.collapsedItems.has(rule.id!)) {
                    this.collapsedItems.delete(rule.id!);
                } else {
                    this.collapsedItems.add(rule.id!);
                }
                this.display();
            };

            const rDelete = ruleControls.createEl('button', { cls: 'clickable-icon' });
            setIcon(rDelete, 'trash');
            rDelete.onclick = (e) => {
                e.stopPropagation();
                ruleset.rules.splice(ruleIndex, 1);
                this.onUpdate(this.config);
                this.display();
            };

            ruleHeader.onclick = () => {
                if (this.collapsedItems.has(rule.id!)) {
                    this.collapsedItems.delete(rule.id!);
                } else {
                    this.collapsedItems.add(rule.id!);
                }
                this.display();
            };

            if (this.collapsedItems.has(rule.id!)) {
                return;
            }

            const ruleBody = ruleItem.createDiv('curator-rule-body');

            // Condition
            const querySetting = new Setting(ruleBody);
            querySetting.setName('Condition (Dataview Query)');
            querySetting.setDesc('Leave empty to match all files.');

            if (ruleset.trigger.type === 'change_from' || ruleset.trigger.type === 'change_to') {
                querySetting.addToggle(toggle => toggle
                    .setValue(rule.useTriggerQuery || false)
                    .setTooltip('Use the Trigger\'s query for this rule')
                    .onChange(value => {
                        rule.useTriggerQuery = value;
                        this.onUpdate(this.config);
                        this.display();
                    }));
            }

            if (!rule.useTriggerQuery) {
                querySetting.addExtraButton(btn => btn
                    .setIcon('help-circle')
                    .setTooltip('Query Templates')
                    .onClick(() => {
                        new QueryHelperModal(this.app, (query) => {
                            rule.query = query;
                            this.onUpdate(this.config);
                            this.display();
                        }).open();
                    }));

                const queryContainer = ruleBody.createDiv();
                const textArea = queryContainer.createEl('textarea');
                textArea.style.width = '100%';
                textArea.style.minHeight = '60px';
                textArea.style.marginBottom = '10px';
                textArea.placeholder = 'FROM "folder" AND #tag';
                textArea.value = rule.query;

                const statusEl = queryContainer.createDiv('query-status');
                statusEl.style.fontSize = '0.8em';
                statusEl.style.marginBottom = '10px';

                this.validateQueryInput(textArea, statusEl, rule.query);

                textArea.oninput = (e) => {
                    const val = (e.target as HTMLTextAreaElement).value;
                    rule.query = val;
                    this.onUpdate(this.config);
                    this.validateQueryInput(textArea, statusEl, val);
                };
            } else {
                ruleBody.createEl('p', { text: 'Condition: Matches Trigger Scope (Inherited)', cls: 'text-muted' });
                if (rule.query) rule.query = '';
            }

            // Actions
            const actionsDiv = ruleBody.createDiv('curator-action-list');
            actionsDiv.createDiv('curator-section-title').setText('Actions');

            rule.actions.forEach((action, actionIndex) => {
                const actionItem = actionsDiv.createDiv('curator-action-item');

                // Controls
                const aControls = actionItem.createDiv('curator-controls');
                const aMoveUp = aControls.createEl('button', { cls: 'clickable-icon' });
                setIcon(aMoveUp, 'arrow-up');
                aMoveUp.onclick = () => {
                    if (actionIndex > 0) {
                        [rule.actions[actionIndex - 1], rule.actions[actionIndex]] = [rule.actions[actionIndex], rule.actions[actionIndex - 1]];
                        this.onUpdate(this.config);
                        this.display();
                    }
                };
                if (actionIndex === 0) aMoveUp.disabled = true;

                const aMoveDown = aControls.createEl('button', { cls: 'clickable-icon' });
                setIcon(aMoveDown, 'arrow-down');
                aMoveDown.onclick = () => {
                    if (actionIndex < rule.actions.length - 1) {
                        [rule.actions[actionIndex + 1], rule.actions[actionIndex]] = [rule.actions[actionIndex], rule.actions[actionIndex + 1]];
                        this.onUpdate(this.config);
                        this.display();
                    }
                };
                if (actionIndex === rule.actions.length - 1) aMoveDown.disabled = true;

                // Config
                const configDiv = actionItem.createDiv('curator-action-config');

                const typeSelect = configDiv.createEl('select');
                ['move', 'rename', 'tag', 'update'].forEach(t => {
                    const opt = typeSelect.createEl('option', { text: t, value: t });
                    if (t === action.type) opt.selected = true;
                });
                typeSelect.onchange = () => {
                    action.type = typeSelect.value as any;
                    if (action.type === 'move') action.config = { folder: '' };
                    else if (action.type === 'rename') action.config = { prefix: '', suffix: '' };
                    else if (action.type === 'tag') action.config = { tag: '', operation: 'add' };
                    else if (action.type === 'update') action.config = { key: '', value: '' };
                    this.onUpdate(this.config);
                    this.display();
                };

                if (action.type === 'move') {
                    const folderInput = configDiv.createEl('input', { type: 'text' });
                    folderInput.placeholder = 'Folder Path';
                    folderInput.value = action.config.folder || '';
                    new FolderSuggest(this.app, folderInput);
                    folderInput.oninput = () => {
                        action.config.folder = folderInput.value;
                        this.onUpdate(this.config);
                    };
                } else if (action.type === 'tag') {
                    const tagInput = configDiv.createEl('input', { type: 'text' });
                    tagInput.placeholder = '#tag';
                    tagInput.value = action.config.tag || '';
                    tagInput.oninput = () => {
                        action.config.tag = tagInput.value;
                        this.onUpdate(this.config);
                    };
                    const opSelect = configDiv.createEl('select');
                    ['add', 'remove'].forEach(op => {
                        const opt = opSelect.createEl('option', { text: op, value: op });
                        if (op === action.config.operation) opt.selected = true;
                    });
                    opSelect.onchange = () => {
                        action.config.operation = opSelect.value as any;
                        this.onUpdate(this.config);
                    };
                } else if (action.type === 'update') {
                    const keyInput = configDiv.createEl('input', { type: 'text' });
                    keyInput.placeholder = 'Property Key';
                    keyInput.value = action.config.key || '';
                    keyInput.oninput = () => {
                        action.config.key = keyInput.value;
                        this.onUpdate(this.config);
                    };
                    const valInput = configDiv.createEl('input', { type: 'text' });
                    valInput.placeholder = 'Value';
                    valInput.value = action.config.value || '';
                    valInput.oninput = () => {
                        action.config.value = valInput.value;
                        this.onUpdate(this.config);
                    };
                } else if (action.type === 'rename') {
                    const prefixInput = configDiv.createEl('input', { type: 'text' });
                    prefixInput.placeholder = 'Prefix';
                    prefixInput.value = action.config.prefix || '';
                    prefixInput.oninput = () => { action.config.prefix = prefixInput.value; this.onUpdate(this.config); };
                    const suffixInput = configDiv.createEl('input', { type: 'text' });
                    suffixInput.placeholder = 'Suffix';
                    suffixInput.value = action.config.suffix || '';
                    suffixInput.oninput = () => { action.config.suffix = suffixInput.value; this.onUpdate(this.config); };
                }

                const aDelete = actionItem.createEl('button', { cls: 'clickable-icon' });
                setIcon(aDelete, 'trash');
                aDelete.onclick = () => {
                    rule.actions.splice(actionIndex, 1);
                    this.onUpdate(this.config);
                    this.display();
                };
            });

            const addActionBtn = rulesList.createEl('button', { text: '+ Add Action' });
            addActionBtn.style.marginTop = '5px';
            addActionBtn.onclick = () => {
                rule.actions.push({ type: 'move', config: { folder: '' } });
                this.onUpdate(this.config);
                this.display();
            };
        });

        const addRuleBtn = body.createEl('button', { text: '+ Add Rule' });
        addRuleBtn.style.marginTop = '10px';
        addRuleBtn.onclick = () => {
            ruleset.rules.push({
                id: crypto.randomUUID(),
                query: '',
                actions: []
            });
            this.onUpdate(this.config);
            this.display();
        };
    }
}
