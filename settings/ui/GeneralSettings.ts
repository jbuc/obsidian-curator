import { App, Setting } from 'obsidian';
import AutoNoteMover from 'main';

export function renderGeneralSettings(app: App, plugin: AutoNoteMover, containerEl: HTMLElement, refreshCallback: () => void) {
    containerEl.createEl('h2', { text: 'Auto Note Mover' });

    const descEl = document.createDocumentFragment();

    new Setting(containerEl).setDesc(
        'Auto Note Mover will automatically move the active notes to their respective folders according to the rules.'
    );

    const triggerDesc = document.createDocumentFragment();
    triggerDesc.append(
        'Choose how the trigger will be activated.',
        document.createElement('br'),
        descEl.createEl('strong', { text: 'Automatic ' }),
        'is triggered when you create, edit, or rename a note, and moves the note if it matches the rules.',
        document.createElement('br'),
        'You can also activate the trigger with a command.',
        document.createElement('br'),
        descEl.createEl('strong', { text: 'Manual ' }),
        'will not automatically move notes.',
        document.createElement('br'),
        'You can trigger by command.'
    );
    new Setting(containerEl)
        .setName('Trigger')
        .setDesc(triggerDesc)
        .addDropdown((dropDown) =>
            dropDown
                .addOption('Automatic', 'Automatic')
                .addOption('Manual', 'Manual')
                .setValue(plugin.settings.trigger_auto_manual)
                .onChange((value: string) => {
                    plugin.settings.trigger_auto_manual = value;
                    plugin.saveData(plugin.settings);
                    refreshCallback();
                })
        );

    const statusBarTriggerIndicatorDesc = document.createDocumentFragment();
    statusBarTriggerIndicatorDesc.append(
        'The status bar will display [A] if the trigger is Automatic, and [M] for Manual.',
        document.createElement('br'),
        'To change the setting, you need to restart Obsidian.',
        document.createElement('br'),
        'Desktop only.'
    );
    new Setting(containerEl)
        .setName('Status Bar Trigger Indicator')
        .setDesc(statusBarTriggerIndicatorDesc)
        .addToggle((toggle) => {
            toggle.setValue(plugin.settings.statusBar_trigger_indicator).onChange(async (value) => {
                plugin.settings.statusBar_trigger_indicator = value;
                await plugin.saveSettings();
                refreshCallback();
            });
        });
}

export function renderLegacyRulesNotice(containerEl: HTMLElement) {
    const legacyDesc = document.createDocumentFragment();
    legacyDesc.append(
        'The original single-line rules have been deprecated. Existing configurations continue to run when the criteria engine is disabled, but they are no longer editable from the UI.',
        document.createElement('br'),
        'To migrate, recreate the logic using the criteria engine JSON editor above (see docs/criteria-engine-sample.json for examples).'
    );
    new Setting(containerEl).setName('Legacy rules').setDesc(legacyDesc);
}
