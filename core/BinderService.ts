import { App } from 'obsidian';
import { BinderEntry, BinderState } from './types';

export class BinderService {
    private state: BinderState;
    private app: App;

    constructor(app: App) {
        this.app = app;
        this.state = {
            entries: []
        };
    }

    /**
     * Adds a log entry to the binder.
     */
    public log(type: 'info' | 'warning' | 'error' | 'success', message: string, relatedFile?: string, details?: any) {
        const entry: BinderEntry = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type,
            message,
            relatedFile,
            details
        };

        this.state.entries.unshift(entry); // Add to beginning

        // Keep log size manageable (e.g., last 1000 entries)
        if (this.state.entries.length > 1000) {
            this.state.entries = this.state.entries.slice(0, 1000);
        }

        // In the future, we might want to persist this to a file or data.json
        // For now, it's in-memory.
        // console.log(`[Curator] [${type.toUpperCase()}] ${message}`, details || '');
    }

    public getEntries(): BinderEntry[] {
        return this.state.entries;
    }

    public clear() {
        this.state.entries = [];
    }
}
