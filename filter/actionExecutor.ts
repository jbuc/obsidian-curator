import { App, normalizePath, Notice, TFile, TFolder } from 'obsidian';
import type { RuleAction, MoveAction, ApplyTemplateAction, RenameAction, SetPropertyAction } from './filterTypes';

export interface ActionContext {
	app: App;
	file: TFile;
}

type UnknownTemplaterApi = Record<string, unknown>;
const TEMPLATER_PLUGIN_ID = 'templater-obsidian';

export async function executeActions(actions: RuleAction[], context: ActionContext): Promise<void> {
	for (const action of actions) {
		switch (action.type) {
			case 'move':
				context.file = await executeMoveAction(action, context);
				break;
			case 'applyTemplate':
				await executeTemplateAction(action, context);
				break;
			case 'rename':
				context.file = await executeRenameAction(action, context);
				break;
			case 'setProperty':
				await executePropertyAction(action, context);
				break;
			default:
				console.warn('[Auto Note Mover] Unsupported action type', action);
		}
	}
}

async function executeMoveAction(action: MoveAction, context: ActionContext): Promise<TFile> {
	const targetFolder = normalizePath(action.targetFolder);
	await ensureFolderExists(context.app, targetFolder, action.createFolderIfMissing);
	const newPath = normalizePath(`${targetFolder}/${context.file.name}`);
	await context.app.fileManager.renameFile(context.file, newPath);
	new Notice(`[Auto Note Mover]\nMoved note to "${targetFolder}".`);
	const refreshed = context.app.vault.getAbstractFileByPath(newPath);
	if (refreshed instanceof TFile) {
		return refreshed;
	}
	return context.file;
}

async function executeTemplateAction(action: ApplyTemplateAction, context: ActionContext): Promise<void> {
	const templatePath = normalizePath(action.templatePath);
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

async function executeRenameAction(action: RenameAction, context: ActionContext): Promise<TFile> {
	let newBaseName = action.replace ?? context.file.basename;
	if (action.prefix) {
		newBaseName = `${action.prefix}${newBaseName}`;
	}
	if (action.suffix) {
		newBaseName = `${newBaseName}${action.suffix}`;
	}
	if (newBaseName === context.file.basename) {
		return context.file;
	}
	const folder = context.file.parent?.path ?? '';
	const newPath = normalizePath(`${folder}/${newBaseName}.${context.file.extension}`);
	await context.app.fileManager.renameFile(context.file, newPath);
	const refreshed = context.app.vault.getAbstractFileByPath(newPath);
	if (refreshed instanceof TFile) {
		return refreshed;
	}
	return context.file;
}

async function executePropertyAction(action: SetPropertyAction, context: ActionContext): Promise<void> {
	const key = action.property?.trim();
	if (!key) {
		console.warn('[Auto Note Mover] Property action missing property key.');
		return;
	}
	const value = action.value ?? '';
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
