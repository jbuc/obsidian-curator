import { App, TFile } from 'obsidian';
import { Ruleset, CuratorConfig, Rule, Action } from './types';
import { TriggerService } from './TriggerService';
import { GroupService } from './GroupService';
import { BinderService } from './BinderService';
import { ActionService } from './ActionService';

export class RulesetService {
    private app: App;
    private triggerService: TriggerService;
    private groupService: GroupService;
    private binder: BinderService;
    private actionService: ActionService;

    private rulesets: Ruleset[] = [];

    constructor(
        app: App,
        triggerService: TriggerService,
        groupService: GroupService,
        binder: BinderService,
        actionService: ActionService
    ) {
        this.app = app;
        this.triggerService = triggerService;
        this.groupService = groupService;
        this.binder = binder;
        this.actionService = actionService;
    }

    public updateConfig(config: CuratorConfig) {
        this.rulesets = config.rulesets;

        // Clear existing triggers
        this.triggerService.clearTriggers();

        // Register triggers for enabled rulesets
        this.rulesets.forEach(ruleset => {
            if (ruleset.enabled) {
                this.triggerService.registerTrigger(ruleset.trigger, (file) => {
                    this.handleTrigger(ruleset, file);
                });
            }
        });
    }

    private async handleTrigger(ruleset: Ruleset, file: TFile) {
        this.binder.log('info', `Processing Ruleset: ${ruleset.name}`, file.path);

        // If trigger has a query (scope), check if file matches it
        if (ruleset.trigger.query) {
            const matchesScope = this.groupService.matchesQuery(file, ruleset.trigger.query);
            if (!matchesScope) {
                // this.binder.log('info', `File does not match trigger scope.`, file.path);
                return;
            }
        }

        for (const rule of ruleset.rules) {
            let match = true;

            // Determine query to use
            let query = rule.query;
            if (rule.useTriggerQuery) {
                query = ruleset.trigger.query || '';
            }

            // Check Condition
            if (query) {
                match = this.groupService.matchesQuery(file, query);
            }

            if (match) {
                this.binder.log('info', `Rule matched. Executing actions.`, file.path);
                await this.executeActions(rule.actions, file);
            }
        }
    }

    private async executeActions(actions: Action[], file: TFile) {
        for (const action of actions) {
            try {
                await this.actionService.executeAction(file, action);
            } catch (error) {
                this.binder.log('error', `Failed to execute action ${action.type}`, file.path, error);
            }
        }
    }

    /**
     * Simulates a run of a specific ruleset on all matching files.
     */
    public async dryRun(rulesetId: string): Promise<{ file: TFile; actions: string[] }[]> {
        const ruleset = this.rulesets.find(r => r.id === rulesetId);
        if (!ruleset) return [];

        // 1. Identify candidate files based on Trigger Scope
        let candidateFiles: TFile[] = [];
        if (ruleset.trigger.query) {
            candidateFiles = this.groupService.getMatchingFiles(ruleset.trigger.query);
        } else {
            // If no scope, potentially ALL files? Or maybe just active file?
            // For dry run, let's assume all files if no scope is defined, 
            // BUT this is dangerous/slow. Let's default to all files but warn?
            // Or maybe just return empty if no scope?
            // Let's return all markdown files.
            candidateFiles = this.app.vault.getMarkdownFiles();
        }

        const results: { file: TFile; actions: string[] }[] = [];

        for (const file of candidateFiles) {
            const fileActions: string[] = [];

            for (const rule of ruleset.rules) {
                let match = true;

                let query = rule.query;
                if (rule.useTriggerQuery) {
                    query = ruleset.trigger.query || '';
                }

                if (query) {
                    match = this.groupService.matchesQuery(file, query);
                }

                if (match) {
                    rule.actions.forEach(action => {
                        let desc = action.type;
                        if (action.type === 'move') desc += ` to ${action.config.folder}`;
                        else if (action.type === 'tag') desc += ` ${action.config.operation} ${action.config.tag}`;
                        else if (action.type === 'rename') desc += ` (prefix: ${action.config.prefix}, suffix: ${action.config.suffix})`;
                        else if (action.type === 'update') desc += ` ${action.config.key} = ${action.config.value}`;
                        fileActions.push(desc);
                    });
                }
            }

            if (fileActions.length > 0) {
                results.push({ file, actions: fileActions });
            }
        }

        return results;
    }
}
