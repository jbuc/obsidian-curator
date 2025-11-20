import { App, normalizePath, Notice, TFile, TFolder } from 'obsidian';
import type { RuleAction, MoveAction, ApplyTemplateAction, RenameAction, SetPropertyAction } from './filterTypes';

import { HistoryService } from 'services/HistoryService';

export interface ActionContext {
	app: App;
	file: TFile;
	historyService?: HistoryService;
	conflictResolution?: 'overwrite' | 'skip' | 'rename';
	dryRun?: boolean;
	trackedProperties?: { key: string; label?: string }[];
}

type UnknownTemplaterApi = Record<string, unknown>;
const TEMPLATER_PLUGIN_ID = 'templater-obsidian';

export async function executeActions(actions: RuleAction[], context: ActionContext): Promise<string[]> {
	const logs: string[] = [];
	for (const action of actions) {
		switch (action.type) {
			case 'move':
				const moveLog = await executeMoveAction(action, context);
				if (moveLog) logs.push(moveLog);
				break;
			case 'applyTemplate':
				const templateLog = await executeTemplateAction(action, context);
				if (templateLog) logs.push(templateLog);
				break;
			case 'rename':
				const renameLog = await executeRenameAction(action, context);
				if (renameLog) logs.push(renameLog);
				break;
			case 'setProperty':
				const propLog = await executePropertyAction(action, context);
				if (propLog) logs.push(propLog);
				break;
			default:
				console.warn('[Auto Note Mover] Unsupported action type', action);
		}
	}
	return logs;
}

async function executeMoveAction(action: MoveAction, context: ActionContext): Promise<string | undefined> {
	const targetFolder = resolvePathVariables(action.targetFolder, context);
	const newPath = normalizePath(`${targetFolder}/${context.file.name}`);

	if (context.dryRun) {
		return `[Move] Would move "${context.file.path}" to "${newPath}"`;
	}

	await ensureFolderExists(context.app, targetFolder, action.createFolderIfMissing);

	if (context.file.path === newPath) return;

	const existingFile = context.app.vault.getAbstractFileByPath(newPath);
	if (existingFile instanceof TFile) {
		const resolution = context.conflictResolution ?? 'rename';

		if (resolution === 'skip') {
			new Notice(`[Auto Note Mover] Skipped move: "${newPath}" already exists.`);
			return;
		}

		if (resolution === 'overwrite') {
			// Obsidian's renameFile throws if target exists, so we must delete it first or use a different API.
			// However, deleting is risky. Better to trash it or use `adapter.write`.
			// But renameFile is safer for links.
			// Actually, Obsidian API doesn't have a simple "overwrite" for rename.
			// We can delete the target file first.
			await context.app.vault.trash(existingFile, true); // true = system trash, false = .trash
		}

		if (resolution === 'rename') {
			// Generate new name: File (1).md
			let counter = 1;
			let dedupedPath = newPath;
			while (context.app.vault.getAbstractFileByPath(dedupedPath)) {
				dedupedPath = normalizePath(`${targetFolder}/${context.file.basename} (${counter}).${context.file.extension}`);
				counter++;
			}
			await context.app.fileManager.renameFile(context.file, dedupedPath);
			new Notice(`[Auto Note Mover]\nMoved note to "${targetFolder}" (renamed).`);
			if (context.historyService) {
				await context.historyService.logAction(context.file, 'MOVE', `Moved to ${targetFolder} as ${dedupedPath}`);
			}
			const refreshed = context.app.vault.getAbstractFileByPath(dedupedPath);
			if (refreshed instanceof TFile) context.file = refreshed;
			return;
		}
	}

	await context.app.fileManager.renameFile(context.file, newPath);
	new Notice(`[Auto Note Mover]\nMoved note to "${targetFolder}".`);

	if (context.historyService) {
		await context.historyService.logAction(context.file, 'MOVE', `Moved to ${targetFolder}`);
	}

	const refreshed = context.app.vault.getAbstractFileByPath(newPath);
	if (refreshed instanceof TFile) {
		context.file = refreshed;
	}
}

async function executeTemplateAction(action: ApplyTemplateAction, context: ActionContext): Promise<string | undefined> {
	const templatePath = normalizePath(resolvePathVariables(action.templatePath, context));

	if (context.dryRun) {
		return `[Template] Would apply template "${templatePath}" (${action.mode}) to "${context.file.path}"`;
	}

	const templateFile = context.app.vault.getAbstractFileByPath(templatePath);
	if (!(templateFile instanceof TFile)) {
		console.warn('[Auto Note Mover] Template not found:', templatePath);
		return;
	}
	const templater = getTemplaterApi(context.app);
	if (templater) {
		const writeTemplate = (templater as UnknownTemplaterApi)['write_template_to_file'];
		if (isFunction(writeTemplate)) {
			try {
				await writeTemplate.call(templater, templateFile, context.file);
				return;
			} catch (error) {
				console.warn(
					'[Auto Note Mover] Templater write_template_to_file failed; falling back to raw content.',
					error
				);
			}
		}
	}
	const templateContent = await context.app.vault.read(templateFile);
	const currentContent = await context.app.vault.read(context.file);
	let nextContent = currentContent;
	switch (action.mode) {
		case 'prepend':
			nextContent = templateContent + '\n' + currentContent;
			break;
		case 'append':
			nextContent = currentContent + '\n' + templateContent;
			break;
		case 'replace':
			nextContent = templateContent;
			break;
		default:
			break;
	}
	if (nextContent !== currentContent) {
		await context.app.vault.modify(context.file, nextContent);
	}
}

async function executeRenameAction(action: RenameAction, context: ActionContext): Promise<string | undefined> {
	let newBaseName = action.replace ? resolvePathVariables(action.replace, context) : context.file.basename;
	if (action.prefix) {
		newBaseName = `${resolvePathVariables(action.prefix, context)}${newBaseName}`;
	}
	if (action.suffix) {
		newBaseName = `${newBaseName}${resolvePathVariables(action.suffix, context)}`;
	}

	if (context.dryRun) {
		return `[Rename] Would rename "${context.file.path}" to "${newBaseName}.${context.file.extension}"`;
	}

	if (newBaseName === context.file.basename) {
		return;
	}
	const folder = context.file.parent?.path ?? '';
	const newPath = normalizePath(`${folder}/${newBaseName}.${context.file.extension}`);
	await context.app.fileManager.renameFile(context.file, newPath);
	const refreshed = context.app.vault.getAbstractFileByPath(newPath);
	if (refreshed instanceof TFile) {
		context.file = refreshed;
	}
}

export function resolvePathVariables(path: string, context: ActionContext): string {
	if (!path) return '';

	const cache = context.app.metadataCache.getFileCache(context.file);
	const frontmatter = cache?.frontmatter;

	return path.replace(/\{\{(.*?)\}\}/g, (match, variable) => {
		const key = variable.trim();

		// Date variables: {{date:YYYY-MM-DD}}
		if (key.startsWith('date:')) {
			const format = key.substring(5);
			// Simple date formatting (could be improved with moment.js if available in Obsidian API globally, usually window.moment)
			// Obsidian exposes moment globally.
			if (typeof window !== 'undefined' && (window as any).moment) {
				return (window as any).moment().format(format);
			}
			return new Date().toISOString().split('T')[0]; // Fallback
		}

		// Title
		if (key === 'title' || key === 'name') {
			return context.file.basename;
		}

		// Parent folder name (just the immediate parent, not full path)
		if (key === 'parent' || key === 'file.parent') {
			return context.file.parent?.name ?? '';
		}

		// Frontmatter: {{frontmatter.key}} or {{prop.key}}
		if (key.startsWith('frontmatter.') || key.startsWith('prop.')) {
			const propName = key.split('.')[1];
			if (frontmatter && frontmatter[propName] !== undefined) {
				return String(frontmatter[propName]);
			}
			return '';
		}

		// Reusable Properties: {{label}}
		if (context.trackedProperties) {
			const tracked = context.trackedProperties.find(p => p.label === key);
			if (tracked && tracked.key) {
				const propKey = tracked.key.toLowerCase();

				// Check if it's a built-in file property
				if (propKey === 'file.folder' || propKey === 'file.directory') {
					return context.file.parent?.path ?? '';
				}
				if (propKey === 'file.name' || propKey === 'file.basename' || propKey === 'file.title') {
					return context.file.basename;
				}
				if (propKey === 'file.extension') {
					return context.file.extension;
				}
				if (propKey === 'file.path') {
					return context.file.path;
				}

				// Otherwise, look in frontmatter
				if (frontmatter && frontmatter[tracked.key] !== undefined) {
					return String(frontmatter[tracked.key]);
				}
			}
		}

		return match; // Return original if not found
	});
}

async function executePropertyAction(action: SetPropertyAction, context: ActionContext): Promise<string | undefined> {
	const key = action.property?.trim();
	if (!key) {
		console.warn('[Auto Note Mover] Property action missing property key.');
		return;
	}
	const rawValue = action.value ?? '';
	const value = resolvePathVariables(rawValue, context);

	if (context.dryRun) {
		return `[Property] Would set property "${key}" to "${value}" for "${context.file.path}"`;
	}

	const updateFrontmatter = getFrontmatterUpdater(context.app);
	if (key === 'tags' || key === 'file.tags') {
		await setTagsValue(updateFrontmatter, value, context);
		return;
	}
	if (key.startsWith('prop.')) {
		const field = key.replace(/^prop\./i, '').trim();
		if (!field) {
			console.warn('[Auto Note Mover] Invalid frontmatter property key for action.');
			return;
		}
		if (!updateFrontmatter) {
			console.warn('[Auto Note Mover] Frontmatter API unavailable; property action skipped.');
			return;
		}
		await updateFrontmatter(context.file, (frontmatter: Record<string, unknown>) => {
			if (value === '') {
				delete frontmatter[field];
			} else {
				frontmatter[field] = value;
			}
		});
		return;
	}
	console.warn('[Auto Note Mover] Unsupported property action key:', key);
}

async function setTagsValue(
	updateFrontmatter: FrontmatterUpdater | null,
	value: string,
	context: ActionContext
): Promise<void> {
	if (!updateFrontmatter) {
		console.warn('[Auto Note Mover] Frontmatter API unavailable; property action skipped.');
		return;
	}
	const tags = value
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean);
	await updateFrontmatter(context.file, (frontmatter: Record<string, unknown>) => {
		if (!tags.length) {
			delete frontmatter.tags;
		} else if (tags.length === 1) {
			frontmatter.tags = tags[0];
		} else {
			frontmatter.tags = tags;
		}
	});
}

type FrontmatterUpdater = (file: TFile, handler: (frontmatter: Record<string, unknown>) => void) => Promise<void>;

function getFrontmatterUpdater(app: App): FrontmatterUpdater | null {
	const vaultWithModify = app.vault as App['vault'] & {
		modifyFrontMatter?: FrontmatterUpdater;
	};
	if (typeof vaultWithModify.modifyFrontMatter === 'function') {
		return vaultWithModify.modifyFrontMatter.bind(app.vault);
	}
	const fm = (app.fileManager as unknown as {
		processFrontMatter?: FrontmatterUpdater;
	}).processFrontMatter;
	if (typeof fm === 'function') {
		return fm.bind(app.fileManager);
	}
	return null;
}

async function ensureFolderExists(app: App, folderPath: string, allowCreate = false): Promise<void> {
	const normalized = normalizePath(folderPath);
	const existing = app.vault.getAbstractFileByPath(normalized);
	if (existing instanceof TFolder) {
		return;
	}
	if (!allowCreate) {
		throw new Error(`Destination folder "${folderPath}" does not exist.`);
	}
	await app.vault.createFolder(normalized);
}

function getTemplaterApi(app: App): UnknownTemplaterApi | null {
	const pluginManager = (app as App & { plugins?: unknown }).plugins as
		| {
			enabledPlugins?: Set<string>;
			getPlugin?: (id: string) => unknown;
			plugins?: Record<string, unknown>;
		}
		| undefined;
	if (!pluginManager) return null;
	if (pluginManager.enabledPlugins && !pluginManager.enabledPlugins.has(TEMPLATER_PLUGIN_ID)) {
		return null;
	}
	const plugin =
		typeof pluginManager.getPlugin === 'function'
			? pluginManager.getPlugin(TEMPLATER_PLUGIN_ID)
			: pluginManager.plugins?.[TEMPLATER_PLUGIN_ID];
	const templater = (plugin as { templater?: unknown })?.templater;
	if (templater && typeof templater === 'object') {
		return templater as UnknownTemplaterApi;
	}
	return null;
}

function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
	return typeof value === 'function';
}

async function tryCallTemplater(
	api: UnknownTemplaterApi,
	key: string,
	...args: unknown[]
): Promise<string | null> {
	const candidate = api[key];
	if (!isFunction(candidate)) {
		return null;
	}
	const result = await candidate.apply(api, args);
	return typeof result === 'string' ? result : null;
}
