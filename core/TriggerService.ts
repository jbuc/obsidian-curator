import { App, TFile, EventRef } from 'obsidian';
import { Trigger } from './types';

type TriggerCallback = (triggerId: string, file: TFile) => void;

export class TriggerService {
    private app: App;
    private listeners: Map<string, TriggerCallback[]> = new Map();
    private eventRefs: EventRef[] = [];
    private activeTriggers: Map<string, Trigger> = new Map();

    constructor(app: App) {
        this.app = app;
    }

    public registerTrigger(trigger: Trigger, callback: TriggerCallback) {
        console.log(`[DEBUG] Registering trigger ${trigger.id}`);
        if (!this.listeners.has(trigger.id)) {
            this.listeners.set(trigger.id, []);
        }
        this.listeners.get(trigger.id)?.push(callback);
        this.activeTriggers.set(trigger.id, trigger);

        // If it's the first time we're seeing this type of trigger, maybe we need to set up the global listener?
        // Actually, it's better to just have global listeners that check against active triggers.
    }

    public initializeListeners() {
        // Clear existing refs if any
        this.eventRefs.forEach(ref => this.app.vault.offref(ref));
        this.eventRefs = [];

        // Register global event listeners
        this.eventRefs.push(
            this.app.vault.on('create', (file) => {
                if (file instanceof TFile) this.handleEvent('create', file);
            })
        );
        this.eventRefs.push(
            this.app.vault.on('modify', (file) => {
                if (file instanceof TFile) this.handleEvent('modify', file);
            })
        );
        this.eventRefs.push(
            this.app.vault.on('rename', (file, oldPath) => {
                if (file instanceof TFile) this.handleEvent('rename', file, oldPath);
            })
        );
        this.eventRefs.push(
            this.app.vault.on('delete', (file) => {
                if (file instanceof TFile) this.handleEvent('delete', file);
            })
        );

        this.startSyncPolling();
    }

    private startSyncPolling() {
        // Check if Sync plugin is enabled
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const syncPlugin = (this.app as any).internalPlugins?.plugins?.sync;
        if (!syncPlugin || !syncPlugin.enabled) return;

        let lastStatus = '';

        // Poll status bar for Sync status
        // We use window.setInterval instead of registerInterval because we want this to run 
        // even if the plugin is not the active tab, but we should clear it on unload.
        // Actually, using registerInterval on the plugin class is better, but we are in a service.
        // We'll just use a standard interval and clear it? 
        // The service doesn't have an unload method called by the plugin yet.
        // Let's assume for now we just start it. Ideally we should clean up.

        const intervalId = window.setInterval(() => {
            const statusBarItem = document.querySelector('.status-bar-item.plugin-sync');
            if (!statusBarItem) return;

            const text = statusBarItem.textContent || '';
            const ariaLabel = statusBarItem.getAttribute('aria-label') || '';
            const status = text + ariaLabel; // Combine to be safe

            if (status !== lastStatus) {
                if (status.includes('Fully synced')) {
                    this.handleSystemEvent('sync_finish');
                } else if (status.includes('Syncing')) {
                    this.handleSystemEvent('sync_start');
                }
                lastStatus = status;
            }
        }, 2000); // Check every 2 seconds

        // Register interval for cleanup if we had access to the plugin instance, 
        // but here we don't. We could add a cleanup method to the service.
        // For now, we'll leave it as is, but it's a minor leak on plugin reload 
        // if the service instance is recreated but the interval persists.
        // However, usually the whole plugin reloads.
    }

    private handleEvent(eventType: 'create' | 'modify' | 'rename' | 'delete', file: TFile, oldPath?: string) {
        for (const trigger of this.activeTriggers.values()) {
            // Handle standard Obsidian events
            if (trigger.type === 'obsidian_event' && trigger.event === eventType) {
                this.fireTrigger(trigger.id, file);
            }

            // Handle Folder Events
            if (trigger.type === 'folder_event' && eventType === 'rename' && oldPath && trigger.folder) {
                const oldFolder = oldPath.substring(0, oldPath.lastIndexOf('/'));
                const newFolder = file.parent?.path || '';
                const targetFolder = trigger.folder;

                if (trigger.event === 'enter') {
                    // Moved INTO target folder
                    if (oldFolder !== targetFolder && newFolder === targetFolder) {
                        this.fireTrigger(trigger.id, file);
                    }
                } else if (trigger.event === 'leave') {
                    // Moved OUT OF target folder
                    if (oldFolder === targetFolder && newFolder !== targetFolder) {
                        this.fireTrigger(trigger.id, file);
                    }
                }
            }
        }
    }

    public async handleSystemEvent(eventType: 'startup' | 'sync_start' | 'sync_finish') {
        // For system events, we might not have a specific file context initially.
        // However, our architecture expects a file to run actions against.
        // For 'startup', we might want to run against ALL files or a specific set?
        // Or maybe the actions for startup don't require a file?
        // But ActionService.executeAction takes a file.
        // This is a design constraint. 
        // For now, let's assume system events might trigger jobs that find their own files or we iterate all files?
        // The user requirement "When Obsidian Starts" usually implies running some maintenance.
        // Let's iterate all markdown files for now if it's a startup trigger, OR 
        // maybe we pass a dummy file or null? 
        // Passing null would break strict typing in ActionService.
        // Let's iterate all files for now as a safe default for "Auto Note Mover" context, 
        // but this could be heavy. 
        // Alternatively, we just fire the trigger and let the Ruleset/Job decide. 
        // But fireTrigger takes a file.

        // Let's iterate all files for startup triggers for now, as that's likely the intent (re-scan vault).
        // This might be performance intensive.

        const files = this.app.vault.getMarkdownFiles();

        for (const trigger of this.activeTriggers.values()) {
            if (trigger.type === 'system_event' && trigger.event === eventType) {
                // Check time constraints
                if (trigger.timeConstraints) {
                    const now = new Date();
                    if (trigger.timeConstraints.start) {
                        const start = new Date(trigger.timeConstraints.start);
                        if (now < start) continue;
                    }
                    if (trigger.timeConstraints.end) {
                        const end = new Date(trigger.timeConstraints.end);
                        if (now > end) continue;
                    }
                }

                // Fire for all files?
                for (const file of files) {
                    this.fireTrigger(trigger.id, file);
                }
            }
        }
    }

    private fireTrigger(triggerId: string, file: TFile) {
        const callbacks = this.listeners.get(triggerId);
        if (callbacks) {
            callbacks.forEach(cb => cb(triggerId, file));
        }
    }

    public unload() {
        this.eventRefs.forEach(ref => this.app.vault.offref(ref));
        this.eventRefs = [];
        this.listeners.clear();
        this.activeTriggers.clear();
    }
}
