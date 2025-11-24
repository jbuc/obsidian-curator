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
 * A test that returns true/false for a given file.
 */
export interface Identifier {
    id: string;
    name: string;
    type: string; // e.g., 'tag', 'folder', 'frontmatter', 'script'
    config: any; // Configuration specific to the type
}

/**
 * A logical combination of Identifiers.
 */
export interface Group {
    id: string;
    name: string;
    identifiers: string[]; // IDs of Identifiers
    operator: 'AND' | 'OR'; // How to combine them. For more complex logic, we might need a tree structure.
    // For now, let's keep it simple: A group is a list of identifiers combined by an operator.
    // If we need (A AND B) OR C, that might be a higher level concept or nested groups.
    // Let's support nested groups by allowing identifiers to point to other groups? 
    // Or just keep it simple for now: A group matches if [operator] of its identifiers match.
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
    identifiers: Identifier[];
    groups: Group[];
    triggers: Trigger[];
    actions: Action[];
    // jobs: Job[]; // Removed
    rulesets: Ruleset[];
}
