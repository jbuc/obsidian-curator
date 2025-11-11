import { FilterRule, FilterNode, FilterGroup, FilterCondition, RuleAction } from 'filter/filterTypes';

type OnChange = () => Promise<void> | void;

const COMPARATORS: FilterCondition['comparator'][] = [
	'equals',
	'contains',
	'startsWith',
	'endsWith',
	'matchesRegex',
	'exists',
	'notExists',
];

const ACTION_TYPES: RuleAction['type'][] = ['move', 'applyTemplate', 'rename', 'addTag', 'removeTag'];

export const renderFilterRulesEditor = (
	containerEl: HTMLElement,
	rules: FilterRule[],
	onChange: OnChange
): void => {
	injectFilterBuilderStyles();

	const toolbar = containerEl.createDiv('anm-filter-toolbar');
	const collapseAllBtn = toolbar.createEl('button', { text: 'Collapse all', cls: 'anm-btn-link' });
	const expandAllBtn = toolbar.createEl('button', { text: 'Expand all', cls: 'anm-btn-link' });

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
		rules.forEach((rule) => toggleCollapsedRule(rule.id, collapsed));
		wrapper.findAll('.anm-rule-card').forEach((card) => card.toggleClass('anm-collapsed', collapsed));
	};

	collapseAllBtn.onclick = () => applyCollapseState(true);
	expandAllBtn.onclick = () => applyCollapseState(false);

	const build = () => {
		if (!rules.length) {
			wrapper.createEl('p', { text: 'No rules yet. Add one below.' });
		}

		rules.forEach((rule, index) => {
			renderRuleCard(wrapper, rule, index);
		});

		const addRuleButton = wrapper.createEl('button', { text: 'Add rule', cls: 'anm-btn-primary' });
		addRuleButton.onclick = async () => {
			rules.push(createDefaultRule());
			await notifyAndRefresh();
		};
	};

	const renderRuleCard = (parent: HTMLElement, rule: FilterRule, index: number) => {
		const card = parent.createDiv('anm-rule-card');
		card.toggleClass('anm-collapsed', isRuleCollapsed(rule.id));

		const header = card.createDiv('anm-rule-header');
		const nameInput = header.createEl('input', {
			value: rule.name,
			attr: { placeholder: 'Rule name' },
			cls: 'anm-rule-name',
		});
		nameInput.oninput = async () => {
			rule.name = nameInput.value;
			await notify();
		};

		const toggleGroup = header.createDiv('anm-toggle-group');
		const collapseToggle = toggleGroup.createEl('button', {
			text: card.hasClass('anm-collapsed') ? 'Expand' : 'Collapse',
			cls: 'anm-btn-link',
		});
		collapseToggle.onclick = () => {
			const collapsed = !card.hasClass('anm-collapsed');
			card.toggleClass('anm-collapsed', collapsed);
			collapseToggle.setText(collapsed ? 'Expand' : 'Collapse');
			toggleCollapsedRule(rule.id, collapsed);
		};
		const enabledToggle = createToggleControl(toggleGroup, 'Enabled', rule.enabled, async (value) => {
			rule.enabled = value;
			await notify();
		});
		enabledToggle.input.checked = rule.enabled;
		const stopToggle = createToggleControl(toggleGroup, 'Stop on match', !!rule.stopOnMatch, async (value) => {
			rule.stopOnMatch = value;
			await notify();
		});
		stopToggle.input.checked = !!rule.stopOnMatch;

		const actionsRow = header.createDiv('anm-rule-actions');
		const duplicateButton = actionsRow.createEl('button', { text: 'Duplicate', cls: 'anm-btn-link' });
		duplicateButton.onclick = async () => {
			const clone = cloneRule(rule);
			rules.splice(index + 1, 0, clone);
			await notifyAndRefresh();
		};
		const deleteButton = actionsRow.createEl('button', { text: 'Delete', cls: 'anm-btn-danger' });
		deleteButton.onclick = async () => {
			rules.splice(index, 1);
			await notifyAndRefresh();
		};

		// Filter tree
		renderFilterNodeEditor(card, rule.filter, null, null, notify, notifyAndRefresh, true);

		// Actions
		card.createEl('p', { text: 'Make the following changes:', cls: 'anm-actions-heading' });
		renderActionsEditor(card, rule.actions, notify, notifyAndRefresh);
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
			const groupEl = container.createDiv('anm-group');
			const header = groupEl.createDiv('anm-group-header');

			const intro = isRoot ? 'where' : parentOperator === 'any' ? 'or' : 'and';
			header.createSpan({ text: `${intro} `, cls: 'anm-logic-label' });
			header.createSpan({ text: operatorLabel(node.operator), cls: 'anm-operator-label' });

			const operatorSelect = header.createEl('select', { cls: 'anm-operator-select' });
			[
				{ label: 'all of the following are true', value: 'all' },
				{ label: 'any of the following are true', value: 'any' },
				{ label: 'none of the following are true', value: 'none' },
			].forEach((option) => {
				operatorSelect.append(new Option(option.label, option.value, false, node.operator === option.value));
			});
			operatorSelect.onchange = async () => {
				node.operator = operatorSelect.value as FilterGroup['operator'];
				await notifyChange();
			};

			const chevron = header.createSpan({ text: '▾', cls: 'anm-chevron' });
			chevron.onclick = () => {
				const collapsed = groupEl.hasClass('anm-collapsed');
				groupEl.toggleClass('anm-collapsed', !collapsed);
			};

			if (parentChildren && index !== null) {
				const remove = header.createEl('button', { text: 'Remove', cls: 'anm-btn-link' });
				remove.onclick = async () => {
					parentChildren.splice(index, 1);
					await notifyAndRefresh();
				};
			}

			const childrenContainer = groupEl.createDiv('anm-group-children');
			node.children.forEach((child, childIndex) => {
				renderFilterNodeEditor(
					childrenContainer,
					child,
					node.children,
					childIndex,
					notifyChange,
					notifyAndRefresh,
					false,
					node.operator
				);
			});

			const footer = groupEl.createDiv('anm-group-footer');
			const addConditionBtn = footer.createEl('button', { text: 'add criteria', cls: 'anm-link-btn' });
			addConditionBtn.onclick = async () => {
				node.children.push(createDefaultCondition());
				await notifyAndRefresh();
			};
			const addGroupBtn = footer.createEl('button', { text: 'add group', cls: 'anm-link-btn' });
			addGroupBtn.onclick = async () => {
				node.children.push(createDefaultGroup());
				await notifyAndRefresh();
			};
		} else {
			const conditionRow = container.createDiv('anm-condition-row');
			const connector = conditionRow.createSpan({
				text: connectorLabel(parentChildren, index, parentOperator),
				cls: 'anm-condition-connector',
			});
			const conditionEl = conditionRow.createDiv('anm-condition');

			const propertySelect = conditionEl.createEl('input', {
				value: node.property,
				attr: { placeholder: 'file.name, tags, frontmatter.status' },
			});
			propertySelect.oninput = async () => {
				node.property = propertySelect.value;
				await notifyChange();
			};

			const comparatorSelect = conditionEl.createEl('select');
			COMPARATORS.forEach((comp) => {
				comparatorSelect.append(new Option(comp, comp, false, node.comparator === comp));
			});
			comparatorSelect.onchange = async () => {
				node.comparator = comparatorSelect.value as FilterCondition['comparator'];
				await notifyChange();
			};

			const valueInput = conditionEl.createEl('input', {
				value: Array.isArray(node.value) ? node.value.join(',') : node.value ?? '',
				attr: { placeholder: 'value / pattern (optional)' },
			});
			valueInput.oninput = async () => {
				node.value = valueInput.value;
				await notifyChange();
			};

			const toggleRow = conditionEl.createDiv('anm-condition-options');
			createToggleControl(toggleRow, 'Case sensitive', !!node.caseSensitive, async (value) => {
				node.caseSensitive = value;
				await notifyChange();
			});
			createToggleControl(toggleRow, 'Negate', !!node.negate, async (value) => {
				node.negate = value;
				await notifyChange();
			});

			if (parentChildren && index !== null) {
				const remove = conditionEl.createEl('button', { text: 'Remove', cls: 'anm-btn-link danger' });
				remove.onclick = async () => {
					parentChildren.splice(index, 1);
					await notifyAndRefresh();
				};
			}
		}
	};

	const renderActionsEditor = (
		container: HTMLElement,
		actions: RuleAction[],
		notifyChange: () => Promise<void>,
		notifyAndRefresh: () => Promise<void>
	) => {
		const list = container.createDiv('anm-actions');
		actions.forEach((action, index) => {
			const row = list.createDiv('anm-action-row');
			const typeSelect = row.createEl('select');
			ACTION_TYPES.forEach((type) => {
				typeSelect.append(new Option(type, type, false, action.type === type));
			});
			typeSelect.onchange = async () => {
				actions[index] = createDefaultAction(typeSelect.value as RuleAction['type']);
				await notifyAndRefresh();
			};

			const fields = row.createDiv('anm-action-fields');
			renderActionFields(fields, action, notifyChange);

			const remove = row.createEl('button', { text: 'Remove', cls: 'anm-btn-link danger' });
			remove.onclick = async () => {
				actions.splice(index, 1);
				await notifyAndRefresh();
			};
		});

		const addActionBtn = container.createEl('button', { text: 'add action', cls: 'anm-link-btn' });
		addActionBtn.onclick = async () => {
			actions.push(createDefaultAction('move'));
			await notifyAndRefresh();
		};
	};

	const renderActionFields = (container: HTMLElement, action: RuleAction, notifyChange: () => Promise<void>) => {
		switch (action.type) {
			case 'move': {
				const targetInput = container.createEl('input', {
					value: action.targetFolder,
					attr: { placeholder: 'Destination folder' },
				});
				targetInput.oninput = async () => {
					action.targetFolder = targetInput.value;
					await notifyChange();
				};
				createToggleControl(container, 'Create folder if needed', !!action.createFolderIfMissing, async (value) => {
					action.createFolderIfMissing = value;
					await notifyChange();
				});
				break;
			}
			case 'applyTemplate': {
				const templateInput = container.createEl('input', {
					value: action.templatePath,
					attr: { placeholder: 'Template path (relative to vault)' },
				});
				templateInput.oninput = async () => {
					action.templatePath = templateInput.value;
					await notifyChange();
				};
				const modeSelect = container.createEl('select');
				['prepend', 'append', 'replace'].forEach((mode) => {
					modeSelect.append(new Option(mode, mode, false, action.mode === mode));
				});
				modeSelect.onchange = async () => {
					action.mode = modeSelect.value as typeof action.mode;
					await notifyChange();
				};
				break;
			}
			case 'rename': {
				const prefix = container.createEl('input', {
					value: action.prefix ?? '',
					attr: { placeholder: 'Prefix' },
				});
				prefix.oninput = async () => {
					action.prefix = prefix.value || undefined;
					await notifyChange();
				};
				const suffix = container.createEl('input', {
					value: action.suffix ?? '',
					attr: { placeholder: 'Suffix' },
				});
				suffix.oninput = async () => {
					action.suffix = suffix.value || undefined;
					await notifyChange();
				};
				const replace = container.createEl('input', {
					value: action.replace ?? '',
					attr: { placeholder: 'Replace basename' },
				});
				replace.oninput = async () => {
					action.replace = replace.value || undefined;
					await notifyChange();
				};
				break;
			}
			case 'addTag':
			case 'removeTag': {
				const tagInput = container.createEl('input', {
					value: action.tag,
					attr: { placeholder: '#tag' },
				});
				tagInput.oninput = async () => {
					action.tag = tagInput.value;
					await notifyChange();
				};
				break;
			}
			default:
				container.createSpan({ text: 'Unsupported action type.' });
		}
	};

	refresh();
};

const createToggleControl = (
	container: HTMLElement,
	label: string,
	value: boolean,
	onChange: (value: boolean) => Promise<void>
) => {
	const wrapper = container.createDiv('anm-toggle');
	const span = wrapper.createSpan({ text: label });
	const input = wrapper.createEl('input', { type: 'checkbox' });
	input.checked = value;
	input.onchange = () => onChange(input.checked);
	return { wrapper, span, input };
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

const operatorLabel = (operator: FilterGroup['operator']) => {
	switch (operator) {
		case 'all':
			return 'all of the following are true';
		case 'any':
			return 'any of the following are true';
		case 'none':
			return 'none of the following are true';
		default:
			return 'all of the following are true';
	}
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
.anm-filter-rules {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}
.anm-rule-card {
	border: 1px solid var(--interactive-normal);
	border-radius: 8px;
	padding: 1rem;
	background: var(--background-primary);
	box-shadow: var(--shadow-s);
	display: flex;
	flex-direction: column;
	gap: 1rem;
}
.anm-rule-header {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	align-items: center;
	justify-content: space-between;
}
.anm-rule-name {
	flex: 1 1 220px;
	font-weight: 600;
}
.anm-toggle-group,
.anm-condition-options {
	display: flex;
	gap: 0.5rem;
	align-items: center;
	flex-wrap: wrap;
}
.anm-btn-primary,
.anm-btn-danger,
.anm-btn-link,
.anm-link-btn {
	border: none;
	cursor: pointer;
	background: transparent;
	color: var(--text-accent);
	padding: 0.25rem 0.5rem;
}
.anm-btn-primary {
	background: var(--interactive-accent);
	color: var(--text-on-accent);
	border-radius: 4px;
}
.anm-btn-danger,
.anm-btn-link.danger {
	color: var(--text-error);
}
.anm-group {
	border: 1px solid var(--interactive-border);
	border-radius: 8px;
	padding: 0.75rem;
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	background: var(--background-secondary);
}
.anm-group-header {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 0.5rem;
	font-weight: 600;
}
.anm-group-children {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}
.anm-group-footer {
	display: flex;
	gap: 1rem;
}
.anm-condition-row {
	display: flex;
	align-items: flex-start;
	gap: 0.5rem;
}
.anm-condition-connector {
	width: 40px;
	text-transform: lowercase;
	color: var(--text-muted);
	padding-top: 0.4rem;
}
.anm-condition {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
}
.anm-condition input,
.anm-condition select {
	width: 100%;
}
.anm-actions-heading {
	margin: 0;
	font-weight: 600;
}
.anm-actions {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}
.anm-action-row {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	align-items: center;
	padding: 0.5rem;
	border: 1px dashed var(--interactive-border);
	border-radius: 6px;
}
.anm-action-fields {
	display: flex;
	flex: 1;
	gap: 0.5rem;
	flex-wrap: wrap;
}
.anm-link-btn {
	color: var(--text-accent);
	text-decoration: underline;
	background: transparent;
	padding: 0;
}
.anm-json-editor summary {
	cursor: pointer;
	font-weight: 600;
}
.anm-json-editor textarea {
	margin-top: 0.5rem;
	border: 1px solid var(--interactive-border);
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
