import { TFile } from 'obsidian';

/**
 * Represents a log entry in the Binder.
 */
export interface BinderEntry {
    id: string;
    timestamp: number;
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    relatedFile?: string; // Path to the file
    details?: any;
}

/**
 * The Binder maintains the state and history of Curator's actions.
 */
export interface BinderState {
    entries: BinderEntry[];
    // We can add more state here as needed, e.g., last run times for jobs
}

/**
 * A named Dataview query that defines a set of files.
 * Replaces the old Group/Identifier system.
 */
export interface Group {
    id: string;
    name: string;
    query: string; // Dataview source query (e.g. 'FROM "folder" AND #tag')
}

/**
 * An event that triggers a Ruleset.
 */
export interface Trigger {
    id: string;
    name: string;
    type: 'obsidian_event' | 'system_event' | 'folder_event' | 'schedule' | 'manual';
    event?: 'create' | 'modify' | 'rename' | 'delete' | 'startup' | 'sync_start' | 'sync_finish' | 'enter' | 'leave';
    folder?: string; // For folder_event
    timeConstraints?: {
        start?: string; // ISO timestamp or time string
        end?: string;   // ISO timestamp or time string
    };
    schedule?: string; // cron expression?
}

/**
 * An atomic operation to perform on a file.
 */
export interface Action {
    id: string;
    name: string;
    type: 'move' | 'rename' | 'tag' | 'frontmatter' | 'script';
    config: any;
}

/**
 * A rule within a ruleset.
 * Defines a condition (Group) and a sequence of Actions.
 */
export interface Rule {
    groupId?: string; // If null/undefined, runs always (unless stopped by previous rule?)
    // For "else if" logic, we might need a way to say "only if previous didn't match"?
    // For now, let's assume sequential execution.
    actionIds: string[];
}

/**
 * Maps Triggers -> Rules.
 */
export interface Ruleset {
    id: string;
    name: string;
    enabled: boolean;
    triggerId: string;
    rules: Rule[];
}

/**
 * Configuration for the entire plugin.
 */
export interface CuratorConfig {
    groups: Group[];
    triggers: Trigger[];
    actions: Action[];
    // jobs: Job[]; // Removed
    rulesets: Ruleset[];
}
