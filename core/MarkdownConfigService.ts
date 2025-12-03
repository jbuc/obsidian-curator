import { App, TFile, Notice } from 'obsidian';
import { Ruleset, Rule, Action, Trigger } from './types';
import { RulesetService } from './RulesetService';

export class MarkdownConfigService {
    private app: App;
    private rulesetService: RulesetService;
    private activeRulesets: Map<string, Ruleset> = new Map();
    private rulesetFolder: string = 'Curator Rules';

    constructor(app: App, rulesetService: RulesetService) {
        this.app = app;
        this.rulesetService = rulesetService;
    }

    public setRulesetFolder(folder: string) {
        this.rulesetFolder = folder;
    }

    public async initialize() {
        // No-op: Watchers removed in favor of Import/Export model
    }

    private async processFile(file: TFile) {
        try {
            const ruleset = await this.parseRuleset(file);
            this.activeRulesets.set(file.path, ruleset);
        } catch (e) {
            console.error(`[Curator] Failed to parse ruleset file: ${file.path}`, e);
            new Notice(`Curator: Error parsing ruleset "${file.basename}". See console for details.`);
            // We could optionally keep the old version or disable it. 
            // For now, let's remove it from active rulesets to "disable" it effectively.
            this.activeRulesets.delete(file.path);
        }
    }

    public async parseRuleset(file: TFile): Promise<Ruleset> {
        const content = await this.app.vault.read(file);
        const cache = this.app.metadataCache.getFileCache(file);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const frontmatter: any = cache?.frontmatter || {};

        // 1. Validate Frontmatter
        if (!frontmatter['curator-trigger']) {
            throw new Error('Missing "curator-trigger" in frontmatter.');
        }

        // 2. Parse Trigger Section
        const triggerBlock = this.extractCodeBlock(content, '# Trigger');
        const triggerQuery = triggerBlock ? triggerBlock.trim() : '';

        const trigger: Trigger = {
            type: frontmatter['curator-trigger'],
            query: triggerQuery,
            time: frontmatter['curator-trigger-time'],
            days: frontmatter['curator-trigger-days'],
            commandName: frontmatter['curator-trigger-command']
        };

        // 3. Parse Rules
        const rules: Rule[] = [];
        // Split by Level 2 headings (## )
        const sections = content.split(/^##\s+/m);
        // The first section is the Trigger section (before the first rule), so we skip it.
        for (let i = 1; i < sections.length; i++) {
            const section = sections[i];
            const lines = section.split('\n');
            const ruleName = lines[0].trim(); // The text after ## 

            // Extract Scope
            const scopeBlock = this.extractCodeBlock(section, '### Scope');
            const scopeQuery = scopeBlock ? scopeBlock.trim() : '';

            // Extract Actions
            const actionsBlock = this.extractSectionContent(section, '### Actions');
            const actions = this.parseActions(actionsBlock);

            rules.push({
                query: scopeQuery,
                useTriggerQuery: !scopeQuery, // If no scope defined, inherit trigger
                actions: actions
            });
        }

        return {
            id: frontmatter['curator-id'] || file.path,
            name: file.basename.replace('.ruleset', ''), // Clean name
            enabled: frontmatter['curator-enabled'] !== false,
            trigger: trigger,
            rules: rules,
            filePath: file.path
        };
    }

    private extractCodeBlock(content: string, sectionHeader: string): string | null {
        // 1. Find the header
        const headerIndex = content.indexOf(sectionHeader);
        if (headerIndex === -1) {
            console.log(`[Curator] Section header not found: "${sectionHeader}"`);
            return null;
        }

        // 2. Search AFTER the header
        const searchStart = headerIndex + sectionHeader.length;
        const remaining = content.substring(searchStart);

        // 3. Find start of code block
        // We look for ```dataview or ``` dataview
        const blockStartRegex = /```\s*dataview/i;
        const match = remaining.match(blockStartRegex);

        if (!match || match.index === undefined) {
            console.log(`[Curator] No dataview block found after "${sectionHeader}"`);
            return null;
        }

        const blockStartIndex = match.index + match[0].length;

        // 4. Find end of code block (next ```)
        const blockEndIndex = remaining.indexOf('```', blockStartIndex);
        if (blockEndIndex === -1) {
            console.log(`[Curator] No closing fence found for dataview block after "${sectionHeader}"`);
            return null;
        }

        return remaining.substring(blockStartIndex, blockEndIndex).trim();
    }

    private extractSectionContent(content: string, sectionHeader: string): string[] {
        const headerIndex = content.indexOf(sectionHeader);
        if (headerIndex === -1) return [];

        const searchStart = headerIndex + sectionHeader.length;
        let sectionText = content.substring(searchStart);

        // Find next header to stop at (if any)
        // We look for a line starting with #
        const nextHeaderMatch = sectionText.match(/^\s*#/m);
        if (nextHeaderMatch && nextHeaderMatch.index !== undefined) {
            sectionText = sectionText.substring(0, nextHeaderMatch.index);
        }

        return sectionText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    }

    private parseActions(lines: string[]): Action[] {
        const actions: Action[] = [];
        for (const line of lines) {
            // Match list items: 1. action or - action
            const match = line.match(/^(\d+\.|-)\s+(.+)$/);
            if (!match) continue;

            const text = match[2];
            let action: Action | null = null;

            // Natural Language Parsing
            if (text.startsWith('move to folder:')) {
                action = { type: 'move', config: { folder: text.replace('move to folder:', '').trim() } };
            } else if (text.startsWith('add tag:')) {
                action = { type: 'tag', config: { operation: 'add', tag: text.replace('add tag:', '').trim() } };
            } else if (text.startsWith('remove tag:')) {
                action = { type: 'tag', config: { operation: 'remove', tag: text.replace('remove tag:', '').trim() } };
            } else if (text.startsWith('rename:')) {
                const configStr = text.replace('rename:', '').trim();
                // Simple regex for key="value"
                const prefixMatch = configStr.match(/prefix="([^"]*)"/);
                const suffixMatch = configStr.match(/suffix="([^"]*)"/);
                action = {
                    type: 'rename',
                    config: {
                        prefix: prefixMatch ? prefixMatch[1] : undefined,
                        suffix: suffixMatch ? suffixMatch[1] : undefined
                    }
                };
            } else if (text.startsWith('update property:')) {
                const configStr = text.replace('update property:', '').trim();
                const keyMatch = configStr.match(/key="([^"]*)"/);
                const valueMatch = configStr.match(/value="([^"]*)"/);
                if (keyMatch && valueMatch) {
                    action = {
                        type: 'update',
                        config: { key: keyMatch[1], value: valueMatch[1] }
                    };
                }
            }

            if (action) actions.push(action);
        }
        return actions;
    }

    private formatQueryForFile(query: string): string {
        if (!query) return '';
        const trimmed = query.trim();
        // If it's already a full query, return as is
        if (/^(LIST|TABLE|TASK|CALENDAR)/i.test(trimmed)) {
            return trimmed;
        }
        // If it starts with FROM/WHERE etc, prepend LIST
        if (/^(FROM|WHERE|FLATTEN|LIMIT|SORT)/i.test(trimmed)) {
            return `LIST ${trimmed}`;
        }
        // If it looks like "Source WHERE...", prepend LIST FROM
        if (/\s(WHERE|FLATTEN|LIMIT|SORT)\s/i.test(trimmed)) {
            return `LIST FROM ${trimmed}`;
        }
        // Otherwise, assume it's a source and prepend LIST FROM
        // Wait, if it's just "folder", LIST FROM "folder" is valid.
        // But if it's #tag, LIST FROM #tag is valid.
        return `LIST FROM ${trimmed}`;
    }

    public async writeRuleset(ruleset: Ruleset): Promise<string> {
        let content = '---\n';
        content += `curator-id: "${ruleset.id}"\n`;
        content += `curator-enabled: ${ruleset.enabled}\n`;
        content += `curator-trigger: "${ruleset.trigger.type}"\n`;
        if (ruleset.trigger.time) content += `curator-trigger-time: "${ruleset.trigger.time}"\n`;
        if (ruleset.trigger.days) content += `curator-trigger-days: [${ruleset.trigger.days.join(', ')}]\n`;
        if (ruleset.trigger.commandName) content += `curator-trigger-command: "${ruleset.trigger.commandName}"\n`;
        content += '---\n\n';

        content += '# Trigger\n';
        if (ruleset.trigger.query) {
            content += '``` dataview\n';
            content += this.formatQueryForFile(ruleset.trigger.query) + '\n';
            content += '```\n';
        }
        content += '\n';

        for (let i = 0; i < ruleset.rules.length; i++) {
            const rule = ruleset.rules[i];
            const ruleName = `Rule ${i + 1}`; // Or use a name property if we add one to Rule interface
            content += `## ${ruleName}\n`;

            content += '### Scope\n';
            if (rule.query) {
                content += '``` dataview\n';
                content += this.formatQueryForFile(rule.query) + '\n';
                content += '```\n';
            } else {
                content += '_Inherits Trigger Scope_\n';
            }
            content += '\n';

            content += '### Actions\n';
            for (const action of rule.actions) {
                let line = '';
                if (action.type === 'move') line = `move to folder: ${action.config.folder}`;
                else if (action.type === 'tag') line = `${action.config.operation} tag: ${action.config.tag}`;
                else if (action.type === 'rename') line = `rename: prefix="${action.config.prefix || ''}", suffix="${action.config.suffix || ''}"`;
                else if (action.type === 'update') line = `update property: key="${action.config.key}", value="${action.config.value}"`;

                content += `1. ${line}\n`;
            }
            content += '\n';
        }

        let targetPath = ruleset.filePath;

        // If it's a new file or doesn't have the correct extension
        if (!targetPath || !targetPath.endsWith('.ruleset.md')) {
            const fileName = `${ruleset.name.replace(/[^a-z0-9]/gi, '_').trim()}.ruleset.md`;

            if (this.rulesetFolder) {
                // Ensure folder exists
                const folder = this.app.vault.getAbstractFileByPath(this.rulesetFolder);
                if (!folder) {
                    await this.app.vault.createFolder(this.rulesetFolder);
                }
                targetPath = `${this.rulesetFolder}/${fileName}`;
            } else {
                targetPath = fileName;
            }
        }

        const file = this.app.vault.getAbstractFileByPath(targetPath);
        if (file instanceof TFile) {
            await this.app.vault.modify(file, content);
        } else {
            await this.app.vault.create(targetPath, content);
        }

        return targetPath;
    }
}
