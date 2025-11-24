import { App, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { CuratorConfig } from 'core/types';
import { BinderService } from 'core/BinderService';
import { IdentifierService } from 'core/IdentifierService';
import { GroupService } from 'core/GroupService';
import { TriggerService } from 'core/TriggerService';
import { ActionService } from 'core/ActionService';
import { RulesetService } from 'core/RulesetService';
import { CuratorSettingsTab } from 'ui/CuratorSettingsTab';

export default class AutoNoteMover extends Plugin {
	settings: CuratorConfig;
	private binder: BinderService;
	private identifierService: IdentifierService;
	private groupService: GroupService;
	private triggerService: TriggerService;
	private actionService: ActionService;
	private rulesetService: RulesetService;

	async onload() {
		await this.loadSettings();

		// Initialize Services
		this.binder = new BinderService(this.app);
		this.identifierService = new IdentifierService(this.app);
		this.groupService = new GroupService(this.app, this.identifierService);
		this.triggerService = new TriggerService(this.app);
		this.actionService = new ActionService(this.app, this.binder);
		this.rulesetService = new RulesetService(
			this.app,
			this.triggerService,
			this.groupService,
			this.binder,
			this.identifierService,
			this.actionService
		);

		// Initialize Listeners
		this.triggerService.initializeListeners();

		// Add Settings Tab
		this.addSettingTab(new CuratorSettingsTab(this.app, this));

		// Initial Config Update
		this.rulesetService.updateConfig(this.settings);

		// Trigger Startup Event
		this.triggerService.handleSystemEvent('startup');
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, {
			identifiers: [],
			groups: [],
			triggers: [],
			actions: [],
			jobs: [],
			rulesets: []
		}, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);

		// Update services with new config
		if (this.rulesetService) {
			this.rulesetService.updateConfig(this.settings);
		}
	}
}
