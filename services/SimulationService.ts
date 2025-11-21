import { TFile, App } from 'obsidian';
import { CoreService } from './CoreService';
import { FilterRule, RuleAction } from 'filter/filterTypes';

export interface SimulationResult {
    file: TFile;
    matches: {
        rule: FilterRule;
        actions: RuleAction[];
    }[];
}

export class SimulationService {
    constructor(private app: App, private coreService: CoreService) { }

    async runSimulation(file: TFile): Promise<SimulationResult> {
        const cache = this.app.metadataCache.getFileCache(file);
        const matches = await this.coreService.getMatchingRules(file, cache);

        return {
            file,
            matches: matches.map(m => ({
                rule: m.rule,
                actions: m.actions
            }))
        };
    }

    async runSimulationForAllFiles(): Promise<SimulationResult[]> {
        const files = this.app.vault.getMarkdownFiles();
        const results: SimulationResult[] = [];

        for (const file of files) {
            const result = await this.runSimulation(file);
            if (result.matches.length > 0) {
                results.push(result);
            }
        }

        return results;
    }
}
