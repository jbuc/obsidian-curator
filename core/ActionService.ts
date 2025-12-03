import { App, TFile, normalizePath } from 'obsidian';
import { Action } from './types';
import { BinderService } from './BinderService';

export class ActionService {
    private app: App;
    private binder: BinderService;

    constructor(app: App, binder: BinderService) {
        this.app = app;
        this.binder = binder;
    }

    public async executeAction(file: TFile, action: Action): Promise<void> {
        try {
            switch (action.type) {
                case 'move':
                    if (action.config.folder) {
                        await this.moveFile(file, action.config.folder);
                    }
                    break;
                case 'rename':
                    await this.renameFile(file, action.config);
                    break;
                case 'tag':
                    if (action.config.tag) {
                        await this.tagFile(file, action.config.tag, action.config.operation || 'add');
                    }
                    break;
                case 'update':
                    if (action.config.key) {
                        await this.updateProperty(file, action.config.key, action.config.value || '');
                    }
                    break;
                default:
                    this.binder.log('warning', `Unknown action type: ${action.type}`, file.path);
            }
        } catch (error) {
            this.binder.log('error', `Failed to execute action ${action.type}`, file.path, error);
            throw error;
        }
    }

    private async moveFile(file: TFile, folder: string) {
        let targetFolder = normalizePath(folder);

        // Check if folder exists
        const folderExists = await this.app.vault.adapter.exists(targetFolder);

        if (!folderExists) {
            // Always create if missing for now, or make it configurable?
            // The new UI doesn't have a "create if missing" checkbox.
            // Let's assume yes.
            await this.app.vault.createFolder(targetFolder);
            this.binder.log('info', `Created folder ${targetFolder}`);
        }

        const targetPath = normalizePath(`${targetFolder}/${file.name}`);

        if (targetPath === file.path) {
            return; // No change
        }

        // Check if target file exists
        const targetFileExists = await this.app.vault.adapter.exists(targetPath);

        if (targetFileExists) {
            this.binder.log('warning', `File ${targetPath} already exists. Skipping move.`, file.path);
            return;
        }

        await this.app.fileManager.renameFile(file, targetPath);
        this.binder.log('success', `Moved file to ${targetFolder}`, targetPath);
    }

    private async renameFile(file: TFile, config: { prefix?: string, suffix?: string }) {
        let newName = file.basename;

        if (config.prefix) {
            newName = `${config.prefix}${newName}`;
        }
        if (config.suffix) {
            newName = `${newName}${config.suffix}`;
        }

        if (newName === file.basename) return;

        const targetPath = normalizePath(`${file.parent?.path}/${newName}.${file.extension}`);

        if (await this.app.vault.adapter.exists(targetPath)) {
            this.binder.log('warning', `File ${targetPath} already exists. Skipping rename.`, file.path);
            return;
        }

        await this.app.fileManager.renameFile(file, targetPath);
        this.binder.log('success', `Renamed file to ${newName}`, targetPath);
    }

    private async tagFile(file: TFile, tag: string, operation: 'add' | 'remove') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.app.fileManager as any).processFrontmatter(file, (frontmatter: any) => {
            let tags = frontmatter['tags'];
            if (!tags) tags = [];
            if (!Array.isArray(tags)) tags = [tags];

            const targetTag = tag.startsWith('#') ? tag.substring(1) : tag;

            if (operation === 'add') {
                if (!tags.includes(targetTag)) {
                    tags.push(targetTag);
                    this.binder.log('success', `Added tag #${targetTag}`, file.path);
                }
            } else if (operation === 'remove') {
                const index = tags.indexOf(targetTag);
                if (index > -1) {
                    tags.splice(index, 1);
                    this.binder.log('success', `Removed tag #${targetTag}`, file.path);
                }
            }

            frontmatter['tags'] = tags;
        });
    }

    private async updateProperty(file: TFile, key: string, value: string) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.app.fileManager as any).processFrontmatter(file, (frontmatter: any) => {
            frontmatter[key] = value;
            this.binder.log('success', `Updated property ${key} to ${value}`, file.path);
        });
    }
}
