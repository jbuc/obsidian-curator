import { App, TFile, CachedMetadata, normalizePath, getAllTags, Notice } from 'obsidian';
import { AutoNoteMoverSettings, RuleGroup } from 'settings/settings';
import { FilterRule } from 'filter/filterTypes';
import { fileMove, isFmDisable } from 'utils/Utils';
import { evaluateRules } from 'filter/filterEvaluator';
import { executeActions } from 'filter/actionExecutor';
import { FilterNode } from 'filter/filterTypes';
import { MetadataService } from './MetadataService';
import { HistoryService } from './HistoryService';

export class CoreService {
    private processingFiles = new Set<string>();
    private runningApplyPromise: Promise<void> | null = null;

    constructor(
        private app: App,
        private settings: AutoNoteMoverSettings,
        private metadataService: MetadataService,
        private historyService: HistoryService
    ) { }

    updateSettings(settings: AutoNoteMoverSettings) {
        this.settings = settings;
    }

    async fileCheck(file: TFile, oldPath?: string, caller?: string) {
        if (this.settings.trigger_auto_manual !== 'Automatic' && caller !== 'cmd') {
            return;
        }
        if (file.extension.toLowerCase() !== 'md') return;

        if (this.settings.debug_mode) {
            console.log(`[Auto Note Mover] Checking file: ${file.path}`);
        }

        if (this.processingFiles.has(file.path)) return;
        if (this.metadataService.shouldIgnore(file)) return;

        // Ignore redundant rename signals where path truly didn't change.
        if (oldPath) {
            const normalizedOld = normalizePath(oldPath);
            const normalizedNew = normalizePath(file.path);
            if (normalizedOld === normalizedNew) {
                return;
            }
        }

        // Excluded folder handling (including nested paths)
        if (this.isInExcludedFolder(file)) {
            return;
        }

        const fileCache = this.app.metadataCache.getFileCache(file);
        // Disable AutoNoteMover when "AutoNoteMover: disable" is present in the frontmatter.
        if (isFmDisable(fileCache)) {
            return;
        }

        if (!this.metadataService.hasMetadataChanged(file, fileCache, caller)) {
            if (this.settings.debug_mode) {
                console.log(`[Auto Note Mover] Metadata not changed for ${file.path}, skipping.`);
            }
            return;
        }

        const { handled } = await this.tryFilterEngine(file, fileCache);
        if (handled) {
            return;
        }

        this.applyLegacyRules(file, fileCache);
    }

    private applyLegacyRules(file: TFile, fileCache: CachedMetadata | null) {
        const fileName = file.basename;
        const fileFullName = file.basename + '.' + file.extension;
        const propertyRules = this.settings.property_rules;
        const settingsLength = propertyRules.length;
        const cacheTag = getAllTags(fileCache) ?? [];

        const getFrontmatterValue = (key: string) => {
            const frontmatter = fileCache?.frontmatter;
            if (!frontmatter) return undefined;
            const normalized = key.replace(/^frontmatter\./i, '');
            return frontmatter[normalized] ?? frontmatter[normalized.toLowerCase()];
        };

        const getPropertyValues = (property: string): string[] => {
            const normalizedProperty = property.trim();
            if (!normalizedProperty) return [];
            const lowerProperty = normalizedProperty.toLowerCase();

            if (lowerProperty === 'tags' || lowerProperty === 'tag') {
                const expandedTags = new Set<string>();
                cacheTag.forEach((tag) => {
                    if (!tag) return;
                    expandedTags.add(tag);
                    if (tag.startsWith('#')) {
                        expandedTags.add(tag.substring(1));
                    }
                });
                return Array.from(expandedTags);
            }
            if (lowerProperty === 'title' || lowerProperty === 'basename' || lowerProperty === 'name') {
                return [fileName];
            }
            if (lowerProperty === 'path') {
                return [file.path];
            }
            if (lowerProperty === 'folder' || lowerProperty === 'directory') {
                return [file.parent?.path ?? ''];
            }

            const value = getFrontmatterValue(normalizedProperty);
            if (value === undefined || value === null) {
                return [];
            }
            if (Array.isArray(value)) {
                return value.map((entry) => String(entry));
            }
            if (['string', 'number', 'boolean'].includes(typeof value)) {
                return [String(value)];
            }
            return [];
        };

        // checker
        for (let i = 0; i < settingsLength; i++) {
            const rule = propertyRules[i];
            const folder = rule.folder?.trim();
            const property = rule.property?.trim();
            const value = rule.value?.trim();
            const titlePattern = rule.title;

            if (!folder) {
                continue;
            }

            let propertyMatched = false;
            if (property && value) {
                const propertyValues = getPropertyValues(property);
                propertyMatched = propertyValues.some((candidate) => candidate === value);
            }

            let titleMatched = false;
            if (titlePattern) {
                try {
                    const regex = new RegExp(titlePattern);
                    titleMatched = regex.test(fileName);
                } catch (error) {
                    console.error('[Auto Note Mover] Invalid title regular expression:', titlePattern, error);
                    continue;
                }
            }

            if (!propertyMatched && !titleMatched) {
                continue;
            }

            fileMove(this.app, folder, fileFullName, file);
            break;
        }
    }

    async getMatchingRules(file: TFile, fileCache: CachedMetadata | null): Promise<{ rule: FilterRule; actions: any[] }[]> {
        if (!this.settings.filter_engine_enabled) {
            return [];
        }
        if (this.isInExcludedFolder(file)) {
            return [];
        }
        if (file.extension.toLowerCase() !== 'md') {
            return [];
        }
        const rules = this.collectEnabledRules(this.settings.rule_groups ?? [], this.settings.filter_rules ?? []);
        if (!rules.length) {
            return [];
        }

        const requiresContent = this.rulesRequireProperty(rules, 'file.content');
        let content: string | undefined;
        if (requiresContent) {
            try {
                content = await this.app.vault.read(file);
            } catch (error) {
                console.error('[Auto Note Mover] Failed to read file content for filter evaluation', error);
            }
        }

        const tags = getAllTags(fileCache) ?? [];
        const frontmatter = (fileCache?.frontmatter as Record<string, unknown>) ?? {};
        const context = {
            file,
            path: file.path,
            folder: file.parent?.path ?? '',
            name: file.basename,
            extension: file.extension,
            tags,
            frontmatter,
            cache: fileCache,
            content,
        };

        return evaluateRules(rules, context, this.settings.tracked_properties, this.settings.debug_mode);
    }

    private async tryFilterEngine(file: TFile, fileCache: CachedMetadata | null, dryRun = false): Promise<{ handled: boolean; logs: string[] }> {
        const matches = await this.getMatchingRules(file, fileCache);
        if (!matches.length) {
            if (this.settings.debug_mode && !dryRun) {
                console.log(`[Auto Note Mover] No matching rules for ${file.path}`);
            }
            return { handled: false, logs: [] };
        }

        if (this.settings.debug_mode && !dryRun) {
            console.log(`[Auto Note Mover] Found ${matches.length} matching rules for ${file.path}`);
        }

        const actionContext = {
            app: this.app,
            file,
            historyService: this.historyService,
            conflictResolution: this.settings.conflict_resolution,
            dryRun,
            trackedProperties: this.settings.tracked_properties
        };

        if (!dryRun) {
            this.processingFiles.add(file.path);
        }

        const allLogs: string[] = [];
        for (const match of matches) {
            try {
                if (this.settings.debug_mode && !dryRun) {
                    console.log(`[Auto Note Mover] Executing actions for rule: ${match.rule.name}`);
                }
                const logs = await executeActions(match.actions, actionContext);
                if (dryRun && logs.length > 0) {
                    allLogs.push(`Rule "${match.rule.name}": ${logs.join(', ')}`);
                }
            } catch (error) {
                console.error('[Auto Note Mover] Failed to execute actions for rule', match.rule?.name, error);
            }
        }

        if (!dryRun) {
            this.metadataService.setIgnoreCooldown(file);
            this.processingFiles.delete(file.path);
        }
        return { handled: true, logs: allLogs };
    }

    async applyRulesToAllFiles(): Promise<void> {
        if (this.runningApplyPromise) {
            return this.runningApplyPromise;
        }
        this.runningApplyPromise = (async () => {
            try {
                const files = this.app.vault.getMarkdownFiles();
                let processed = 0;
                let changed = 0;
                for (const file of files) {
                    const cache = this.app.metadataCache.getFileCache(file);
                    const excluded = this.isInExcludedFolder(file);

                    if (excluded) {
                        continue;
                    }
                    const { handled } = await this.tryFilterEngine(file, cache ?? null);
                    if (handled) {
                        changed += 1;
                    }
                    processed += 1;
                    if (processed % 25 === 0) {
                        await new Promise((resolve) => setTimeout(resolve, 0));
                    }

                    // Note: Metadata fingerprint updating logic was in the original loop but seems redundant if tryFilterEngine handles it or if we just want to refresh.
                    // For now, we let the normal event loop handle subsequent updates, or we could explicitly update fingerprints here if needed.
                }
                new Notice(`[Auto Note Mover] Applied rules to ${changed} file${changed === 1 ? '' : 's'}.`);
            } catch (error) {
                console.error('[Auto Note Mover] Failed to apply rules across vault', error);
                new Notice('Auto Note Mover: Failed to apply rules. See console for details.');
            } finally {
                this.runningApplyPromise = null;
            }
        })();
        return this.runningApplyPromise;
    }

    async runDryRun(): Promise<string[]> {
        const files = this.app.vault.getMarkdownFiles();
        const report: string[] = [];
        for (const file of files) {
            if (this.isInExcludedFolder(file)) continue;
            const cache = this.app.metadataCache.getFileCache(file);
            const { handled, logs } = await this.tryFilterEngine(file, cache ?? null, true);
            if (handled && logs.length > 0) {
                report.push(`File: ${file.path}`);
                logs.forEach(log => report.push(`  - ${log}`));
            }
        }
        return report;
    }

    private isInExcludedFolder(file: TFile): boolean {
        const parentPath = normalizePath(file.parent?.path ?? '');
        for (const entry of this.settings.excluded_folder) {
            const folder = entry.folder?.trim();
            if (!folder) continue;
            if (!this.settings.use_regex_to_check_for_excluded_folder) {
                const normalizedFolder = normalizePath(folder).replace(/\/+$/, '');
                if (!normalizedFolder) continue;
                if (
                    parentPath === normalizedFolder ||
                    parentPath.startsWith(`${normalizedFolder}/`) ||
                    normalizedFolder === '.'
                ) {
                    return true;
                }
            } else {
                try {
                    const regex = new RegExp(folder);
                    if (regex.test(parentPath)) {
                        return true;
                    }
                } catch (error) {
                    console.error('[Auto Note Mover] Invalid excluded folder regex', folder, error);
                }
            }
        }
        return false;
    }

    private collectEnabledRules(groups: RuleGroup[], fallback: FilterRule[]): FilterRule[] {
        const enabled = (groups ?? []).filter((group) => group.enabled !== false);
        const flattened = enabled.flatMap((group) => group.rules ?? []);
        if (flattened.length) {
            return flattened;
        }
        return fallback ?? [];
    }

    private rulesRequireProperty(rules: FilterRule[], property: string): boolean {
        const target = property.toLowerCase();
        return rules.some((rule) => this.filterNodeUsesProperty(rule.filter, target));
    }

    private filterNodeUsesProperty(node: FilterNode, property: string): boolean {
        if (node.type === 'condition') {
            return node.property?.toLowerCase() === property;
        }
        return node.children.some((child) => this.filterNodeUsesProperty(child, property));
    }
}
