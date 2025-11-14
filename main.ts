import { MarkdownView, Plugin, TFile, getAllTags, Notice, TAbstractFile, normalizePath, CachedMetadata } from 'obsidian';
import { DEFAULT_SETTINGS, AutoNoteMoverSettings, AutoNoteMoverSettingTab } from 'settings/settings';
import { fileMove, getTriggerIndicator, isFmDisable } from 'utils/Utils';
import { evaluateRules } from 'filter/filterEvaluator';
import { executeActions } from 'filter/actionExecutor';
import type { FilterRule, FilterNode, RuleAction } from 'filter/filterTypes';

export default class AutoNoteMover extends Plugin {
	settings: AutoNoteMoverSettings;

async onload() {
		await this.loadSettings();
		const propertyRules = this.settings.property_rules;
		const excludedFolder = this.settings.excluded_folder;

		const fileCheck = async (file: TAbstractFile, oldPath?: string, caller?: string) => {
			if (this.settings.trigger_auto_manual !== 'Automatic' && caller !== 'cmd') {
				return;
			}
			if (!(file instanceof TFile)) return;

			// The rename event with no basename change will be terminated.
			if (oldPath && oldPath.split('/').pop() === file.basename + '.' + file.extension) {
				return;
			}

			// Excluded Folder check
			const excludedFolderLength = excludedFolder.length;
			for (let i = 0; i < excludedFolderLength; i++) {
				if (
					!this.settings.use_regex_to_check_for_excluded_folder &&
					excludedFolder[i].folder &&
					file.parent.path === normalizePath(excludedFolder[i].folder)
				) {
					return;
				} else if (this.settings.use_regex_to_check_for_excluded_folder && excludedFolder[i].folder) {
					const regex = new RegExp(excludedFolder[i].folder);
					if (regex.test(file.parent.path)) {
						return;
					}
				}
			}

			const fileCache = this.app.metadataCache.getFileCache(file);
			// Disable AutoNoteMover when "AutoNoteMover: disable" is present in the frontmatter.
			if (isFmDisable(fileCache)) {
				return;
			}

			const handledByFilterEngine = await this.tryFilterEngine(file, fileCache);
			if (handledByFilterEngine) {
				return;
			}

			const fileName = file.basename;
			const fileFullName = file.basename + '.' + file.extension;
			const settingsLength = propertyRules.length;
			const cacheTag = getAllTags(fileCache) ?? [];

			const getFrontmatterValue = (key: string) => {
				const frontmatter = fileCache?.frontmatter;
				if (!frontmatter) return undefined;
				const normalized = key.replace(/^frontmatter\./i, '');
				return frontmatter[normalized] ?? frontmatter[normalized.toLowerCase()];
			};

			const getPropertyValues = (property: string): string[] => {
				const normalizedProperty = property.trim();
				if (!normalizedProperty) return [];
				const lowerProperty = normalizedProperty.toLowerCase();

				if (lowerProperty === 'tags' || lowerProperty === 'tag') {
					const expandedTags = new Set<string>();
					cacheTag.forEach((tag) => {
						if (!tag) return;
						expandedTags.add(tag);
						if (tag.startsWith('#')) {
							expandedTags.add(tag.substring(1));
						}
					});
					return Array.from(expandedTags);
				}
				if (lowerProperty === 'title' || lowerProperty === 'basename' || lowerProperty === 'name') {
					return [fileName];
				}
				if (lowerProperty === 'path') {
					return [file.path];
				}
				if (lowerProperty === 'folder' || lowerProperty === 'directory') {
					return [file.parent?.path ?? ''];
				}

				const value = getFrontmatterValue(normalizedProperty);
				if (value === undefined || value === null) {
					return [];
				}
				if (Array.isArray(value)) {
					return value.map((entry) => String(entry));
				}
				if (['string', 'number', 'boolean'].includes(typeof value)) {
					return [String(value)];
				}
				return [];
			};

			// checker
			for (let i = 0; i < settingsLength; i++) {
				const rule = propertyRules[i];
				const folder = rule.folder?.trim();
				const property = rule.property?.trim();
				const value = rule.value?.trim();
				const titlePattern = rule.title;

				if (!folder) {
					continue;
				}

				let propertyMatched = false;
				if (property && value) {
					const propertyValues = getPropertyValues(property);
					propertyMatched = propertyValues.some((candidate) => candidate === value);
				}

				let titleMatched = false;
				if (titlePattern) {
					try {
						const regex = new RegExp(titlePattern);
						titleMatched = regex.test(fileName);
					} catch (error) {
						console.error('[Auto Note Mover] Invalid title regular expression:', titlePattern, error);
						continue;
					}
				}

				if (!propertyMatched && !titleMatched) {
					continue;
				}

				fileMove(this.app, folder, fileFullName, file);
				break;
			}
		};

		// Show trigger indicator on status bar
		let triggerIndicator: HTMLElement;
		const setIndicator = () => {
			if (!this.settings.statusBar_trigger_indicator) return;
			triggerIndicator.setText(getTriggerIndicator(this.settings.trigger_auto_manual));
		};
		if (this.settings.statusBar_trigger_indicator) {
			triggerIndicator = this.addStatusBarItem();
			setIndicator();
			// TODO: Is there a better way?
			this.registerDomEvent(window, 'change', setIndicator);
		}

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(this.app.vault.on('create', (file) => void fileCheck(file)));
			this.registerEvent(this.app.metadataCache.on('changed', (file) => void fileCheck(file)));
			this.registerEvent(this.app.vault.on('rename', (file, oldPath) => void fileCheck(file, oldPath)));
		});

		const moveNoteCommand = (view: MarkdownView) => {
			if (isFmDisable(this.app.metadataCache.getFileCache(view.file))) {
				new Notice('Auto Note Mover is disabled in the frontmatter.');
				return;
			}
			void fileCheck(view.file, undefined, 'cmd');
		};

		this.addCommand({
			id: 'Move-the-note',
			name: 'Move the note',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						moveNoteCommand(markdownView);
					}
					return true;
				}
			},
		});

		this.addCommand({
			id: 'Toggle-Auto-Manual',
			name: 'Toggle Auto-Manual',
			callback: () => {
				if (this.settings.trigger_auto_manual === 'Automatic') {
					this.settings.trigger_auto_manual = 'Manual';
					this.saveData(this.settings);
					new Notice('[Auto Note Mover]\nTrigger is Manual.');
				} else if (this.settings.trigger_auto_manual === 'Manual') {
					this.settings.trigger_auto_manual = 'Automatic';
					this.saveData(this.settings);
					new Notice('[Auto Note Mover]\nTrigger is Automatic.');
				}
				setIndicator();
			},
		});

		this.addSettingTab(new AutoNoteMoverSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		const loaded = (await this.loadData()) as
			| (Partial<AutoNoteMoverSettings> & {
					folder_tag_pattern?: Array<{ folder: string; tag?: string; pattern?: string }>;
					use_regex_to_check_for_tags?: boolean;
			  })
			| null;

		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);

		if (loaded?.folder_tag_pattern?.length) {
			const migratedRules = loaded.folder_tag_pattern
				.map((legacyRule) => {
					const folder = legacyRule.folder ?? '';
					if (legacyRule.pattern) {
						return { property: '', value: '', title: legacyRule.pattern, folder };
					}
					return { property: 'tags', value: legacyRule.tag ?? '', title: '', folder };
				})
				.filter((rule) => {
					if (!rule.folder) {
						return false;
					}
					const hasPropertyMatch = rule.property && rule.value;
					const hasTitleMatch = !!rule.title;
					return hasPropertyMatch || hasTitleMatch;
				});
			if (migratedRules.length) {
				this.settings.property_rules = migratedRules;
			}
		}

		this.settings.property_rules = (this.settings.property_rules ?? []).map((rule) => ({
			property: rule.property ?? '',
			value: rule.value ?? '',
			title: rule.title ?? '',
			folder: rule.folder ?? '',
		}));

		this.settings.filter_rules = this.settings.filter_rules ?? [];

		if (!this.settings.filter_rules_migrated && this.settings.property_rules.length) {
			const migratedFilterRules = convertLegacyPropertyRules(this.settings.property_rules);
			if (migratedFilterRules.length) {
				this.settings.filter_rules = migratedFilterRules;
				this.settings.filter_rules_migrated = true;
				await this.saveSettings();
			}
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async tryFilterEngine(file: TFile, fileCache: CachedMetadata | null): Promise<boolean> {
		if (!this.settings.filter_engine_enabled) {
			return false;
		}
		const rules = this.settings.filter_rules ?? [];
		if (!rules.length) {
			return false;
		}

		const requiresContent = rulesRequireProperty(rules, 'file.content');
		let content: string | undefined;
		if (requiresContent) {
			try {
				content = await this.app.vault.read(file);
			} catch (error) {
				console.error('[Auto Note Mover] Failed to read file content for filter evaluation', error);
			}
		}

		const tags = getAllTags(fileCache) ?? [];
		const frontmatter = (fileCache?.frontmatter as Record<string, unknown>) ?? {};
		const context = {
			file,
			path: file.path,
			folder: file.parent?.path ?? '',
			name: file.basename,
			extension: file.extension,
			tags,
			frontmatter,
			cache: fileCache,
			content,
		};

		const matches = evaluateRules(rules, context);
		if (!matches.length) {
			return false;
		}

		const actionContext = { app: this.app, file };
		for (const match of matches) {
			try {
				await executeActions(match.actions, actionContext);
			} catch (error) {
				console.error('[Auto Note Mover] Failed to execute actions for rule', match.rule?.name, error);
			}
		}
		return true;
	}
}

const rulesRequireProperty = (rules: FilterRule[], property: string): boolean => {
	const target = property.toLowerCase();
	return rules.some((rule) => filterNodeUsesProperty(rule.filter, target));
};

const filterNodeUsesProperty = (node: FilterNode, property: string): boolean => {
	if (node.type === 'condition') {
		return node.property?.toLowerCase() === property;
	}
	return node.children.some((child) => filterNodeUsesProperty(child, property));
};

const convertLegacyPropertyRules = (legacyRules: AutoNoteMoverSettings['property_rules']): FilterRule[] => {
	const migrated: FilterRule[] = [];

	legacyRules.forEach((legacyRule, index) => {
			const folder = legacyRule.folder?.trim();
			if (!folder) {
				return;
			}

			const conditions: FilterNode[] = [];
			const property = legacyRule.property?.trim();
			const value = legacyRule.value?.trim();
			if (property && value) {
				conditions.push({
					type: 'condition',
					property,
					comparator: 'equals',
					value,
					caseSensitive: false,
				});
			}

			const titlePattern = legacyRule.title?.trim();
			if (titlePattern) {
				conditions.push({
					type: 'condition',
					property: 'file.name',
					comparator: 'matchesRegex',
					value: titlePattern,
				});
			}

			if (!conditions.length) {
				return;
			}

			const filter: FilterNode =
				conditions.length === 1
					? conditions[0]
					: {
							type: 'group',
							operator: 'all',
							children: conditions,
					  };

			const actions: RuleAction[] = [
				{
					type: 'move',
					targetFolder: folder,
					createFolderIfMissing: false,
				},
			];

			migrated.push({
				id: `legacy-${index}`,
				name: legacyRule.property || legacyRule.title || `Legacy Rule ${index + 1}`,
				enabled: true,
				filter,
				actions,
				stopOnMatch: true,
			});
		});

	return migrated;
};
