import { AutoNoteMoverSettings, PropertyRule } from 'settings/settings';
import { FilterRule, FilterNode, RuleAction } from 'filter/filterTypes';
import { Notice } from 'obsidian';

export class LegacyMigrationService {
    constructor(private plugin: any) {}

    async migrate(settings: AutoNoteMoverSettings): Promise<void> {
        if (settings.filter_rules_migrated) {
            return;
        }

        if (settings.property_rules && settings.property_rules.length > 0) {
            const migratedFilterRules = this.convertLegacyPropertyRules(settings.property_rules);
            if (migratedFilterRules.length) {
                settings.filter_rules = migratedFilterRules;
                settings.filter_rules_migrated = true;
                await this.plugin.saveSettings();
            }
        }
    }

    async clearLegacyConfiguration(): Promise<void> {
        this.plugin.settings.property_rules = [];
        delete (this.plugin.settings as unknown as Record<string, unknown>).folder_tag_pattern;
        this.plugin.settings.filter_rules_migrated = true;
        this.plugin.settings.rule_groups = [];
        await this.plugin.saveSettings();
        this.plugin.refreshMetadataFingerprints();
        new Notice('[Auto Note Mover] Legacy Auto Note Mover configuration cleared.');
    }

    private convertLegacyPropertyRules(legacyRules: PropertyRule[]): FilterRule[] {
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
    }
}
