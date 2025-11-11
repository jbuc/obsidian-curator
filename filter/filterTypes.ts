export type Comparator =
	| 'equals'
	| 'contains'
	| 'startsWith'
	| 'endsWith'
	| 'matchesRegex'
	| 'exists'
	| 'notExists';

export interface FilterCondition {
	type: 'condition';
	property: string; // e.g., file.name, file.folder, frontmatter.status
	comparator: Comparator;
	value?: string | string[];
	caseSensitive?: boolean;
	negate?: boolean;
}

export interface FilterGroup {
	type: 'group';
	operator: 'all' | 'any' | 'none';
	children: Array<FilterGroup | FilterCondition>;
}

export type FilterNode = FilterGroup | FilterCondition;

export interface MoveAction {
	type: 'move';
	targetFolder: string;
	createFolderIfMissing?: boolean;
}

export interface ApplyTemplateAction {
	type: 'applyTemplate';
	templatePath: string;
	mode: 'prepend' | 'append' | 'replace';
}

export interface RenameAction {
	type: 'rename';
	prefix?: string;
	suffix?: string;
	replace?: string;
}

export interface TagAction {
	type: 'addTag' | 'removeTag';
	tag: string;
}

export type RuleAction = MoveAction | ApplyTemplateAction | RenameAction | TagAction;

export interface FilterRule {
	id: string;
	name: string;
	enabled: boolean;
	filter: FilterNode;
	actions: RuleAction[];
	stopOnMatch?: boolean;
	createdAt?: number;
	updatedAt?: number;
}
