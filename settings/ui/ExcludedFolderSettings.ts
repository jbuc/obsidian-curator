import { App, Setting, ButtonComponent } from 'obsidian';
import { AutoNoteMoverSettings } from '../settings';
import { FolderSuggest } from 'suggests/file-suggest';
import { arrayMove } from 'utils/Utils';
import AutoNoteMover from 'main';

export function renderExcludedFolderSettings(app: App, plugin: AutoNoteMover, containerEl: HTMLElement, refreshCallback: () => void) {
    const useRegexToCheckForExcludedFolder = document.createDocumentFragment();
    useRegexToCheckForExcludedFolder.append(
        'If enabled, excluded folder will be checked with regular expressions.'
    );

    new Setting(containerEl)
        .setName('Use regular expressions to check for excluded folder')
        .setDesc(useRegexToCheckForExcludedFolder)
        .addToggle((toggle) => {
            toggle.setValue(plugin.settings.use_regex_to_check_for_excluded_folder).onChange(async (value) => {
                plugin.settings.use_regex_to_check_for_excluded_folder = value;
                await plugin.saveSettings();
                refreshCallback();
            });
        });

    const excludedFolderDesc = document.createDocumentFragment();
    excludedFolderDesc.append(
        'Notes in the excluded folder will not be moved.',
        document.createElement('br'),
        'This takes precedence over the notes movement rules.'
    );
    new Setting(containerEl)

        .setName('Add Excluded Folder')
        .setDesc(excludedFolderDesc)
        .addButton((button: ButtonComponent) => {
            button
                .setTooltip('Add Excluded Folders')
                .setButtonText('+')
                .setCta()
                .onClick(async () => {
                    plugin.settings.excluded_folder.push({
                        folder: '',
                    });
                    await plugin.saveSettings();
                    refreshCallback();
                });
        });

    plugin.settings.excluded_folder.forEach((excluded_folder, index) => {
        const s = new Setting(containerEl)
            .addSearch((cb) => {
                new FolderSuggest(app, cb.inputEl);
                cb.setPlaceholder('Folder')
                    .setValue(excluded_folder.folder)
                    .onChange(async (newFolder) => {
                        plugin.settings.excluded_folder[index].folder = newFolder;
                        await plugin.saveSettings();
                    });
            })

            .addExtraButton((cb) => {
                cb.setIcon('up-chevron-glyph')
                    .setTooltip('Move up')
                    .onClick(async () => {
                        arrayMove(plugin.settings.excluded_folder, index, index - 1);
                        await plugin.saveSettings();
                        refreshCallback();
                    });
            })
            .addExtraButton((cb) => {
                cb.setIcon('down-chevron-glyph')
                    .setTooltip('Move down')
                    .onClick(async () => {
                        arrayMove(plugin.settings.excluded_folder, index, index + 1);
                        await plugin.saveSettings();
                        refreshCallback();
                    });
            })
            .addExtraButton((cb) => {
                cb.setIcon('cross')
                    .setTooltip('Delete')
                    .onClick(async () => {
                        plugin.settings.excluded_folder.splice(index, 1);
                        await plugin.saveSettings();
                        refreshCallback();
                    });
            });
        s.infoEl.remove();
    });
}
