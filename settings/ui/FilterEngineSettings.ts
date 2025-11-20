import { App, Setting, Notice, TextComponent } from 'obsidian';
import { AutoNoteMoverSettings, RuleGroup } from '../settings';
import { renderFilterRulesEditor } from '../filterBuilder';
import { arrayMove } from 'utils/Utils';
import AutoNoteMover from 'main';

const collapsedGroupState = new Set<string>();
const createGroupId = () => `group-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export function renderFilterEngineSettings(app: App, plugin: AutoNoteMover, containerEl: HTMLElement, refreshCallback: () => void) {
    containerEl.createEl('h3', { text: 'Criteria Engine (beta)' });

    const introCard = containerEl.createDiv({ cls: 'anm-criteria-hero' });
    const introDesc = document.createDocumentFragment();
    introDesc.append(
        'The criteria engine allows you to create advanced rulesets to manage files based on a combination of individual or grouped criteria (similar to the filter in bases).',
        document.createElement('br'),
        'To get started, enable the criteria engine, add a rule, create your criteria, and set your actions. Once ready, activate the rule to apply changes to your vault.'
    );

    new Setting(introCard)
        .setName('Use the criteria engine')
        .setDesc(introDesc)
        .addToggle((toggle) => {
            toggle.setValue(plugin.settings.filter_engine_enabled).onChange(async (value) => {
                plugin.settings.filter_engine_enabled = value;
                await plugin.saveSettings();
                refreshCallback();
            });
        });

    if (!plugin.settings.filter_engine_enabled) {
        return;
    }

    const builderContainer = containerEl.createDiv({ cls: 'anm-filter-builder-section' });
    renderTrackedProperties(plugin, builderContainer, refreshCallback);
    renderRuleGroupsSection(app, plugin, builderContainer, refreshCallback);
    renderApplyRulesButton(plugin, builderContainer);

    renderFilterRulesJsonEditor(plugin, containerEl, refreshCallback);
}

function renderApplyRulesButton(plugin: AutoNoteMover, container: HTMLElement) {
    const applySetting = new Setting(container);
    applySetting.setName('Apply rules to vault');
    applySetting.setDesc(
        'Run the current criteria against every markdown file in your vault. This will move/rename notes and may take a while.'
    );
    applySetting.addButton((button) => {
        button.setButtonText('Apply now').setCta();
        button.onClick(async () => {
            await plugin.applyRulesToAllFiles();
        });
    });
}

function renderTrackedProperties(plugin: AutoNoteMover, container: HTMLElement, refreshCallback: () => void) {
    const card = container.createDiv({ cls: 'anm-tracked-properties' });
    new Setting(card)
        .setName('Reusable properties')
        .setDesc('Add common properties to reuse across rule criteria (e.g., file.path, tags, frontmatter.status).');

    const list = card.createDiv({ cls: 'anm-tracked-properties-list' });
    const refresh = () => {
        list.empty();
        plugin.settings.tracked_properties.forEach((prop, index) => {
            const setting = new Setting(list);
            let pendingKey = prop.key ?? '';
            let pendingLabel = prop.label ?? '';
            const syncLabel = () => {
                setting.setName(pendingLabel || pendingKey || 'Property');
            };
            syncLabel();
            setting.setDesc('');
            let keyComponent: TextComponent | null = null;
            setting.addText((text) => {
                keyComponent = text;
                text.setPlaceholder('file.path');
                text.setValue(pendingKey);
                text.onChange((value) => {
                    pendingKey = value;
                    syncLabel();
                });
                text.inputEl.onblur = async () => {
                    plugin.settings.tracked_properties[index].key = pendingKey.trim();
                    await plugin.saveSettings();
                    syncLabel();
                };
            });
            keyComponent?.inputEl.classList.add('anm-property-key');
            let labelComponent: TextComponent | null = null;
            setting.addText((text) => {
                labelComponent = text;
                text.setPlaceholder('Display name (optional)');
                text.setValue(pendingLabel);
                text.onChange((value) => {
                    pendingLabel = value;
                    syncLabel();
                });
                text.inputEl.onblur = async () => {
                    plugin.settings.tracked_properties[index].label = pendingLabel.trim() || undefined;
                    await plugin.saveSettings();
                    syncLabel();
                };
            });
            labelComponent?.inputEl.classList.add('anm-property-label');
            setting.addExtraButton((btn) => {
                btn.setIcon('trash');
                btn.setTooltip('Remove');
                btn.onClick(async () => {
                    plugin.settings.tracked_properties.splice(index, 1);
                    await plugin.saveSettings();
                    refresh();
                });
            });
        });
    };

    const addRow = new Setting(card);
    addRow.setName('');
    addRow.addButton((btn) => {
        btn.setButtonText('+ add property');
        btn.onClick(async () => {
            plugin.settings.tracked_properties.push({ key: '', label: '' });
            await plugin.saveSettings();
            refresh();
        });
    });

    refresh();
}

function renderRuleGroupsSection(app: App, plugin: AutoNoteMover, container: HTMLElement, refreshCallback: () => void) {
    const wrapper = container.createDiv({ cls: 'anm-rule-groups-section' });
    const render = () => {
        wrapper.empty();
        const groups = plugin.settings.rule_groups ?? [];
        groups.forEach((group, index) => {
            const card = wrapper.createDiv('anm-rule-group');
            const header = new Setting(card);
            header.settingEl.addClass('anm-rule-group-header');
            header.setName('');
            header.setDesc('');
            header.infoEl.empty();
            const nameInput = header.infoEl.createEl('input', {
                value: group.name,
                attr: { placeholder: 'Group name' },
                cls: 'anm-group-name-input',
            });
            nameInput.onblur = async () => {
                group.name = nameInput.value;
                await plugin.saveSettings();
            };
            const enabledToggle = header.addToggle((toggle) => {
                toggle.setValue(group.enabled);
                toggle.onChange(async (value) => {
                    group.enabled = value;
                    await plugin.saveSettings();
                });
            });
            enabledToggle.setTooltip('Enable group');
            if (index > 0) {
                header.addExtraButton((button) => {
                    button.setIcon('up-chevron-glyph');
                    button.setTooltip('Move group up');
                    button.onClick(async () => {
                        arrayMove(groups, index, index - 1);
                        await plugin.saveSettings();
                        render();
                    });
                });
            }
            if (index < groups.length - 1) {
                header.addExtraButton((button) => {
                    button.setIcon('down-chevron-glyph');
                    button.setTooltip('Move group down');
                    button.onClick(async () => {
                        arrayMove(groups, index, index + 1);
                        await plugin.saveSettings();
                        render();
                    });
                });
            }
            header.addExtraButton((button) => {
                const isCollapsed = collapsedGroupState.has(group.id);
                button.setIcon(isCollapsed ? 'chevrons-up-down' : 'chevrons-down-up');
                button.setTooltip(isCollapsed ? 'Expand group' : 'Collapse group');
                button.onClick(() => {
                    if (isCollapsed) {
                        collapsedGroupState.delete(group.id);
                    } else {
                        collapsedGroupState.add(group.id);
                    }
                    render();
                });
            });
            header.addExtraButton((button) => {
                button.setIcon('trash');
                button.setTooltip('Delete group');
                button.onClick(async () => {
                    plugin.settings.rule_groups.splice(index, 1);
                    await plugin.saveSettings();
                    render();
                });
            });
            const body = card.createDiv('anm-rule-group-body');
            if (collapsedGroupState.has(group.id)) {
                body.addClass('is-collapsed');
            } else {
                renderFilterRulesEditor(
                    app,
                    body,
                    group.rules ?? [],
                    plugin.settings.tracked_properties ?? [],
                    async () => {
                        await plugin.saveSettings();
                        plugin.refreshMetadataFingerprints();
                    }
                );
            }
        });

        const addGroupSetting = new Setting(wrapper);
        addGroupSetting.setName('');
        addGroupSetting.setDesc('');
        addGroupSetting.addButton((button) => {
            button.setButtonText('+ add group');
            button.onClick(async () => {
                plugin.settings.rule_groups.push({
                    id: createGroupId(),
                    name: `Group ${plugin.settings.rule_groups.length + 1}`,
                    enabled: true,
                    rules: [],
                });
                await plugin.saveSettings();
                render();
            });
        });
    };

    render();
}

function renderFilterRulesJsonEditor(plugin: AutoNoteMover, container: HTMLElement, refreshCallback: () => void) {
    const details = container.createEl('details', { cls: 'anm-json-editor' });
    details.createEl('summary', { text: 'Advanced: edit criteria rules as JSON' });

    const wrapper = details.createDiv();
    let draftGroupRules = JSON.stringify(plugin.settings.rule_groups ?? [], null, 2);
    const textArea = wrapper.createEl('textarea', { text: draftGroupRules });
    textArea.rows = 12;
    textArea.style.width = '100%';
    textArea.style.fontFamily = 'var(--font-monospace)';

    textArea.oninput = () => {
        draftGroupRules = textArea.value;
    };

    const buttons = wrapper.createDiv({ cls: 'anm-json-editor-actions' });

    const resetBtn = buttons.createEl('button', { text: 'Reset' });
    resetBtn.onclick = () => {
        draftGroupRules = JSON.stringify(plugin.settings.rule_groups ?? [], null, 2);
        textArea.value = draftGroupRules;
    };

    const saveBtn = buttons.createEl('button', { text: 'Save' });
    saveBtn.onclick = async () => {
        try {
            const parsed = JSON.parse(draftGroupRules) as RuleGroup[];
            plugin.settings.rule_groups = parsed;
            await plugin.saveSettings();
            plugin.refreshMetadataFingerprints();
            new Notice('Criteria rule groups saved.');
            refreshCallback();
        } catch (error) {
            console.error('[Auto Note Mover] Invalid criteria rule groups JSON', error);
            new Notice('Invalid JSON. Changes not saved.');
        }
    };
}
