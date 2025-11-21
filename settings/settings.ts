import AutoNoteMover from 'main';
import { App, PluginSettingTab } from 'obsidian';
import { FilterRule } from 'filter/filterTypes';
import { renderRuleGroupsSection, renderTrackedProperties, renderApplyRulesButton, renderFilterRulesJsonEditor, renderDryRunButton } from './ui/FilterEngineSettings';
import { renderExcludedFolderSettings } from './ui/ExcludedFolderSettings';
import { renderGeneralSettings, renderDebugSettings } from './ui/GeneralSettings';

export interface PropertyRule {
	property: string;
	value: string;
	title: string;
	folder: string;
}

export interface ExcludedFolder {
	folder: string;
}

export interface TrackedProperty {
	key: string;
	label?: string;
	weight?: number;
}

export interface RuleGroup {
	id: string;
	name: string;
	enabled: boolean;
	rules: FilterRule[];
}

export interface AutoNoteMoverSettings {
	trigger_auto_manual: string;
	statusBar_trigger_indicator: boolean;
	property_rules: Array<PropertyRule>;
	use_regex_to_check_for_excluded_folder: boolean;
	excluded_folder: Array<ExcludedFolder>;
	filter_engine_enabled: boolean;
	filter_rules: FilterRule[];
	rule_groups: RuleGroup[];
	filter_rules_migrated?: boolean;
	tracked_properties: TrackedProperty[];
	conflict_resolution: 'overwrite' | 'skip' | 'rename';
	debug_mode: boolean;
}

export const DEFAULT_SETTINGS: AutoNoteMoverSettings = {
	trigger_auto_manual: 'Automatic',
	statusBar_trigger_indicator: true,
	property_rules: [{ property: '', value: '', title: '', folder: '' }],
	use_regex_to_check_for_excluded_folder: false,
	excluded_folder: [{ folder: '' }],
	filter_engine_enabled: false,
	filter_rules: [],
	rule_groups: [],
	filter_rules_migrated: false,
	tracked_properties: [
		{ key: 'file.path', label: 'path', weight: 1 },
		{ key: 'file.folder', label: 'folder', weight: 1 },
		{ key: 'file.name', label: 'name', weight: 1 },
		{ key: 'file.extension', label: 'extension', weight: 1 },
		{ key: 'file.tags', label: 'tags', weight: 10 },
		{ key: 'prop.type', label: 'type', weight: 5 },
	],
	conflict_resolution: 'rename',
	debug_mode: false,
};

export class AutoNoteMoverSettingTab extends PluginSettingTab {
	plugin: AutoNoteMover;
	activeTab: 'rules' | 'universal' | 'diagnosis' = 'rules';

	constructor(app: App, plugin: AutoNoteMover) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		this.containerEl.empty();

		const refresh = () => this.display();

		// Tab Header
		const tabHeader = containerEl.createDiv('anm-settings-tabs');
		tabHeader.style.display = 'flex';
		tabHeader.style.marginBottom = '20px';
		tabHeader.style.borderBottom = '1px solid var(--background-modifier-border)';

		const createTab = (id: typeof this.activeTab, label: string) => {
			const tab = tabHeader.createDiv('anm-settings-tab');
			tab.innerText = label;
			tab.style.padding = '10px 20px';
			tab.style.cursor = 'pointer';
			tab.style.fontWeight = this.activeTab === id ? 'bold' : 'normal';
			tab.style.borderBottom = this.activeTab === id ? '2px solid var(--interactive-accent)' : 'none';
			tab.style.color = this.activeTab === id ? 'var(--text-normal)' : 'var(--text-muted)';

			tab.onclick = () => {
				this.activeTab = id;
				refresh();
			};
		};

		createTab('rules', 'Rules');
		createTab('universal', 'Universal Settings');
		createTab('diagnosis', 'Diagnosis');

		// Tab Content
		if (this.activeTab === 'rules') {
			renderRuleGroupsSection(this.app, this.plugin, containerEl, refresh);
		} else if (this.activeTab === 'universal') {
			renderGeneralSettings(this.app, this.plugin, containerEl, refresh);
			renderTrackedProperties(this.plugin, containerEl, refresh);
			renderExcludedFolderSettings(this.app, this.plugin, containerEl, refresh);
		} else if (this.activeTab === 'diagnosis') {
			renderDebugSettings(this.plugin, containerEl, refresh);
			renderDryRunButton(this.plugin, containerEl);
			renderApplyRulesButton(this.plugin, containerEl);
			renderFilterRulesJsonEditor(this.plugin, containerEl, refresh);
		}
	}
}
