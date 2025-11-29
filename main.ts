import { App, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { CuratorConfig } from 'core/types';
import { BinderService } from 'core/BinderService';
import { GroupService } from 'core/GroupService';
import { TriggerService } from 'core/TriggerService';
import { ActionService } from 'core/ActionService';
import { RulesetService } from 'core/RulesetService';
import { CuratorSettingsTab } from 'ui/CuratorSettingsTab';

export default class AutoNoteMover extends Plugin {
	settings: CuratorConfig;
	private binder: BinderService;
	private groupService: GroupService;
	private triggerService: TriggerService;
	private actionService: ActionService;
	private rulesetService: RulesetService;

	async onload() {
		await this.loadSettings();

		// Initialize Services
		this.binder = new BinderService(this.app);
		this.groupService = new GroupService(this.app);
		this.triggerService = new TriggerService(this.app);
		this.actionService = new ActionService(this.app, this.binder);
		this.rulesetService = new RulesetService(
			this.app,
			this.triggerService,
			this.groupService,
			this.binder,
			this.actionService
		);

		// Initialize Listeners
		this.triggerService.initializeListeners();

		// Add Settings Tab
		this.addSettingTab(new CuratorSettingsTab(this.app, this));

		// Initial Config Update
		this.rulesetService.updateConfig(this.settings);
	}

	onunload() {
		this.triggerService.unload();
	}

	async loadSettings() {
		const DEFAULT_SETTINGS: CuratorConfig = {
			rulesets: []
		};

		const loadedData = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

		// Migration/Sanitization: Ensure all rulesets have a valid trigger object
		// This prevents crashes if the user has settings from a previous version (v1.0.0 or older)
		if (this.settings.rulesets) {
			this.settings.rulesets = this.settings.rulesets.filter(r => {
				// Check if trigger is missing or is not an object (old version used triggerId string)
				if (!r.trigger || typeof r.trigger !== 'object') {
					console.warn(`[Curator] Dropping invalid/legacy ruleset "${r.name}" (missing trigger object).`);
					return false;
				}
				return true;
			});
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);

		// Update services with new config
		if (this.rulesetService) {
			this.rulesetService.updateConfig(this.settings);
		}
	}
}
