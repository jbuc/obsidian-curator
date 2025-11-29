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

		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);

		// Update services with new config
		if (this.rulesetService) {
			this.rulesetService.updateConfig(this.settings);
		}
	}
}
