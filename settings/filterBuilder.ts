import { FilterRule, FilterNode, FilterGroup, FilterCondition, RuleAction } from 'filter/filterTypes';
import { Setting, ExtraButtonComponent, ButtonComponent, DropdownComponent, TextComponent, ToggleComponent } from 'obsidian';

type OnChange = () => Promise<void> | void;

const COMPARATORS: FilterCondition['comparator'][] = [
	'equals',
	'contains',
	'startsWith',
	'endsWith',
	'matchesRegex',
	'exists',
];

const ACTION_TYPES: RuleAction['type'][] = ['move', 'applyTemplate', 'rename', 'addTag', 'removeTag'];

type QuantifierOption = 'all' | 'any';
type TruthinessOption = 'true' | 'false';

const GROUP_MODES: Array<{
	value: string;
	label: string;
	quantifier: QuantifierOption;
	truthiness: TruthinessOption;
}> = [
	{ value: 'all:true', label: 'All of the following are true', quantifier: 'all', truthiness: 'true' },
	{ value: 'any:true', label: 'Any of the following are true', quantifier: 'any', truthiness: 'true' },
	{ value: 'all:false', label: 'All of the following are false', quantifier: 'all', truthiness: 'false' },
	{ value: 'any:false', label: 'Any of the following are false', quantifier: 'any', truthiness: 'false' },
];

const getGroupQuantifier = (group: FilterGroup): QuantifierOption => (group.operator === 'any' ? 'any' : 'all');

const getGroupTruthiness = (group: FilterGroup): TruthinessOption => {
	if (group.truthiness) {
		return group.truthiness;
	}
	return group.operator === 'none' ? 'false' : 'true';
};

const updateGroupOperator = (group: FilterGroup, quantifier: QuantifierOption, truthiness: TruthinessOption) => {
	group.operator = quantifier;
	group.truthiness = truthiness;
};

const getGroupModeValue = (group: FilterGroup) => `${getGroupQuantifier(group)}:${getGroupTruthiness(group)}`;

export const renderFilterRulesEditor = (
	containerEl: HTMLElement,
	rules: FilterRule[],
	onChange: OnChange
): void => {
	injectFilterBuilderStyles();

	const collapseButtons = new Map<string, ExtraButtonComponent>();

	const toolbarSetting = new Setting(containerEl);
	toolbarSetting.settingEl.addClass('anm-filter-toolbar');
	toolbarSetting.setName('');
	toolbarSetting.setDesc('');
	toolbarSetting.addButton((button) => {
		button.setButtonText('Collapse all');
		button.onClick(() => applyCollapseState(true));
	});
	toolbarSetting.addButton((button) => {
		button.setButtonText('Expand all');
		button.onClick(() => applyCollapseState(false));
	});

	const wrapper = containerEl.createDiv('anm-filter-rules');

	const refresh = () => {
		wrapper.empty();
		build();
	};

	const notify = async () => {
		await onChange();
	};

	const notifyAndRefresh = async () => {
		await onChange();
		refresh();
	};

	const applyCollapseState = (collapsed: boolean) => {
		rules.forEach((rule) => {
			toggleCollapsedRule(rule.id, collapsed);
			const btn = collapseButtons.get(rule.id);
			if (btn) {
				updateCollapseControl(btn, collapsed);
			}
		});
		wrapper.findAll('.anm-rule-card').forEach((card) => {
			card.toggleClass('anm-collapsed', collapsed);
		});
	};

	const build = () => {
		collapseButtons.clear();
		if (!rules.length) {
			wrapper.createEl('p', { text: 'No rules yet. Add one below.' });
		}

		rules.forEach((rule, index) => {
			renderRuleCard(wrapper, rule, index);
		});

		const addRuleSetting = new Setting(wrapper);
		addRuleSetting.settingEl.addClass('anm-add-rule');
		addRuleSetting.setName('');
		addRuleSetting.setDesc('');
		addRuleSetting.addButton((button) => {
			button.setButtonText('Add rule').setCta();
			button.onClick(async () => {
				rules.push(createDefaultRule());
				await notifyAndRefresh();
			});
		});
	};

	const renderRuleCard = (parent: HTMLElement, rule: FilterRule, index: number) => {
		const card = parent.createDiv('anm-rule-card');
		const initiallyCollapsed = isRuleCollapsed(rule.id);
		card.toggleClass('anm-collapsed', initiallyCollapsed);

		const headerSetting = new Setting(card);
		headerSetting.settingEl.addClass('anm-rule-header-setting');
		headerSetting.setName('');
		headerSetting.setDesc('');
		headerSetting.infoEl.empty();
		const nameWrapper = headerSetting.infoEl.createDiv('anm-rule-name-field');
		nameWrapper.createSpan({ text: 'Rule:', cls: 'anm-field-label-inline' });
		const nameInput = nameWrapper.createEl('input', {
			value: rule.name,
			attr: { placeholder: 'Rule name' },
			cls: 'anm-rule-name',
		});
		nameInput.oninput = async () => {
			rule.name = nameInput.value;
			await notify();
		};

		headerSetting.addToggle((toggle) => {
			toggle.setValue(rule.enabled);
			toggle.onChange(async (value) => {
				rule.enabled = value;
				await notify();
			});
		});

		let collapseButton: ExtraButtonComponent | null = null;
		headerSetting.addExtraButton((button) => {
			collapseButton = button;
			button.setIcon('chevron-up');
			button.setTooltip('Collapse rule');
			button.onClick(() => {
				const collapsed = !card.hasClass('anm-collapsed');
				card.toggleClass('anm-collapsed', collapsed);
				updateCollapseControl(button, collapsed);
				toggleCollapsedRule(rule.id, collapsed);
			});
		});
		if (collapseButton) {
			collapseButtons.set(rule.id, collapseButton);
			updateCollapseControl(collapseButton, initiallyCollapsed);
		}

			headerSetting.addExtraButton((button) => {
			button.setIcon('copy');
			button.setTooltip('Duplicate rule');
			button.onClick(async () => {
				const clone = cloneRule(rule);
				rules.splice(index + 1, 0, clone);
				await notifyAndRefresh();
			});
		});
			headerSetting.addExtraButton((button) => {
			button.setIcon('trash');
			button.setTooltip('Delete rule');
			button.onClick(async () => {
				rules.splice(index, 1);
				await notifyAndRefresh();
			});
		});

		const body = card.createDiv('anm-rule-body');
		renderFilterNodeEditor(body, rule.filter, null, null, notify, notifyAndRefresh, true);
		body.createEl('p', { text: 'Make the following changes:', cls: 'anm-actions-heading' });
		renderActionsEditor(body, rule.actions, notify, notifyAndRefresh);
	};

	const renderFilterNodeEditor = (
		container: HTMLElement,
		node: FilterNode,
		parentChildren: FilterNode[] | null,
		index: number | null,
		notifyChange: () => Promise<void>,
		notifyAndRefresh: () => Promise<void>,
		isRoot = false,
		parentOperator: FilterGroup['operator'] = 'all'
	) => {
		if (node.type === 'group') {
			const intro = isRoot ? 'when' : parentOperator === 'any' ? 'or' : 'and';
			const groupSetting = new Setting(container);
			groupSetting.settingEl.addClass('anm-group');
			if (isRoot) {
				groupSetting.settingEl.addClass('anm-group--root');
			} else {
				groupSetting.settingEl.addClass('anm-group--nested');
			}
			groupSetting.setName('');
			groupSetting.setDesc('');
			groupSetting.infoEl.empty();
			const headerRow = groupSetting.infoEl.createDiv('anm-group-header');
			headerRow.createSpan({ text: intro, cls: 'anm-logic-label' });

			const modeSelect = new DropdownComponent(headerRow);
			modeSelect.selectEl.addClass('anm-group-mode');
			GROUP_MODES.forEach((option) => {
				modeSelect.addOption(option.value, option.label);
			});
			modeSelect.setValue(getGroupModeValue(node));
			modeSelect.onChange(async (value) => {
				const nextMode = GROUP_MODES.find((entry) => entry.value === value) ?? GROUP_MODES[0];
				updateGroupOperator(node, nextMode.quantifier, nextMode.truthiness);
				await notifyAndRefresh();
			});

			if (parentChildren && index !== null) {
				const actions = headerRow.createDiv('anm-group-actions');
				const removeButton = new ExtraButtonComponent(actions);
				removeButton.setIcon('trash');
				removeButton.setTooltip('Remove group');
				removeButton.onClick(async () => {
					parentChildren.splice(index, 1);
					await notifyAndRefresh();
				});
			}

			const childrenContainer = groupSetting.infoEl.createDiv('anm-group-children');
			node.children.forEach((child, childIndex) => {
				renderFilterNodeEditor(
					childrenContainer,
					child,
					node.children,
					childIndex,
					notifyChange,
					notifyAndRefresh,
					false,
					getGroupQuantifier(node)
				);
			});

			const footer = groupSetting.infoEl.createDiv('anm-group-footer');
			const addCriteriaBtn = new ButtonComponent(footer);
			addCriteriaBtn.setButtonText('+ add criteria');
			addCriteriaBtn.onClick(async () => {
				node.children.push(createDefaultCondition());
				await notifyAndRefresh();
			});
			const addGroupBtn = new ButtonComponent(footer);
			addGroupBtn.setButtonText('+ add group');
			addGroupBtn.onClick(async () => {
				node.children.push(createDefaultGroup());
				await notifyAndRefresh();
			});

		} else {
			const connectorText = connectorLabel(parentChildren, index, parentOperator);
			const conditionSetting = new Setting(container);
			conditionSetting.settingEl.addClass('anm-condition-row');
			conditionSetting.setName('');
			conditionSetting.setDesc('');
			conditionSetting.infoEl.empty();
			const line = conditionSetting.infoEl.createDiv('anm-condition-line');
			line.createSpan({ text: connectorText, cls: 'anm-logic-label' });

			const propertyField = line.createDiv('anm-condition-field');
			propertyField.addClass('anm-condition-field--property');
			const propertyInput = new TextComponent(propertyField);
			propertyInput.inputEl.placeholder = 'key';
			propertyInput.setValue(node.property ?? '');
			propertyInput.onChange(async (value) => {
				node.property = value;
				await notifyChange();
			});

			const comparatorField = line.createDiv('anm-condition-field');
			comparatorField.addClass('anm-condition-field--comparator');
			const comparatorSelect = new DropdownComponent(comparatorField);
			COMPARATORS.forEach((comp) => comparatorSelect.addOption(comp, comp));
			comparatorSelect.setValue(node.comparator);
			comparatorSelect.onChange(async (value) => {
				node.comparator = value as FilterCondition['comparator'];
				await notifyChange();
			});
			const valueField = line.createDiv('anm-condition-field');
			valueField.addClass('anm-condition-field--value');
			const valueInput = new TextComponent(valueField);
			valueInput.inputEl.placeholder = 'value';
			valueInput.setValue(Array.isArray(node.value) ? node.value.join(',') : node.value ?? '');
			valueInput.onChange(async (value) => {
				node.value = value;
				await notifyChange();
			});

			const toolsBar = line.createDiv('anm-condition-tools');
			const flagBar = toolsBar.createDiv('anm-condition-flags');
			createFlagButton(flagBar, 'circle-slash', 'Negate comparison', !!node.negate, async (value) => {
				node.negate = value;
				await notifyChange();
			});
			createFlagButton(flagBar, 'case-sensitive', 'Match case', !!node.caseSensitive, async (value) => {
				node.caseSensitive = value;
				await notifyChange();
			});

			if (parentChildren && index !== null) {
				const removeButton = new ExtraButtonComponent(toolsBar);
				removeButton.setIcon('trash');
				removeButton.setTooltip('Remove criteria');
				removeButton.onClick(async () => {
					parentChildren.splice(index, 1);
					await notifyAndRefresh();
				});
			}
		}
	};

const renderActionsEditor = (
	container: HTMLElement,
	actions: RuleAction[],
	notifyChange: () => Promise<void>,
	notifyAndRefresh: () => Promise<void>
) => {
	actions.forEach((action, index) => {
		const actionSetting = new Setting(container);
		actionSetting.settingEl.addClass('anm-action-row');
		actionSetting.setName('');
		actionSetting.setDesc('');
		actionSetting.infoEl.empty();
		const line = actionSetting.infoEl.createDiv('anm-action-line');
		const typeWrapper = line.createDiv('anm-action-type');
		const typeSelect = new DropdownComponent(typeWrapper);
		ACTION_TYPES.forEach((type) => typeSelect.addOption(type, type));
		typeSelect.setValue(action.type);
		typeSelect.onChange(async (value) => {
			actions[index] = createDefaultAction(value as RuleAction['type']);
			await notifyAndRefresh();
		});

		const fieldsWrapper = line.createDiv('anm-action-fields');
		renderActionFields(fieldsWrapper, action, notifyChange);

		actionSetting.addExtraButton((button) => {
			button.setIcon('trash');
			button.setTooltip('Remove action');
			button.onClick(async () => {
				actions.splice(index, 1);
				await notifyAndRefresh();
			});
		});
	});

	const addActionSetting = new Setting(container);
	addActionSetting.settingEl.addClass('anm-add-action');
	addActionSetting.setName('');
	addActionSetting.setDesc('');
	addActionSetting.addButton((button) => {
		button.setButtonText('+ add action');
		button.onClick(async () => {
			actions.push(createDefaultAction('move'));
			await notifyAndRefresh();
		});
	});
};

const renderActionFields = (container: HTMLElement, action: RuleAction, notifyChange: () => Promise<void>) => {
	switch (action.type) {
		case 'move': {
			const targetInput = new TextComponent(container);
			targetInput.inputEl.placeholder = 'Destination folder';
			targetInput.setValue(action.targetFolder ?? '');
			targetInput.onChange(async (value) => {
				action.targetFolder = value;
				await notifyChange();
			});
			break;
		}
		case 'applyTemplate': {
			const templateInput = new TextComponent(container);
			templateInput.inputEl.placeholder = 'Template path (relative to vault)';
			templateInput.setValue(action.templatePath ?? '');
			templateInput.onChange(async (value) => {
				action.templatePath = value;
				await notifyChange();
			});
			const modeSelect = new DropdownComponent(container);
			modeSelect.addOption('prepend', 'prepend');
			modeSelect.addOption('append', 'append');
			modeSelect.addOption('replace', 'replace');
			modeSelect.setValue(action.mode ?? 'prepend');
			modeSelect.onChange(async (value) => {
				action.mode = value as typeof action.mode;
				await notifyChange();
			});
			break;
		}
		case 'rename': {
			const prefix = new TextComponent(container);
			prefix.inputEl.placeholder = 'Prefix';
			prefix.setValue(action.prefix ?? '');
			prefix.onChange(async (value) => {
				action.prefix = value || undefined;
				await notifyChange();
			});
			const suffix = new TextComponent(container);
			suffix.inputEl.placeholder = 'Suffix';
			suffix.setValue(action.suffix ?? '');
			suffix.onChange(async (value) => {
				action.suffix = value || undefined;
				await notifyChange();
			});
			const replace = new TextComponent(container);
			replace.inputEl.placeholder = 'Replace basename';
			replace.setValue(action.replace ?? '');
			replace.onChange(async (value) => {
				action.replace = value || undefined;
				await notifyChange();
			});
			break;
		}
		case 'addTag':
		case 'removeTag': {
			const tagInput = new TextComponent(container);
			tagInput.inputEl.placeholder = '#tag';
			tagInput.setValue(action.tag ?? '');
			tagInput.onChange(async (value) => {
				action.tag = value;
				await notifyChange();
			});
			break;
		}
		default:
			container.createSpan({ text: 'Unsupported action type.' });
	}
};

const createFlagButton = (
	container: HTMLElement,
	icon: string,
	tooltip: string,
	value: boolean,
	onChange: (value: boolean) => Promise<void>
) => {
	const button = new ExtraButtonComponent(container);
	button.setIcon(icon);
	button.setTooltip(tooltip);
	const el = button.extraSettingsEl;
	el.addClass('anm-flag-button');
	const sync = (next: boolean) => {
		el.toggleClass('is-active', next);
	};
	sync(value);
	button.onClick(async () => {
		const next = !el.hasClass('is-active');
		sync(next);
		await onChange(next);
	});
	return button;
};

	refresh();
};

const connectorLabel = (
	parentChildren: FilterNode[] | null,
	index: number | null,
	parentOperator: FilterGroup['operator']
) => {
	if (!parentChildren || index === null) {
		return '';
	}
	if (index === 0) {
		return 'where';
	}
	if (parentOperator === 'any') {
		return 'or';
	}
	return 'and';
};

const createDefaultCondition = (): FilterCondition => ({
	type: 'condition',
	property: '',
	comparator: 'equals',
	value: '',
	caseSensitive: false,
	negate: false,
});

const createDefaultGroup = (): FilterGroup => ({
	type: 'group',
	operator: 'all',
	children: [createDefaultCondition()],
});

const createDefaultAction = (type: RuleAction['type']): RuleAction => {
	switch (type) {
		case 'move':
			return { type, targetFolder: '', createFolderIfMissing: false };
		case 'applyTemplate':
			return { type, templatePath: '', mode: 'prepend' };
		case 'rename':
			return { type };
		case 'addTag':
		case 'removeTag':
			return { type, tag: '' };
		default:
			return { type: 'move', targetFolder: '' };
	}
};

const collapsedRuleState = new Set<string>();

const toggleCollapsedRule = (id: string, collapsed: boolean) => {
	if (collapsed) {
		collapsedRuleState.add(id);
	} else {
		collapsedRuleState.delete(id);
	}
};

const isRuleCollapsed = (id: string) => collapsedRuleState.has(id);

const updateCollapseControl = (button: ExtraButtonComponent, collapsed: boolean) => {
	button.setIcon(collapsed ? 'chevron-down' : 'chevron-up');
	button.setTooltip(collapsed ? 'Expand rule' : 'Collapse rule');
};

const createDefaultRule = (): FilterRule => ({
	id: `rule-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
	name: 'New rule',
	enabled: true,
	filter: createDefaultGroup(),
	actions: [createDefaultAction('move')],
	stopOnMatch: true,
});

const cloneRule = (rule: FilterRule): FilterRule => ({
	...structuredClone(rule),
	id: `rule-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
	name: `${rule.name} (copy)`,
});

let stylesInjected = false;
const injectFilterBuilderStyles = () => {
	if (stylesInjected) return;
	stylesInjected = true;
	const style = document.createElement('style');
style.textContent = `
.anm-filter-toolbar .setting-item-control {
	justify-content: flex-end;
	gap: 0.5rem;
}
.anm-filter-toolbar .setting-item-info {
	display: none;
}
.anm-filter-rules {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}
.anm-rule-card {
	padding: 1rem;
    border-radius: 6px;
    border: 1px solid var(--color-base-30);
    background: var(--color-base-10);
}

.anm-field-label-inline, .anm-logic-label {
	color: var(--text-muted);
    text-transform: uppercase;
    font-size: 0.75em;
    width: 3.5em;
}

.anm-rule-header-setting {
	border-bottom: 1px solid var(--background-modifier-border);
}
.anm-rule-name-field {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
}
.anm-rule-name {
	border: 1px solid var(--background-modifier-border);
	border-radius: 8px;
	padding: 0.35rem 0.6rem;
	background: var(--background-secondary);
}
.anm-rule-body {
	padding: 0.75rem 1rem 1rem;
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}
.anm-rule-card.anm-collapsed .anm-rule-body {
	display: none;
}
.anm-group.setting-item {
	border: 1px solid var(--background-modifier-border);
	border-radius: 10px;
	padding: 0.75rem;
	margin-top: 0.75rem;
	background: var(--background-secondary);
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 0.75rem;
}
.anm-group--nested {
	margin-left: 0.75rem;
	width: calc(100% - 0.75rem);
}
.anm-group .setting-item-info {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	width: 100%;
	margin:0;
}
.anm-group .setting-item-control {
	display: none;
}
.anm-group-header {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	font-weight: 600;
	align-items: center;
}
.anm-group-actions {
	margin-left: auto;
	display: flex;
	gap: 0.25rem;
}
.anm-group-mode {
	min-width: 220px;
}

.anm-group-children {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}
.anm-group-footer {
	display: flex;
	gap: 0.5rem;
	flex-wrap: wrap;
	padding-top: 0.5rem;
	border-top: 1px solid var(--background-modifier-border);
}
.anm-condition-row.setting-item {
	padding: 0.25rem 0 0 1rem;
	border: none;
	display: flex;
	flex-direction: column;
}
.anm-condition-row .setting-item-control {
	display: none;
}
.anm-condition-line {
	display: flex;
	flex-wrap: nowrap;
	gap: 0.5rem;
	align-items: center;
}
.anm-condition-line > .anm-logic-label {
	flex: 0 0 auto;
}
.anm-condition-field--property {
    width: 22%;
}
.anm-condition-field--value {
    width:25%
}
.anm-condition-field {
	flex: 0 0 auto;
}
.anm-condition-field--property input {
	max-width: 100%;
}
.anm-condition-field--comparator select {
}
.anm-condition-field--value {
	flex: 1 1 auto;
}
.anm-condition-field--value input {
	max-width: 100%;
}
.anm-condition-tools {
	display: flex;
	gap: 0.25rem;
	flex: 0 0 auto;
	margin-left: auto;
	align-items: center;
}
.anm-condition-flags {
	display: flex;
	gap: 0.25rem;
}
.anm-flag-button {
	border: 1px solid var(--background-modifier-border);
	border-radius: 6px;
	padding: 0.2rem;
	width: 26px;
	height: 26px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
}
.anm-flag-button.is-active {
	background: var(--interactive-accent);
	color: var(--text-on-accent);
	border-color: var(--interactive-accent);
}
.anm-actions-heading {
	margin: 0;
	font-weight: 600;
}
.anm-action-row.setting-item {
	border-top: 1px solid var(--background-modifier-border);
}
.anm-action-line {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	align-items: center;
}
.anm-action-fields {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}
.anm-add-rule .setting-item-info,
.anm-add-action .setting-item-info {
	display: none;
}
.anm-add-rule .setting-item-control,
.anm-add-action .setting-item-control {
	justify-content: flex-start;
}
.anm-json-editor summary {
	cursor: pointer;
	font-weight: 600;
}
.anm-json-editor textarea {
	margin-top: 0.5rem;
	border: 1px solid var(--background-modifier-border);
	border-radius: 6px;
	padding: 0.5rem;
}
.anm-json-editor-actions {
	display: flex;
	gap: 0.5rem;
	margin-top: 0.5rem;
}
`;
	document.head.append(style);
};
