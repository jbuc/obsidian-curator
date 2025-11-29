import { App, PluginSettingTab, Setting } from 'obsidian';
import AutoNoteMover from '../main';
import { RulesTab } from './components/RulesTab';
import { LogbookTab } from './components/LogbookTab';

export class CuratorSettingsTab extends PluginSettingTab {
    plugin: AutoNoteMover;
    activeTab: 'rules' | 'logbook' = 'rules';

    constructor(app: App, plugin: AutoNoteMover) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Curator Settings' });

        const navContainer = containerEl.createDiv('curator-nav');
        navContainer.style.display = 'flex';
        navContainer.style.gap = '10px';
        navContainer.style.marginBottom = '20px';

        this.createNavButton(navContainer, 'Rules', 'rules');
        this.createNavButton(navContainer, 'Logbook', 'logbook');

        const contentContainer = containerEl.createDiv('curator-content');

        if (this.activeTab === 'rules') {
            new RulesTab(this.app, contentContainer, this.plugin.settings, (newConfig) => {
                this.plugin.settings = newConfig;
                this.plugin.saveSettings();
            }).display();
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
