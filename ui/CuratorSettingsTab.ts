import { App, PluginSettingTab, Setting } from 'obsidian';
import AutoNoteMover from '../main';
import { RulesTab } from './components/RulesTab';
import { LogbookTab } from './components/LogbookTab';
import { RulesetService } from '../core/RulesetService';

export class CuratorSettingsTab extends PluginSettingTab {
    plugin: AutoNoteMover;
    rulesetService: RulesetService;
    activeTab: 'rules' | 'logbook' = 'rules';
    private buildIdentifier: string;

    constructor(app: App, plugin: AutoNoteMover, rulesetService: RulesetService) {
        super(app, plugin);
        this.plugin = plugin;
        this.rulesetService = rulesetService;
        this.buildIdentifier = this.generateBuildIdentifier();
    }

    private generateBuildIdentifier(): string {
        const now = new Date();
        const yy = now.getFullYear().toString().slice(-2);
        const mm = (now.getMonth() + 1).toString().padStart(2, '0');
        const dd = now.getDate().toString().padStart(2, '0');
        const days = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
        const day = days[now.getDay()];
        const HH = now.getHours().toString().padStart(2, '0');
        const MM = now.getMinutes().toString().padStart(2, '0');
        const SS = now.getSeconds().toString().padStart(2, '0');
        return `${yy}${mm}${dd}.${day}.${HH}${MM}${SS}`;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Curator Settings' });

        const versionDiv = containerEl.createDiv('curator-version-info');
        versionDiv.style.fontSize = '0.8em';
        versionDiv.style.color = 'var(--text-muted)';
        versionDiv.style.marginBottom = '15px';
        versionDiv.setText(`Version: ${this.plugin.manifest.version} | Build: ${this.buildIdentifier}`);

        const navContainer = containerEl.createDiv('curator-nav');
        navContainer.style.display = 'flex';
        navContainer.style.gap = '10px';
        navContainer.style.marginBottom = '20px';

        this.createNavButton(navContainer, 'Rules', 'rules');
        this.createNavButton(navContainer, 'Logbook', 'logbook');

        new Setting(containerEl)
            .setName('Ruleset Folder')
            .setDesc('Folder where markdown rulesets will be saved.')
            .addText(text => text
                .setPlaceholder('Curator Rules')
                .setValue(this.plugin.settings.rulesetFolder || 'Curator Rules')
                .onChange(async (value) => {
                    this.plugin.settings.rulesetFolder = value;
                    await this.plugin.saveSettings();
                }));

        const contentContainer = containerEl.createDiv('curator-content');

        if (this.activeTab === 'rules') {
            new RulesTab(this.app, contentContainer, this.rulesetService, this.plugin.settings.rulesetFolder).display();
        } else if (this.activeTab === 'logbook') {
            // Access binder via any cast since it's private but we need it for UI
            // Ideally we would expose a public getter
            new LogbookTab(this.app, contentContainer, (this.plugin as any).binder).display();
        }
    }

    private createNavButton(container: HTMLElement, text: string, tab: 'rules' | 'logbook') {
        const btn = container.createEl('button', { text });
        if (this.activeTab === tab) {
            btn.addClass('mod-cta');
        }
        btn.onclick = () => {
            this.activeTab = tab;
            this.display();
        };
    }
}
