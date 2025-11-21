import { App, Setting } from 'obsidian';
import AutoNoteMover from 'main';

export function renderGeneralSettings(app: App, plugin: AutoNoteMover, containerEl: HTMLElement, refreshCallback: () => void) {
    containerEl.createEl('h2', { text: 'Auto Note Mover' });

    const descEl = document.createDocumentFragment();

    new Setting(containerEl).setDesc(
        'Auto Note Mover will automatically move the active notes to their respective folders according to the rules.'
    );

    const variableDesc = document.createDocumentFragment();
    variableDesc.append(
        'You can use the following variables in your destination paths and file names:',
        document.createElement('br'),
        descEl.createEl('code', { text: '{{title}}' }), ' or ', descEl.createEl('code', { text: '{{name}}' }), ': The file name.',
        document.createElement('br'),
        descEl.createEl('code', { text: '{{parent}}' }), ': The immediate parent folder name.',
        document.createElement('br'),
        descEl.createEl('code', { text: '{{date:YYYY-MM-DD}}' }), ': The current date (format customizable).',
        document.createElement('br'),
        descEl.createEl('code', { text: '{{frontmatter.key}}' }), ' or ', descEl.createEl('code', { text: '{{prop.key}}' }), ': Value of a frontmatter property.'
    );
    new Setting(containerEl)
        .setName('Variable Reference')
        .setDesc(variableDesc);

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

    new Setting(containerEl)
        .setName('Conflict Resolution')
        .setDesc('What to do if a file with the same name already exists in the destination folder.')
        .addDropdown((dropDown) =>
            dropDown
                .addOption('rename', 'Rename (e.g. Note (1))')
                .addOption('overwrite', 'Overwrite')
                .addOption('skip', 'Skip (do nothing)')
                .setValue(plugin.settings.conflict_resolution)
                .onChange(async (value: 'rename' | 'overwrite' | 'skip') => {
                    plugin.settings.conflict_resolution = value;
                    await plugin.saveSettings();
                    refreshCallback();
                })
        );


}

export function renderDebugSettings(plugin: AutoNoteMover, containerEl: HTMLElement, refreshCallback: () => void) {
    new Setting(containerEl)
        .setName('Debug Mode')
        .setDesc('Enable verbose logging to the developer console for debugging rules.')
        .addToggle((toggle) => {
            toggle.setValue(plugin.settings.debug_mode).onChange(async (value) => {
                plugin.settings.debug_mode = value;
                await plugin.saveSettings();
                refreshCallback();
            });
        });
}


