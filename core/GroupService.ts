import { App, TFile } from 'obsidian';

export class GroupService {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Validates a Dataview query.
     */
    public async validateQuery(query: string): Promise<{ valid: boolean; error?: string }> {
        if (!query || query.trim() === '') {
            return { valid: true }; // Empty query is valid (matches all)
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataviewAPI = (this.app as any).plugins?.plugins?.dataview?.api;

        if (!dataviewAPI) {
            return { valid: false, error: 'Dataview plugin not found' };
        }

        try {
            // Try to parse the query using Dataview's internal API if possible, 
            // or just run a lightweight query.
            // Since we can't easily access the parser, we'll try to execute it.
            // We use `pages` which is fast.
            dataviewAPI.pages(query);
            return { valid: true };
        } catch (e) {
            return { valid: false, error: e.message };
        }
    }

    /**
     * Checks if a file matches a Dataview query.
     */
    public matchesQuery(file: TFile, query: string): boolean {
        if (!query || query.trim() === '') {
            return true;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataviewAPI = (this.app as any).plugins?.plugins?.dataview?.api;

        if (!dataviewAPI) {
            console.warn('[Curator] Dataview plugin not found or API not available.');
            return false;
        }

        try {
            // Optimization: In a real implementation, we might want to cache query results
            // if we are checking many files against the same query.
            const pages = dataviewAPI.pages(query);

            for (const page of pages) {
                if (page.file && page.file.path === file.path) {
                    return true;
                }
            }

            return false;

        } catch (error) {
            console.error(`[Curator] Error executing Dataview query: ${query}`, error);
            return false;
        }
    }

    /**
     * Returns all files that match a query.
     */
    public getMatchingFiles(query: string): TFile[] {
        if (!query || query.trim() === '') {
            return this.app.vault.getFiles();
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataviewAPI = (this.app as any).plugins?.plugins?.dataview?.api;

        if (!dataviewAPI) {
            return [];
        }

        try {
            const pages = dataviewAPI.pages(query);
            const files: TFile[] = [];

            for (const page of pages) {
                const file = this.app.vault.getAbstractFileByPath(page.file.path);
                if (file instanceof TFile) {
                    files.push(file);
                }
            }
            return files;
        } catch (error) {
            console.error(`[Curator] Error executing Dataview query: ${query}`, error);
            return [];
        }
    }
}
