import { App, Modal, Setting } from 'obsidian';
import { FolderSuggest } from './FolderSuggest';

export class AddRulesetModal extends Modal {
    private onSubmit: (name: string, triggerType: any, folder: string | null) => void;
    private name: string = 'New Ruleset';
    private triggerType: string = 'change_to';
    private isFile: boolean = true;
    private folder: string;

    constructor(app: App, defaultFolder: string, onSubmit: (name: string, triggerType: any, folder: string | null) => void) {
        super(app);
        this.folder = defaultFolder || '';
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Create New Ruleset' });

        new Setting(contentEl)
            .setName('Ruleset Name')
            .addText(text => text
                .setValue(this.name)
                .onChange(value => {
                    this.name = value;
                }));

        new Setting(contentEl)
            .setName('Trigger When...')
            .addDropdown(dropdown => dropdown
                .addOption('change_to', 'Notes change to...')
                .addOption('change_from', 'Notes change from...')
                .addOption('startup', 'Obsidian starts')
                .addOption('schedule', 'Scheduled time')
                .addOption('manual', 'A command runs')
                .setValue(this.triggerType)
                .onChange(value => {
                    this.triggerType = value;
                }));

        const fileSetting = new Setting(contentEl)
            .setName('Save as Markdown File')
            .setDesc('Save configuration in a .ruleset.md file')
            .addToggle(toggle => toggle
                .setValue(this.isFile)
                .onChange(value => {
                    this.isFile = value;
                    folderSetting.settingEl.style.display = value ? '' : 'none';
                }));

        const folderSetting = new Setting(contentEl)
            .setName('Folder')
            .setDesc('Where to save the ruleset file')
            .addText(text => {
                text.setValue(this.folder)
                    .onChange(value => {
                        this.folder = value;
                    });
                new FolderSuggest(this.app, text.inputEl);
            });

        // Initial visibility
        folderSetting.settingEl.style.display = this.isFile ? '' : 'none';

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Create')
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onSubmit(this.name, this.triggerType, this.isFile ? this.folder : null);
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
