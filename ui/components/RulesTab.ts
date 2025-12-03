import { App, Setting, Modal, setIcon, Notice, TFile, ToggleComponent } from 'obsidian';
import { CuratorConfig, Ruleset } from '../../core/types';
import { FolderSuggest } from './FolderSuggest';
import { QueryHelperModal } from './QueryHelperModal';
import { AddRulesetModal } from './AddRulesetModal';
import { ImportRulesetModal } from './ImportRulesetModal';
import { GroupService } from '../../core/GroupService';
import { RulesetService } from '../../core/RulesetService';

export class RulesTab {
    private app: App;
    private containerEl: HTMLElement;
    private rulesetService: RulesetService;

    // State for collapsed items (Ruleset ID or Rule ID)
    private collapsedItems: Set<string> = new Set();
    private groupService: GroupService;
    private defaultRulesetFolder: string;

    constructor(app: App, containerEl: HTMLElement, rulesetService: RulesetService, defaultRulesetFolder: string) {
        this.app = app;
        this.containerEl = containerEl;
        this.rulesetService = rulesetService;
        this.groupService = new GroupService(app);
        this.defaultRulesetFolder = defaultRulesetFolder;
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
        const rulesets = this.rulesetService.getRulesets().sort((a, b) => a.name.localeCompare(b.name));

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
                    rulesets.forEach(r => {
                        this.collapsedItems.add(r.id);
                        r.rules.forEach(rule => {
                            if (rule.id) this.collapsedItems.add(rule.id);
                        });
                    });
                    this.display();
                }))


        // Import Ruleset
        new Setting(this.containerEl)
            .setName('Import Ruleset')
            .setDesc('Import a ruleset from a markdown file.')
            .addButton(btn => btn
                .setButtonText('Import')
                .onClick(() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.md';
                    input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                            // We need to find the TFile in the vault that matches this?
                            // Or does the user select from the vault?
                            // Obsidian API doesn't have a native "File Picker" for vault files easily accessible here?
                            // Let's use a SuggestModal for files.
                        }
                    };
                    // input.click(); // This opens system dialog, which gives us a File object, not TFile.

                    // Better approach: Use a Modal with FileSuggest
                    new ImportRulesetModal(this.app, async (file) => {
                        await this.rulesetService.importRuleset(file);
                        this.display();
                        new Notice(`Imported ruleset from ${file.path}`);
                    }).open();
                }));

        new Setting(this.containerEl)
            .setName('Add New Ruleset')
            .setDesc('Create a new rule to automate your notes.')
            .addButton(button => button
                .setButtonText('Add Ruleset')
                .setCta()
                .onClick(async () => {
                    await this.addRuleset();
                }));

        const rulesetsList = this.containerEl.createDiv('rulesets-list');

        rulesets.forEach((ruleset, index) => {
            this.renderRuleset(rulesetsList, ruleset, index);
        });
    }

    private async addRuleset() {
        // Simplified Add: Just Name and Trigger
        const modal = new AddRulesetModal(this.app, this.defaultRulesetFolder, async (name, triggerType, folder) => {
            // Note: 'folder' is ignored now as we don't auto-create files
            const newRuleset: Ruleset = {
                id: crypto.randomUUID(),
                name: name,
                enabled: true,
                trigger: { type: triggerType, query: '' },
                rules: []
            };

            if (triggerType === 'manual') {
                newRuleset.trigger.commandName = `Run ${name}`;
            }

            await this.rulesetService.saveRuleset(newRuleset);
            this.collapsedItems.delete(newRuleset.id);
            this.display();
        });
        modal.open();
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
        nameInput.onchange = async () => {
            ruleset.name = nameInput.value;
            await this.rulesetService.saveRuleset(ruleset);
        };
        nameInput.onclick = (e) => e.stopPropagation();

        // Controls
        const controls = header.createDiv('curator-ruleset-controls');

        // Export Button
        const exportBtn = controls.createEl('button', { cls: 'clickable-icon' });
        setIcon(exportBtn, 'file-output');
        exportBtn.title = 'Export to Markdown';
        exportBtn.onclick = async (e) => {
            e.stopPropagation();
            if (confirm(`Export ruleset "${ruleset.name}" to ${this.defaultRulesetFolder}?`)) {
                if (!(await this.app.vault.adapter.exists(this.defaultRulesetFolder))) {
                    await this.app.vault.createFolder(this.defaultRulesetFolder);
                }
                await this.rulesetService.exportRuleset(ruleset, this.defaultRulesetFolder);
                new Notice(`Exported to ${this.defaultRulesetFolder}`);
            }
        };

        // Enabled Toggle
        const toggle = new ToggleComponent(controls)
            .setValue(ruleset.enabled)
            .setTooltip('Enable/Disable Ruleset')
            .onChange(async (value) => {
                ruleset.enabled = value;
                await this.rulesetService.saveRuleset(ruleset);
            });
        toggle.toggleEl.addEventListener('click', (e) => e.stopPropagation());

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
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete ruleset "${ruleset.name}"?`)) {
                await this.rulesetService.deleteRuleset(ruleset);
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
                .onChange(async value => {
                    ruleset.trigger.type = value as any;
                    if (ruleset.trigger.type === 'manual') ruleset.trigger.commandName = 'Run My Rule';
                    await this.rulesetService.saveRuleset(ruleset);
                    this.display();
                }));

        if (ruleset.trigger.type === 'change_from' || ruleset.trigger.type === 'change_to') {
            // Dataview Query - Full Width
            const querySettingDiv = triggerDiv.createDiv('curator-full-width-setting');
            const topRow = querySettingDiv.createDiv('setting-top-row');
            topRow.createDiv('setting-name').setText('Dataview Query');
            const helpBtn = topRow.createEl('button', { cls: 'clickable-icon' });
            setIcon(helpBtn, 'help-circle');
            helpBtn.onclick = () => {
                new QueryHelperModal(this.app, async (query) => {
                    ruleset.trigger.query = query;
                    await this.rulesetService.saveRuleset(ruleset);
                    this.display();
                }).open();
            };

            querySettingDiv.createDiv('setting-desc').setText('Define the set of notes to monitor.');

            const textArea = querySettingDiv.createEl('textarea');
            textArea.placeholder = 'FROM "projects" AND #active';
            textArea.value = ruleset.trigger.query || '';
            textArea.rows = 3;

            const statusEl = querySettingDiv.createDiv('query-status');
            this.validateQueryInput(textArea, statusEl, ruleset.trigger.query || '');

            textArea.onchange = async (e) => {
                const val = (e.target as HTMLTextAreaElement).value;
                ruleset.trigger.query = val;
                await this.rulesetService.saveRuleset(ruleset);
                this.validateQueryInput(textArea, statusEl, val);
            };
        } else if (ruleset.trigger.type === 'schedule') {
            new Setting(triggerDiv)
                .setName('Time (HH:mm)')
                .addText(text => text
                    .setPlaceholder('09:00')
                    .setValue(ruleset.trigger.time || '')
                    .onChange(async value => {
                        ruleset.trigger.time = value;
                        await this.rulesetService.saveRuleset(ruleset);
                    }));
            // ... days (omitted for brevity, assume unchanged logic if not requested)
            // Re-adding days logic for completeness
            const daysDiv = triggerDiv.createDiv('days-of-week');
            daysDiv.style.marginTop = '10px';
            daysDiv.createEl('span', { text: 'Days: ' });
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            days.forEach((day, index) => {
                const label = daysDiv.createEl('label');
                label.style.marginRight = '10px';
                const checkbox = label.createEl('input', { type: 'checkbox' });
                checkbox.checked = ruleset.trigger.days ? ruleset.trigger.days.includes(index) : true;
                checkbox.onchange = async () => {
                    if (!ruleset.trigger.days) ruleset.trigger.days = [0, 1, 2, 3, 4, 5, 6];
                    if (checkbox.checked) {
                        if (!ruleset.trigger.days.includes(index)) ruleset.trigger.days.push(index);
                    } else {
                        ruleset.trigger.days = ruleset.trigger.days.filter(d => d !== index);
                    }
                    await this.rulesetService.saveRuleset(ruleset);
                };
                label.createEl('span', { text: day });
            });
        } else if (ruleset.trigger.type === 'manual') {
            new Setting(triggerDiv)
                .setName('Command Name')
                .addText(text => text
                    .setValue(ruleset.trigger.commandName || '')
                    .onChange(async value => {
                        ruleset.trigger.commandName = value;
                        await this.rulesetService.saveRuleset(ruleset);
                    }));
        }

        // Test Run Button
        const testBtnDiv = body.createDiv();
        testBtnDiv.style.textAlign = 'right';
        testBtnDiv.style.marginBottom = '15px';
        const testBtn = testBtnDiv.createEl('button', { text: 'Test Run (Dry Run)' });
        testBtn.onclick = async () => {
            const results = await this.rulesetService.dryRun(ruleset.id);
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

            // Rule Name Input
            const ruleNameInput = ruleHeader.createEl('input', { type: 'text', cls: 'curator-rule-name-input' });
            ruleNameInput.value = rule.name || `Rule ${ruleIndex + 1}`;
            ruleNameInput.placeholder = 'Rule Name';
            ruleNameInput.onclick = (e) => e.stopPropagation();
            ruleNameInput.onchange = async () => {
                rule.name = ruleNameInput.value;
                await this.rulesetService.saveRuleset(ruleset);
            };

            const ruleControls = ruleHeader.createDiv('curator-controls');

            const rMoveUp = ruleControls.createEl('button', { cls: 'clickable-icon' });
            setIcon(rMoveUp, 'arrow-up');
            rMoveUp.onclick = async (e) => {
                e.stopPropagation();
                if (ruleIndex > 0) {
                    [ruleset.rules[ruleIndex - 1], ruleset.rules[ruleIndex]] = [ruleset.rules[ruleIndex], ruleset.rules[ruleIndex - 1]];
                    await this.rulesetService.saveRuleset(ruleset);
                    this.display();
                }
            };
            if (ruleIndex === 0) rMoveUp.disabled = true;

            const rMoveDown = ruleControls.createEl('button', { cls: 'clickable-icon' });
            setIcon(rMoveDown, 'arrow-down');
            rMoveDown.onclick = async (e) => {
                e.stopPropagation();
                if (ruleIndex < ruleset.rules.length - 1) {
                    [ruleset.rules[ruleIndex + 1], ruleset.rules[ruleIndex]] = [ruleset.rules[ruleIndex], ruleset.rules[ruleIndex + 1]];
                    await this.rulesetService.saveRuleset(ruleset);
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
            rDelete.onclick = async (e) => {
                e.stopPropagation();
                ruleset.rules.splice(ruleIndex, 1);
                await this.rulesetService.saveRuleset(ruleset);
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
            const conditionHeader = ruleBody.createDiv('curator-condition-header');
            const conditionTitle = conditionHeader.createDiv('curator-section-title');
            conditionTitle.setText('Condition (Dataview Query)');
            conditionTitle.style.marginBottom = '0';

            if (ruleset.trigger.type === 'change_from' || ruleset.trigger.type === 'change_to') {
                const customControl = conditionHeader.createDiv('curator-inherit-control');
                const span = customControl.createSpan({ text: 'Custom Query' });
                span.style.marginRight = '8px';
                span.style.fontSize = '0.9em';

                const isCustom = !rule.useTriggerQuery;
                const toggle = new ToggleComponent(customControl)
                    .setValue(isCustom)
                    .setTooltip('Enable to define a custom query for this rule')
                    .onChange(async (value) => {
                        rule.useTriggerQuery = !value;
                        await this.rulesetService.saveRuleset(ruleset);
                        this.display();
                    });
            }

            if (!rule.useTriggerQuery) {
                const queryContainer = ruleBody.createDiv('curator-query-container');

                const textArea = queryContainer.createEl('textarea');
                textArea.style.width = '100%';
                textArea.style.minHeight = '60px';
                textArea.style.marginBottom = '5px';
                textArea.placeholder = 'FROM "folder" AND #tag';
                textArea.value = rule.query;

                const statusEl = queryContainer.createDiv('query-status');
                statusEl.style.fontSize = '0.8em';
                statusEl.style.marginBottom = '10px';

                this.validateQueryInput(textArea, statusEl, rule.query);

                textArea.onchange = async (e) => {
                    const val = (e.target as HTMLTextAreaElement).value;
                    rule.query = val;
                    await this.rulesetService.saveRuleset(ruleset);
                    this.validateQueryInput(textArea, statusEl, val);
                };
            } else {
                const infoMsg = ruleBody.createDiv('curator-inherited-msg');
                infoMsg.setText('By default, Curator will use the trigger query.');
                infoMsg.style.color = 'var(--text-muted)';
                infoMsg.style.fontStyle = 'italic';
                infoMsg.style.marginBottom = '10px';

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
                aMoveUp.onclick = async () => {
                    if (actionIndex > 0) {
                        [rule.actions[actionIndex - 1], rule.actions[actionIndex]] = [rule.actions[actionIndex], rule.actions[actionIndex - 1]];
                        await this.rulesetService.saveRuleset(ruleset);
                        this.display();
                    }
                };
                if (actionIndex === 0) aMoveUp.disabled = true;

                const aMoveDown = aControls.createEl('button', { cls: 'clickable-icon' });
                setIcon(aMoveDown, 'arrow-down');
                aMoveDown.onclick = async (e) => {
                    if (actionIndex < rule.actions.length - 1) {
                        [rule.actions[actionIndex + 1], rule.actions[actionIndex]] = [rule.actions[actionIndex], rule.actions[actionIndex + 1]];
                        await this.rulesetService.saveRuleset(ruleset);
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
                typeSelect.onchange = async () => {
                    action.type = typeSelect.value as any;
                    if (action.type === 'move') action.config = { folder: '' };
                    else if (action.type === 'rename') action.config = { prefix: '', suffix: '' };
                    else if (action.type === 'tag') action.config = { tag: '', operation: 'add' };
                    else if (action.type === 'update') action.config = { key: '', value: '' };
                    await this.rulesetService.saveRuleset(ruleset);
                    this.display();
                };

                if (action.type === 'move') {
                    const folderInput = configDiv.createEl('input', { type: 'text' });
                    folderInput.placeholder = 'Folder Path';
                    folderInput.value = action.config.folder || '';
                    new FolderSuggest(this.app, folderInput);
                    folderInput.onchange = async () => {
                        action.config.folder = folderInput.value;
                        await this.rulesetService.saveRuleset(ruleset);
                    };
                } else if (action.type === 'tag') {
                    const tagInput = configDiv.createEl('input', { type: 'text' });
                    tagInput.placeholder = '#tag';
                    tagInput.value = action.config.tag || '';
                    tagInput.onchange = async () => {
                        action.config.tag = tagInput.value;
                        await this.rulesetService.saveRuleset(ruleset);
                    };
                    const opSelect = configDiv.createEl('select');
                    ['add', 'remove'].forEach(op => {
                        const opt = opSelect.createEl('option', { text: op, value: op });
                        if (op === action.config.operation) opt.selected = true;
                    });
                    opSelect.onchange = async () => {
                        action.config.operation = opSelect.value as any;
                        await this.rulesetService.saveRuleset(ruleset);
                    };
                } else if (action.type === 'update') {
                    const keyInput = configDiv.createEl('input', { type: 'text' });
                    keyInput.placeholder = 'Property Key';
                    keyInput.value = action.config.key || '';
                    keyInput.onchange = async () => {
                        action.config.key = keyInput.value;
                        await this.rulesetService.saveRuleset(ruleset);
                    };
                    const valInput = configDiv.createEl('input', { type: 'text' });
                    valInput.placeholder = 'Value';
                    valInput.value = action.config.value || '';
                    valInput.onchange = async () => {
                        action.config.value = valInput.value;
                        await this.rulesetService.saveRuleset(ruleset);
                    };
                } else if (action.type === 'rename') {
                    const prefixInput = configDiv.createEl('input', { type: 'text' });
                    prefixInput.placeholder = 'Prefix';
                    prefixInput.value = action.config.prefix || '';
                    prefixInput.onchange = async () => { action.config.prefix = prefixInput.value; await this.rulesetService.saveRuleset(ruleset); };
                    const suffixInput = configDiv.createEl('input', { type: 'text' });
                    suffixInput.placeholder = 'Suffix';
                    suffixInput.value = action.config.suffix || '';
                    suffixInput.onchange = async () => { action.config.suffix = suffixInput.value; await this.rulesetService.saveRuleset(ruleset); };
                }

                const aDelete = actionItem.createEl('button', { cls: 'clickable-icon' });
                setIcon(aDelete, 'trash');
                aDelete.onclick = async () => {
                    rule.actions.splice(actionIndex, 1);
                    await this.rulesetService.saveRuleset(ruleset);
                    this.display();
                };
            });

            const addActionBtn = ruleBody.createEl('button', { text: '+ Add Action' });
            addActionBtn.style.marginTop = '5px';
            addActionBtn.style.width = '100%';
            addActionBtn.onclick = async () => {
                rule.actions.push({ type: 'move', config: { folder: '' } });
                await this.rulesetService.saveRuleset(ruleset);
                this.display();
            };
        });

        const addRuleBtn = body.createEl('button', { text: '+ Add Rule' });
        addRuleBtn.style.marginTop = '10px';
        addRuleBtn.onclick = async () => {
            ruleset.rules.push({
                id: crypto.randomUUID(),
                query: '',
                actions: []
            });
            await this.rulesetService.saveRuleset(ruleset);
            this.display();
        };
    }
}
