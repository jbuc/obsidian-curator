import { App, TFile, normalizePath, Notice } from 'obsidian';
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
                    await this.moveFile(file, action.config);
                    break;
                case 'rename':
                    await this.renameFile(file, action.config);
                    break;
                case 'tag':
                    await this.tagFile(file, action.config);
                    break;
                default:
                    this.binder.log('warning', `Unknown action type: ${action.type}`, file.path);
            }
        } catch (error) {
            this.binder.log('error', `Failed to execute action ${action.name}`, file.path, error);
            throw error;
        }
    }

    private async moveFile(file: TFile, config: { folder: string, createIfMissing?: boolean }) {
        let targetFolder = normalizePath(config.folder);

        // Check if folder exists
        if (!await this.app.vault.adapter.exists(targetFolder)) {
            if (config.createIfMissing) {
                await this.app.vault.createFolder(targetFolder);
                this.binder.log('info', `Created folder ${targetFolder}`);
            } else {
                this.binder.log('error', `Target folder ${targetFolder} does not exist`, file.path);
                return;
            }
        }

        const targetPath = normalizePath(`${targetFolder}/${file.name}`);
        if (targetPath === file.path) return; // No change

        // Check if target file exists
        if (await this.app.vault.adapter.exists(targetPath)) {
            this.binder.log('warning', `File ${targetPath} already exists. Skipping move.`, file.path);
            return;
        }

        await this.app.fileManager.renameFile(file, targetPath);
        this.binder.log('success', `Moved file to ${targetFolder}`, targetPath);
    }

    private async renameFile(file: TFile, config: { prefix?: string, suffix?: string, replace?: string }) {
        let newName = file.basename;

        if (config.replace) {
            newName = config.replace;
        }
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

    private async tagFile(file: TFile, config: { tag: string, operation: 'add' | 'remove' }) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.app.fileManager as any).processFrontmatter(file, (frontmatter: any) => {
            let tags = frontmatter['tags'];
            if (!tags) tags = [];
            if (!Array.isArray(tags)) tags = [tags];

            const targetTag = config.tag.startsWith('#') ? config.tag.substring(1) : config.tag;

            if (config.operation === 'add') {
                if (!tags.includes(targetTag)) {
                    tags.push(targetTag);
                    this.binder.log('success', `Added tag #${targetTag}`, file.path);
                }
            } else if (config.operation === 'remove') {
                const index = tags.indexOf(targetTag);
                if (index > -1) {
                    tags.splice(index, 1);
                    this.binder.log('success', `Removed tag #${targetTag}`, file.path);
                }
            }

            frontmatter['tags'] = tags;
        });
    }
}
