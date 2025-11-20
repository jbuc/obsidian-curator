import AutoNoteMover from 'main';
import { App, PluginSettingTab } from 'obsidian';
import { FilterRule } from 'filter/filterTypes';
import { renderFilterEngineSettings } from './ui/FilterEngineSettings';
import { renderExcludedFolderSettings } from './ui/ExcludedFolderSettings';
import { renderGeneralSettings, renderLegacyRulesNotice } from './ui/GeneralSettings';

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
		{ key: 'file.path', label: 'path' },
		{ key: 'file.folder', label: 'folder' },
		{ key: 'file.name', label: 'name' },
		{ key: 'file.extension', label: 'extension' },
		{ key: 'file.tags', label: 'tags' },
		{ key: 'prop.type', label: 'type' },
	],
};

export class AutoNoteMoverSettingTab extends PluginSettingTab {
	plugin: AutoNoteMover;

	constructor(app: App, plugin: AutoNoteMover) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		this.containerEl.empty();

		const refresh = () => this.display();

		renderGeneralSettings(this.app, this.plugin, containerEl, refresh);
		renderFilterEngineSettings(this.app, this.plugin, containerEl, refresh);
		renderLegacyRulesNotice(containerEl);
		renderExcludedFolderSettings(this.app, this.plugin, containerEl, refresh);
	}
}
