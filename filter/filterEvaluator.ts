import { CachedMetadata, normalizePath, TFile } from 'obsidian';
import type { FilterCondition, FilterGroup, FilterNode, FilterRule, Comparator, RuleAction } from './filterTypes';

export interface FileContext {
	file: TFile;
	path: string;
	folder: string;
	name: string;
	extension: string;
	tags: string[];
	frontmatter: Record<string, unknown>;
	cache?: CachedMetadata | null;
	content?: string;
}

export interface EvaluatedRule {
	rule: FilterRule;
	actions: RuleAction[];
}

export function evaluateRules(rules: FilterRule[], context: FileContext): EvaluatedRule[] {
	const matches: EvaluatedRule[] = [];
	for (const rule of rules) {
		if (!rule.enabled) continue;
		if (evaluateFilterNode(rule.filter, context)) {
			matches.push({ rule, actions: rule.actions });
			if (rule.stopOnMatch) {
				break;
			}
		}
	}
	return matches;
}

export function evaluateFilterNode(node: FilterNode, context: FileContext): boolean {
	if (node.type === 'condition') {
		return evaluateCondition(node, context);
	}
	return evaluateGroup(node, context);
}

type Quantifier = 'all' | 'any';
type Truthiness = 'true' | 'false';

function resolveGroupConfig(group: FilterGroup): { quantifier: Quantifier; truthiness: Truthiness } {
	const quantifier: Quantifier = group.operator === 'any' ? 'any' : 'all';
	const truthiness: Truthiness =
		group.truthiness ?? (group.operator === 'none' ? 'false' : 'true');
	return { quantifier, truthiness };
}

function evaluateGroup(group: FilterGroup, context: FileContext): boolean {
	if (!group.children.length) {
		return true;
	}
	const { quantifier, truthiness } = resolveGroupConfig(group);
	if (truthiness === 'true') {
		return quantifier === 'all'
			? group.children.every((child) => evaluateFilterNode(child, context))
			: group.children.some((child) => evaluateFilterNode(child, context));
	}
	return quantifier === 'all'
		? group.children.every((child) => !evaluateFilterNode(child, context))
		: group.children.some((child) => !evaluateFilterNode(child, context));
}

function evaluateCondition(condition: FilterCondition, context: FileContext): boolean {
	const propertyValue = resolvePropertyValue(condition.property, context);
	let result = compareValues(propertyValue, condition.comparator, condition.value, condition.caseSensitive);
	if (condition.negate) {
		result = !result;
	}
	return result;
}

type ResolvedValue = string | string[] | undefined | null;

function resolvePropertyValue(property: string, context: FileContext): ResolvedValue {
	const key = property.trim();
	const lower = key.toLowerCase();
	switch (lower) {
		case 'file.name':
		case 'file.basename':
		case 'file.title':
			return context.name;
		case 'file.extension':
			return context.extension;
		case 'file.path':
			return normalizePath(context.path);
		case 'file.folder':
		case 'file.directory':
			return context.folder;
		case 'file.content':
			return context.content ?? null;
		case 'frontmatter':
			return JSON.stringify(context.frontmatter ?? {});
		case 'tags':
		case 'file.tags':
			return context.tags;
		default:
			break;
	}

	if (lower.startsWith('frontmatter.')) {
		const fmKey = key.slice('frontmatter.'.length);
		return getFrontmatterValue(context, fmKey);
	}

	if (lower.startsWith('file.')) {
		const attribute = key.slice('file.'.length);
		const fileRecord = context.file as unknown as Record<string, unknown>;
		if (attribute in fileRecord) {
			const value = fileRecord[attribute];
			if (typeof value === 'string') {
				return value;
			}
		}
	}

	return undefined;
}

function getFrontmatterValue(context: FileContext, property: string): ResolvedValue {
	const fm = context.frontmatter ?? {};
	const direct = fm[property];
	if (direct !== undefined) return normalizeFrontmatterValue(direct);
	const lowerKey = property.toLowerCase();
	for (const key of Object.keys(fm)) {
		if (key.toLowerCase() === lowerKey) {
			return normalizeFrontmatterValue(fm[key]);
		}
	}
	return undefined;
}

function normalizeFrontmatterValue(value: unknown): ResolvedValue {
	if (value === null || value === undefined) return undefined;
	if (Array.isArray(value)) {
		return value.map((entry) => String(entry));
	}
	if (typeof value === 'object') {
		return JSON.stringify(value);
	}
	return String(value);
}

function compareValues(
	propertyValue: ResolvedValue,
	comparator: Comparator,
	comparisonValue?: string | string[],
	caseSensitive = false
): boolean {
	if (comparator === 'exists') {
		return propertyValue !== undefined && propertyValue !== null && valueLength(propertyValue) > 0;
	}
	if (comparator === 'notExists') {
		return propertyValue === undefined || propertyValue === null || valueLength(propertyValue) === 0;
	}
	if (propertyValue === undefined || propertyValue === null) {
		return false;
	}

	const candidates = Array.isArray(propertyValue) ? propertyValue : [propertyValue];
	const targets = comparisonValue === undefined ? [''] : Array.isArray(comparisonValue) ? comparisonValue : [comparisonValue];

	return candidates.some((candidate) =>
		targets.some((target) => evaluateComparator(String(candidate), comparator, target, caseSensitive))
	);
}

function valueLength(value: ResolvedValue): number {
	if (value === undefined || value === null) return 0;
	if (Array.isArray(value)) return value.length;
	return String(value).length;
}

function evaluateComparator(
	candidate: string,
	comparator: Comparator,
	target: string,
	caseSensitive: boolean
): boolean {
	const source = caseSensitive ? candidate : candidate.toLowerCase();
	const against = caseSensitive ? target : target.toLowerCase();

	switch (comparator) {
		case 'equals':
			return source === against;
		case 'contains':
			return source.includes(against);
		case 'startsWith':
			return source.startsWith(against);
		case 'endsWith':
			return source.endsWith(against);
		case 'matchesRegex': {
			const regex = compileRegex(target, caseSensitive);
			return regex ? regex.test(candidate) : false;
		}
		default:
			return false;
	}
}

function compileRegex(pattern: string, caseSensitive: boolean): RegExp | null {
	if (!pattern) return null;
	let body = pattern;
	let flags = caseSensitive ? '' : 'i';
	const regexLiteral = pattern.match(/^\/(.+)\/([gimsuy]*)$/);
	if (regexLiteral) {
		body = regexLiteral[1];
		flags = regexLiteral[2] || flags;
		if (!caseSensitive && !flags.includes('i')) {
			flags += 'i';
		}
	}
	try {
		return new RegExp(body, flags);
	} catch (error) {
		console.error('[Auto Note Mover] Invalid regex pattern:', pattern, error);
		return null;
	}
}
