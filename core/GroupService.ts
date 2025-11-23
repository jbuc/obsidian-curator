import { App, TFile } from 'obsidian';
import { Group, Identifier } from './types';
import { IdentifierService } from './IdentifierService';

export class GroupService {
    private app: App;
    private identifierService: IdentifierService;
    private identifiers: Map<string, Identifier>;

    constructor(app: App, identifierService: IdentifierService) {
        this.app = app;
        this.identifierService = identifierService;
        this.identifiers = new Map();
    }

    /**
     * Updates the local cache of identifiers. 
     * In a real app, this might fetch from a central store or configuration.
     */
    public updateIdentifiers(identifiers: Identifier[]) {
        this.identifiers.clear();
        identifiers.forEach(id => this.identifiers.set(id.id, id));
    }

    /**
     * Checks if a file belongs to a group.
     */
    public isInGroup(file: TFile, group: Group): boolean {
        if (!group.identifiers || group.identifiers.length === 0) {
            return false; // Empty group matches nothing? Or everything? Let's say nothing for safety.
        }

        const results = group.identifiers.map(idStr => {
            const identifier = this.identifiers.get(idStr);
            if (!identifier) {
                console.warn(`[Curator] Group ${group.name} references missing identifier ${idStr}`);
                return false;
            }
            return this.identifierService.matches(file, identifier);
        });

        if (group.operator === 'AND') {
            return results.every(r => r === true);
        } else if (group.operator === 'OR') {
            return results.some(r => r === true);
        } else {
            return false;
        }
    }
}
