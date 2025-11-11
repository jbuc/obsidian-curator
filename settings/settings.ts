import AutoNoteMover from 'main';
import { App, PluginSettingTab, Setting, ButtonComponent, Notice, TextAreaComponent } from 'obsidian';

import { FolderSuggest } from 'suggests/file-suggest';
import { arrayMove } from 'utils/Utils';
import { FilterRule } from 'filter/filterTypes';

export interface PropertyRule {
	property: string;
	value: string;
	title: string;
	folder: string;
}

export interface ExcludedFolder {
	folder: string;
}

export interface AutoNoteMoverSettings {
	trigger_auto_manual: string;
	statusBar_trigger_indicator: boolean;
	property_rules: Array<PropertyRule>;
	use_regex_to_check_for_excluded_folder: boolean;
	excluded_folder: Array<ExcludedFolder>;
	filter_engine_enabled: boolean;
	filter_rules: FilterRule[];
}

export const DEFAULT_SETTINGS: AutoNoteMoverSettings = {
	trigger_auto_manual: 'Automatic',
	statusBar_trigger_indicator: true,
	property_rules: [{ property: '', value: '', title: '', folder: '' }],
	use_regex_to_check_for_excluded_folder: false,
	excluded_folder: [{ folder: '' }],
	filter_engine_enabled: false,
	filter_rules: [],
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
		this.add_auto_note_mover_setting();
	}

	add_auto_note_mover_setting(): void {
		this.containerEl.createEl('h2', { text: 'Auto Note Mover' });

		const descEl = document.createDocumentFragment();

		new Setting(this.containerEl).setDesc(
			'Auto Note Mover will automatically move the active notes to their respective folders according to the rules.'
		);

		/* new Setting(this.containerEl)
			.setName('Auto Note Mover')
			.setDesc('Enable or disable the Auto Note Mover.')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.enable_auto_note_mover)
					.onChange(async (use_new_auto_note_mover) => {
						this.plugin.settings.enable_auto_note_mover = use_new_auto_note_mover;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		if (!this.plugin.settings.enable_auto_note_mover) {
			return;
		} */

		const triggerDesc = document.createDocumentFragment();
		triggerDesc.append(
			'Choose how the trigger will be activated.',
			descEl.createEl('br'),
			descEl.createEl('strong', { text: 'Automatic ' }),
			'is triggered when you create, edit, or rename a note, and moves the note if it matches the rules.',
			descEl.createEl('br'),
			'You can also activate the trigger with a command.',
			descEl.createEl('br'),
			descEl.createEl('strong', { text: 'Manual ' }),
			'will not automatically move notes.',
			descEl.createEl('br'),
			'You can trigger by command.'
		);
		new Setting(this.containerEl)
			.setName('Trigger')
			.setDesc(triggerDesc)
			.addDropdown((dropDown) =>
				dropDown
					.addOption('Automatic', 'Automatic')
					.addOption('Manual', 'Manual')
					.setValue(this.plugin.settings.trigger_auto_manual)
					.onChange((value: string) => {
						this.plugin.settings.trigger_auto_manual = value;
						this.plugin.saveData(this.plugin.settings);
						this.display();
					})
			);

		this.renderFilterEngineSettings();
		this.renderLegacyRulesNotice();

		const useRegexToCheckForExcludedFolder = document.createDocumentFragment();
		useRegexToCheckForExcludedFolder.append(
			'If enabled, excluded folder will be checked with regular expressions.'
		);

		new Setting(this.containerEl)
			.setName('Use regular expressions to check for excluded folder')
			.setDesc(useRegexToCheckForExcludedFolder)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.use_regex_to_check_for_excluded_folder).onChange(async (value) => {
					this.plugin.settings.use_regex_to_check_for_excluded_folder = value;
					await this.plugin.saveSettings();
					this.display();
				});
			});

		const excludedFolderDesc = document.createDocumentFragment();
		excludedFolderDesc.append(
			'Notes in the excluded folder will not be moved.',
			descEl.createEl('br'),
			'This takes precedence over the notes movement rules.'
		);
		new Setting(this.containerEl)

			.setName('Add Excluded Folder')
			.setDesc(excludedFolderDesc)
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip('Add Excluded Folders')
					.setButtonText('+')
					.setCta()
					.onClick(async () => {
						this.plugin.settings.excluded_folder.push({
							folder: '',
						});
						await this.plugin.saveSettings();
						this.display();
					});
			});

		this.plugin.settings.excluded_folder.forEach((excluded_folder, index) => {
			const s = new Setting(this.containerEl)
				.addSearch((cb) => {
					new FolderSuggest(this.app, cb.inputEl);
					cb.setPlaceholder('Folder')
						.setValue(excluded_folder.folder)
						.onChange(async (newFolder) => {
							this.plugin.settings.excluded_folder[index].folder = newFolder;
							await this.plugin.saveSettings();
						});
				})

				.addExtraButton((cb) => {
					cb.setIcon('up-chevron-glyph')
						.setTooltip('Move up')
						.onClick(async () => {
							arrayMove(this.plugin.settings.excluded_folder, index, index - 1);
							await this.plugin.saveSettings();
							this.display();
						});
				})
				.addExtraButton((cb) => {
					cb.setIcon('down-chevron-glyph')
						.setTooltip('Move down')
						.onClick(async () => {
							arrayMove(this.plugin.settings.excluded_folder, index, index + 1);
							await this.plugin.saveSettings();
							this.display();
						});
				})
				.addExtraButton((cb) => {
					cb.setIcon('cross')
						.setTooltip('Delete')
						.onClick(async () => {
							this.plugin.settings.excluded_folder.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
						});
				});
			s.infoEl.remove();
		});

		const statusBarTriggerIndicatorDesc = document.createDocumentFragment();
		statusBarTriggerIndicatorDesc.append(
			'The status bar will display [A] if the trigger is Automatic, and [M] for Manual.',
			descEl.createEl('br'),
			'To change the setting, you need to restart Obsidian.',
			descEl.createEl('br'),
			'Desktop only.'
		);
		new Setting(this.containerEl)
			.setName('Status Bar Trigger Indicator')
			.setDesc(statusBarTriggerIndicatorDesc)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.statusBar_trigger_indicator).onChange(async (value) => {
					this.plugin.settings.statusBar_trigger_indicator = value;
					await this.plugin.saveSettings();
					this.display();
				});
			});

	}

	private renderFilterEngineSettings() {
		this.containerEl.createEl('h3', { text: 'Filter Engine (beta)' });

		new Setting(this.containerEl)
			.setName('Enable filter engine')
			.setDesc('Use the new nested filter/action workflow. Legacy rules are ignored while this is enabled.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.filter_engine_enabled).onChange(async (value) => {
					this.plugin.settings.filter_engine_enabled = value;
					await this.plugin.saveSettings();
					this.display();
				});
			});

		if (!this.plugin.settings.filter_engine_enabled) {
			return;
		}

		let draftFilterRules = JSON.stringify(this.plugin.settings.filter_rules ?? [], null, 2);
		const filterSetting = new Setting(this.containerEl)
			.setName('Filter rules (JSON)')
			.setDesc(
				'Temporary JSON editor for the new filter engine. Enter an array of rules that follow the schema defined in filter/filterTypes.ts.'
			);

		let textAreaRef: TextAreaComponent | null = null;
		filterSetting.addTextArea((text) => {
			textAreaRef = text;
			text.setValue(draftFilterRules).onChange((value) => {
				draftFilterRules = value;
			});
			text.inputEl.rows = 12;
			text.inputEl.style.fontFamily = 'var(--font-monospace)';
		});

		filterSetting.addExtraButton((button) => {
			button
				.setIcon('reset')
				.setTooltip('Reset to current value')
				.onClick(() => {
					draftFilterRules = JSON.stringify(this.plugin.settings.filter_rules ?? [], null, 2);
					if (textAreaRef) {
						textAreaRef.setValue(draftFilterRules);
					}
				});
		});

			filterSetting.addExtraButton((button) => {
				button
					.setIcon('save')
					.setTooltip('Save rules')
					.onClick(async () => {
						try {
							const parsed = JSON.parse(draftFilterRules) as FilterRule[];
							this.plugin.settings.filter_rules = parsed;
							await this.plugin.saveSettings();
							new Notice('Filter rules saved.');
						} catch (error) {
							console.error('[Auto Note Mover] Invalid filter rules JSON', error);
							new Notice('Invalid JSON. Changes not saved.');
						}
					});
			});
	}

	private renderLegacyRulesNotice() {
		const legacyDesc = document.createDocumentFragment();
		legacyDesc.append(
			'The original single-line rules have been deprecated. Existing configurations continue to run when the filter engine is disabled, but they are no longer editable from the UI.',
			this.containerEl.createEl('br'),
			'To migrate, recreate the logic using the filter engine JSON editor above (see docs/filter-engine-sample.json for examples).'
		);
		new Setting(this.containerEl).setName('Legacy rules').setDesc(legacyDesc);
	}
}
