import { App, TFile } from 'obsidian';
import { Ruleset, Group, Trigger, Identifier, Action, CuratorConfig, Rule } from './types';
import { TriggerService } from './TriggerService';
import { GroupService } from './GroupService';
import { BinderService } from './BinderService';
import { IdentifierService } from './IdentifierService';
import { ActionService } from './ActionService';

export class RulesetService {
    private app: App;
    private triggerService: TriggerService;
    private groupService: GroupService;
    private binder: BinderService;
    private identifierService: IdentifierService;
    private actionService: ActionService;

    private rulesets: Ruleset[] = [];
    private groups: Map<string, Group> = new Map();
    private actions: Map<string, Action> = new Map();

    constructor(
        app: App,
        triggerService: TriggerService,
        groupService: GroupService,
        binder: BinderService,
        identifierService: IdentifierService,
        actionService: ActionService
    ) {
        this.app = app;
        this.triggerService = triggerService;
        this.groupService = groupService;
        this.binder = binder;
        this.identifierService = identifierService;
        this.actionService = actionService;
    }

    public updateConfig(config: CuratorConfig) {
        this.rulesets = config.rulesets;

        this.groups.clear();
        config.groups.forEach(g => this.groups.set(g.id, g));

        this.actions.clear();
        config.actions.forEach(a => this.actions.set(a.id, a));

        // Update dependencies
        this.groupService.updateIdentifiers(config.identifiers);

        // Re-register triggers
        const activeTriggerIds = new Set(this.rulesets.filter(r => r.enabled).map(r => r.triggerId));

        config.triggers.forEach(t => {
            if (activeTriggerIds.has(t.id)) {
                this.triggerService.registerTrigger(t, (triggerId, file) => {
                    this.handleTrigger(triggerId, file);
                });
            }
        });
    }

    private async handleTrigger(triggerId: string, file: TFile) {
        // Find all enabled rulesets that use this trigger
        const matchingRulesets = this.rulesets.filter(r => r.enabled && r.triggerId === triggerId);

        for (const ruleset of matchingRulesets) {
            this.binder.log('info', `Processing Ruleset: ${ruleset.name}`, file.path);

            for (const rule of ruleset.rules) {
                let match = true;

                // Check Group Condition if present
                if (rule.groupId) {
                    const group = this.groups.get(rule.groupId);
                    if (!group) {
                        this.binder.log('warning', `Rule in ${ruleset.name} references missing group ${rule.groupId}`, file.path);
                        match = false;
                    } else {
                        match = this.groupService.isInGroup(file, group);
                    }
                }

                if (match) {
                    this.binder.log('info', `Rule matched. Executing actions.`, file.path);
                    await this.executeActions(rule.actionIds, file);
                }
            }
        }
    }

    private async executeActions(actionIds: string[], file: TFile) {
        for (const actionId of actionIds) {
            const action = this.actions.get(actionId);
            if (!action) {
                this.binder.log('error', `Missing action ${actionId}`, file.path);
                continue;
            }

            try {
                await this.actionService.executeAction(file, action);
            } catch (error) {
                this.binder.log('error', `Failed to execute action ${action.name}`, file.path, error);
            }
        }
    }
}
