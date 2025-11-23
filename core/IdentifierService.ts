import { App, TFile, getAllTags } from 'obsidian';
import { Identifier } from './types';

export class IdentifierService {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Checks if a file matches the given identifier.
     */
    public matches(file: TFile, identifier: Identifier): boolean {
        switch (identifier.type) {
            case 'tag':
                return this.checkTag(file, identifier.config);
            case 'folder':
                return this.checkFolder(file, identifier.config);
            case 'frontmatter':
                return this.checkFrontmatter(file, identifier.config);
            default:
                console.warn(`[Curator] Unknown identifier type: ${identifier.type}`);
                return false;
        }
    }

    private checkTag(file: TFile, config: { tag: string }): boolean {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache) return false;
        const tags = getAllTags(cache);
        if (!tags) return false;

        // Simple exact match or starts with for nested tags
        // config.tag should probably include the '#'
        const target = config.tag.startsWith('#') ? config.tag : '#' + config.tag;
        return tags.some(t => t === target || t.startsWith(target + '/'));
    }

    private checkFolder(file: TFile, config: { folder: string, includeSubfolders: boolean }): boolean {
        if (!file.parent) return false;
        const parentPath = file.parent.path;

        if (config.includeSubfolders) {
            return parentPath === config.folder || parentPath.startsWith(config.folder + '/');
        } else {
            return parentPath === config.folder;
        }
    }

    private checkFrontmatter(file: TFile, config: { key: string, value?: string, exists?: boolean }): boolean {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache || !cache.frontmatter) return false;

        const val = cache.frontmatter[config.key];

        if (config.exists) {
            return val !== undefined;
        }

        // Simple equality check for now. 
        // We might want regex or other comparators later.
        return val === config.value;
    }
}
