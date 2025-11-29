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
}

/**
 * An event that triggers a Ruleset.
 */
export interface Trigger {
    type: 'change_from' | 'change_to' | 'startup' | 'schedule' | 'manual';
    query?: string; // For change_from/change_to
    time?: string; // For schedule (HH:mm)
    days?: number[]; // For schedule (0-6, 0=Sun)
    commandName?: string; // For manual
}

/**
 * An atomic operation to perform on a file.
 */
export interface Action {
    id?: string;
    type: 'move' | 'rename' | 'tag' | 'update';
    config: {
        folder?: string;
        prefix?: string;
        suffix?: string;
        tag?: string;
        operation?: 'add' | 'remove';
        key?: string;
        value?: string;
    };
}

/**
 * A rule within a ruleset.
 * Defines a condition (Query) and a sequence of Actions.
 */
export interface Rule {
    id?: string;
    query: string; // Dataview query for condition
    useTriggerQuery?: boolean; // If true, inherits the trigger's query
    actions: Action[];
}

/**
 * Maps Triggers -> Rules.
 */
export interface Ruleset {
    id: string;
    name: string;
    enabled: boolean;
    trigger: Trigger;
    rules: Rule[];
}

/**
 * Configuration for the entire plugin.
 */
export interface CuratorConfig {
    rulesets: Ruleset[];
}
