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
                if (file instanceof TFile) this.handleEvent('rename', file);
            })
        );
        this.eventRefs.push(
            this.app.vault.on('delete', (file) => {
                if (file instanceof TFile) this.handleEvent('delete', file);
            })
        );
    }

    private handleEvent(eventType: 'create' | 'modify' | 'rename' | 'delete', file: TFile) {
        console.log(`[DEBUG] Handling event ${eventType} for ${file.path}`);
        // Find all triggers that match this event type
        for (const trigger of this.activeTriggers.values()) {
            if (trigger.type === 'obsidian_event' && trigger.event === eventType) {
                console.log(`[DEBUG] Firing trigger ${trigger.id}`);
                this.fireTrigger(trigger.id, file);
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
