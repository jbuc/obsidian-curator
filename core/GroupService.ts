import { App, TFile } from 'obsidian';
import { Group } from './types';

export class GroupService {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Checks if a file belongs to a group (matches the Dataview query).
     */
    public isInGroup(file: TFile, group: Group): boolean {
        if (!group.query || group.query.trim() === '') {
            return true; // Empty query matches everything? Or nothing? Let's say everything for "no filter".
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataviewAPI = (this.app as any).plugins?.plugins?.dataview?.api;

        if (!dataviewAPI) {
            console.warn('[Curator] Dataview plugin not found or API not available.');
            return false;
        }

        try {
            // We use dataview.pages(query) to get all matching pages.
            // Then we check if our file is in that list.
            // This might be inefficient for large vaults if run frequently.
            // Optimization: check if we can filter by path in the query itself?
            // But the query is user-defined.

            // Alternative: Use `dataviewAPI.page(file.path)` and evaluate the query against it?
            // Dataview doesn't expose a "matches(query, page)" function easily.

            // Let's stick to `pages(query)` and check for path existence.
            // `pages` returns a DataArray of page objects.
            const pages = dataviewAPI.pages(group.query);

            // Check if any page in the result has the same path as our file
            // pages is an iterable/array-like
            for (const page of pages) {
                if (page.file && page.file.path === file.path) {
                    return true;
                }
            }

            return false;

        } catch (error) {
            console.error(`[Curator] Error executing Dataview query for group ${group.name}:`, error);
            return false;
        }
    }

    // Legacy method stub to prevent build errors during refactor if called elsewhere
    public updateIdentifiers(identifiers: any[]) {
        // No-op
    }
}
