import { App, TFile } from 'obsidian';
import { Ruleset, Group, Job, Trigger, Identifier, Action, CuratorConfig } from './types';
import { TriggerService } from './TriggerService';
import { GroupService } from './GroupService';
import { JobService } from './JobService';
import { BinderService } from './BinderService';
import { IdentifierService } from './IdentifierService';
import { ActionService } from './ActionService';

export class RulesetService {
    private app: App;
    private triggerService: TriggerService;
    private groupService: GroupService;
    private jobService: JobService;
    private binder: BinderService;
    private identifierService: IdentifierService;
    private actionService: ActionService;

    private rulesets: Ruleset[] = [];
    private groups: Map<string, Group> = new Map();
    private jobs: Map<string, Job> = new Map();

    constructor(
        app: App,
        triggerService: TriggerService,
        groupService: GroupService,
        jobService: JobService,
        binder: BinderService,
        identifierService: IdentifierService,
        actionService: ActionService
    ) {
        this.app = app;
        this.triggerService = triggerService;
        this.groupService = groupService;
        this.jobService = jobService;
        this.binder = binder;
        this.identifierService = identifierService;
        this.actionService = actionService;
    }

    public updateConfig(config: CuratorConfig) {
        this.rulesets = config.rulesets;

        this.groups.clear();
        config.groups.forEach(g => this.groups.set(g.id, g));

        this.jobs.clear();
        config.jobs.forEach(j => this.jobs.set(j.id, j));

        // Update dependencies
        this.groupService.updateIdentifiers(config.identifiers);
        this.jobService.updateActions(config.actions);

        // Re-register triggers
        // For now, we just register a generic handler for all triggers referenced in enabled rulesets
        const activeTriggerIds = new Set(this.rulesets.filter(r => r.enabled).map(r => r.triggerId));

        // We need to register the triggers with the TriggerService if they are new
        config.triggers.forEach(t => {
            if (activeTriggerIds.has(t.id)) {
                this.triggerService.registerTrigger(t, (triggerId, file) => this.handleTrigger(triggerId, file));
            }
        });
    }

    private async handleTrigger(triggerId: string, file: TFile) {
        console.log(`[DEBUG] RulesetService handling trigger ${triggerId}`);
        // Find all enabled rulesets that use this trigger
        const matchingRulesets = this.rulesets.filter(r => r.enabled && r.triggerId === triggerId);

        for (const ruleset of matchingRulesets) {
            const group = this.groups.get(ruleset.groupId);
            if (!group) {
                this.binder.log('warning', `Ruleset ${ruleset.name} references missing group ${ruleset.groupId}`, file.path);
                continue;
            }

            if (this.groupService.isInGroup(file, group)) {
                const job = this.jobs.get(ruleset.jobId);
                if (!job) {
                    this.binder.log('warning', `Ruleset ${ruleset.name} references missing job ${ruleset.jobId}`, file.path);
                    continue;
                }

                this.binder.log('info', `Ruleset ${ruleset.name} matched. Running job ${job.name}.`, file.path);
                console.error('[DEBUG] Running job:', JSON.stringify(job));
                await this.jobService.runJob(job, file);
            }
        }
    }
}
