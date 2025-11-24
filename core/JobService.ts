import { App, TFile } from 'obsidian';
import { Job, Action } from './types';
import { ActionService } from './ActionService';
import { BinderService } from './BinderService';

export class JobService {
    private app: App;
    private actionService: ActionService;
    private binder: BinderService;
    private actions: Map<string, Action> = new Map();

    constructor(app: App, actionService: ActionService, binder: BinderService) {
        this.app = app;
        this.actionService = actionService;
        this.binder = binder;
    }

    public updateActions(actions: Action[]) {
        this.actions.clear();
        actions.forEach(a => this.actions.set(a.id, a));
    }

    public async runJob(job: Job, file: TFile) {
        // throw new Error(`runJob called for ${job.name}. Actions: ${job.actionIds.join(', ')}`);
        this.binder.log('info', `Starting job ${job.name}`, file.path);

        for (const actionId of job.actionIds) {
            const action = this.actions.get(actionId);
            if (!action) {
                this.binder.log('error', `Job ${job.name} references missing action ${actionId}`, file.path);
                continue;
            }

            try {
                await this.actionService.executeAction(file, action);
            } catch (error) {
                // Should we stop the job on error? For now, yes.
                this.binder.log('error', `Job ${job.name} stopped due to error`);
                return;
            }
        }

        this.binder.log('info', `Completed job ${job.name}`, file.path);
    }
}
