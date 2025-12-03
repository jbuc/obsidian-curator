import { App, TFile, EventRef, WorkspaceLeaf } from 'obsidian';
import { Trigger } from './types';

type TriggerCallback = (file: TFile) => void;

export class TriggerService {
    private app: App;
    private listeners: Map<Trigger, TriggerCallback> = new Map();
    private eventRefs: EventRef[] = [];

    // State tracking for change_from/change_to
    private lastActiveFile: TFile | null = null;
    private dirtyFiles: Set<string> = new Set(); // Files modified since last check

    constructor(app: App) {
        this.app = app;
    }

    public registerTrigger(trigger: Trigger, callback: TriggerCallback) {
        this.listeners.set(trigger, callback);
    }

    public clearTriggers() {
        this.listeners.clear();
    }

    public initializeListeners() {
        // Clear existing refs
        this.eventRefs.forEach(ref => this.app.vault.offref(ref));
        this.eventRefs = [];

        // 1. File Modification Tracking
        this.eventRefs.push(
            this.app.vault.on('modify', (file) => {
                if (file instanceof TFile) {
                    this.dirtyFiles.add(file.path);
                }
            })
        );

        // 2. Active Leaf Change (Trigger point for change_from/change_to)
        this.eventRefs.push(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                this.handleActiveLeafChange(leaf);
            })
        );

        // 3. Startup Triggers
        // We can't easily detect "startup" here because this code runs ON startup.
        // So we just fire them now? Or wait a bit?
        // Let's wait 3 seconds to let Obsidian settle.
        setTimeout(() => {
            this.handleStartup();
        }, 3000);

        // 4. Schedule Triggers
        // Check every minute
        setInterval(() => {
            this.handleSchedule();
        }, 60 * 1000);
    }

    private handleActiveLeafChange(leaf: WorkspaceLeaf | null) {
        const currentFile = (leaf?.view as any)?.file instanceof TFile ? (leaf.view as any).file : null;

        // If we switched AWAY from a file, check if it was modified
        if (this.lastActiveFile && this.lastActiveFile !== currentFile) {
            if (this.dirtyFiles.has(this.lastActiveFile.path)) {
                // File was modified and we just left it. Fire triggers!
                this.fireTriggers('change_from', this.lastActiveFile);
                this.fireTriggers('change_to', this.lastActiveFile);

                this.dirtyFiles.delete(this.lastActiveFile.path);
            }
        }

        this.lastActiveFile = currentFile;
    }

    private handleStartup() {
        // Run against ALL files? Or just fire?
        // Usually startup rules are for maintenance.
        // Let's iterate all markdown files.
        const files = this.app.vault.getMarkdownFiles();
        files.forEach(file => {
            if (!file.path.endsWith('.ruleset.md')) {
                this.fireTriggers('startup', file);
            }
        });
    }

    private handleSchedule() {
        const now = new Date();
        const currentDay = now.getDay(); // 0 = Sun
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

        // Find matching triggers
        for (const [trigger, callback] of this.listeners) {
            if (trigger.type === 'schedule') {
                // Check Day
                if (trigger.days && !trigger.days.includes(currentDay)) continue;

                // Check Time
                if (trigger.time === timeString) {
                    // Fire for all files? Or just one?
                    // Schedule usually implies batch processing.
                    const files = this.app.vault.getMarkdownFiles();
                    files.forEach(file => {
                        if (!file.path.endsWith('.ruleset.md')) {
                            callback(file);
                        }
                    });
                }
            }
        }
    }

    private fireTriggers(type: 'change_from' | 'change_to' | 'startup', file: TFile) {
        if (file.path.endsWith('.ruleset.md')) return;

        for (const [trigger, callback] of this.listeners) {
            if (trigger.type === type) {
                callback(file);
            }
        }
    }

    public unload() {
        this.eventRefs.forEach(ref => this.app.vault.offref(ref));
        this.eventRefs = [];
        this.listeners.clear();
    }
}
