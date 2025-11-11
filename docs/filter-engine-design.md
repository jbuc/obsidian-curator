# Filter Engine Redesign

## Goal
Build a flexible filtering system that can evaluate nested criteria (AND/OR/NOT) against any file metadata and then execute one or more actions (move, tag, etc.). The current single-line rule list is too limiting for multi-condition workflows.

## Guiding Principles
1. **Composable conditions** – users should be able to nest groups (e.g., `project OR (area AND status:active)`).
2. **Multiple actions** – allow moving, renaming, tagging, etc., so the engine can expand beyond folder moves.
3. **Declarative state** – rules should serialize cleanly (JSON) for syncing and sharing.
4. **Backwards compatibility** – provide a migration path from legacy property/title rules.

## Proposed Model

The canonical interfaces now live in `filter/filterTypes.ts`. Highlights:

### Filter Tree
```ts
export interface FilterGroup {
	type: 'group';
	operator: 'all' | 'any' | 'none'; // all=AND, any=OR, none=NOT
	children: Array<FilterGroup | FilterCondition>;
}

export interface FilterCondition {
	type: 'condition';
	property: string;        // e.g., 'file.name', 'frontmatter.status'
	comparator: Comparator;  // 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'matchesRegex' | 'exists' | 'notExists'
	value?: string | string[];
	caseSensitive?: boolean;
	negate?: boolean;       // inversion toggle per condition
}
```

### Actions
```ts
interface ActionMove {
	type: 'move';
	targetFolder: string;
}

interface ActionTag {
	type: 'addTag' | 'removeTag';
	tag: string;
}

type RuleAction = ActionMove | ActionTag | /* future */ ActionRunCommand;
```

### Rule
```ts
export interface FilterRule {
	id: string;
	name: string;
	enabled: boolean;
	filter: FilterNode;
	actions: RuleAction[];
	stopOnMatch?: boolean;
}
```

## UI Sketch
1. **Rule List** – vertical list showing rule name, enabled toggle, action summary.
2. **Rule Editor Pane** – split layout:
   - **Filter Builder** – nested cards for groups and conditions, drag-and-drop ordering, operator dropdowns.
   - **Action Builder** – list of actions with type selector (Move, Add Tag, Remove Tag). Each action has its own inputs.
3. **Execution Settings** – rule ordering, stop-on-match toggle, scope (auto/manual).

## Migration Plan
1. Convert each legacy property rule into a new FilterRule:
   - If `title` regex exists, create a `matchesRegex` condition on `title`.
   - If property/value exists, create an `equals` condition.
   - Wrap conditions in an implicit AND group when both exist.
   - Add a single `move` action targeting the legacy folder.
2. Preserve ordering and stop-on-first-match semantics by default.

## Open Questions
1. Should actions be able to run sequentially even when a move occurs?
2. Do we need condition templates (e.g., quick “Has tag” buttons) for usability?
3. How to surface validation errors for deeply nested groups?
4. Should filters support time-based comparators (created date, modified date)?

## Next Steps
1. Define the comparator/action enums and their serialization format.
2. Prototype the data model + evaluation engine in isolation with tests.
3. Design the new settings UI (wireframes or mock components).
4. Implement migration + feature flag so users can opt into the new engine.
