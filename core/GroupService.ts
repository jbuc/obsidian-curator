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
            return { valid: true };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataviewAPI = (this.app as any).plugins?.plugins?.dataview?.api;

        if (!dataviewAPI) {
            return { valid: false, error: 'Dataview plugin not found' };
        }

        const trimmed = query.trim();

        // 1. Full Query
        if (/^(LIST|TABLE|TASK|CALENDAR)/i.test(trimmed)) {
            try {
                await dataviewAPI.query(trimmed);
                return { valid: true };
            } catch (e) {
                return { valid: false, error: e.message || 'Query execution failed' };
            }
        }

        // 2. Partial Query (starts with keyword)
        if (/^(FROM|WHERE|FLATTEN|LIMIT|SORT)/i.test(trimmed)) {
            try {
                await dataviewAPI.query('LIST ' + trimmed);
                return { valid: true };
            } catch (e) {
                return { valid: false, error: e.message || 'Query execution failed' };
            }
        }

        // 3. Source or Implicit Source+Where
        // We need to be careful here. dataviewAPI.pages() accepts almost anything as a source.
        // But if the user intends a query, they usually start with FROM or WHERE.
        // If they just typed "folder", pages("folder") works.
        // If they typed "folder WHERE...", pages("folder WHERE...") FAILS.

        // Let's try to interpret it as a source first.
        try {
            // If it contains WHERE/FLATTEN/etc but didn't start with it, it might be "Source WHERE ..."
            // In that case, pages() will fail, so we should try wrapping it in LIST.
            if (/\s(WHERE|FLATTEN|LIMIT|SORT)\s/i.test(trimmed)) {
                await dataviewAPI.query('LIST FROM ' + trimmed);
                return { valid: true };
            }

            // Otherwise, try as a simple source
            dataviewAPI.pages(trimmed);
            return { valid: true };
        } catch (e) {
            // Fallback: Try wrapping as LIST FROM ... just in case
            try {
                await dataviewAPI.query('LIST FROM ' + trimmed);
                return { valid: true };
            } catch (e2) {
                return { valid: false, error: e.message };
            }
        }
    }

    /**
     * Checks if a file matches a Dataview query.
     */
    public async matchesQuery(file: TFile, query: string): Promise<boolean> {
        if (!query || query.trim() === '') {
            return true;
        }

        // Use getMatchingFiles for consistency as it handles all query types now
        const matchingFiles = await this.getMatchingFiles(query);
        return matchingFiles.some(f => f.path === file.path);
    }

    /**
     * Returns all files that match a query.
     */
    public async getMatchingFiles(query: string): Promise<TFile[]> {
        if (!query || query.trim() === '') {
            return this.app.vault.getMarkdownFiles();
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataviewAPI = (this.app as any).plugins?.plugins?.dataview?.api;

        if (!dataviewAPI) {
            return [];
        }

        const trimmed = query.trim();
        let finalQuery = trimmed;
        let isFullQuery = false;

        // Determine query type
        if (/^(LIST|TABLE|TASK|CALENDAR)/i.test(trimmed)) {
            isFullQuery = true;
        } else if (/^(FROM|WHERE|FLATTEN|LIMIT|SORT)/i.test(trimmed)) {
            finalQuery = 'LIST ' + trimmed;
            isFullQuery = true;
        } else {
            // Try as simple source first
            try {
                const pages = dataviewAPI.pages(trimmed);
                const files: TFile[] = [];
                for (const page of pages) {
                    const file = this.app.vault.getAbstractFileByPath(page.file.path);
                    if (file instanceof TFile) files.push(file);
                }
                return files;
            } catch (e) {
                // If failed, try as LIST FROM ...
                finalQuery = 'LIST FROM ' + trimmed;
                isFullQuery = true;
            }
        }

        if (isFullQuery) {
            try {
                const result = await dataviewAPI.query(finalQuery);
                if (!result || !result.type) {
                    console.error(`[Curator] Query returned invalid result:`, result);
                    return [];
                }

                const files: TFile[] = [];
                const rows = result.values; // result.values is the array in QueryResult

                if (!rows) return [];

                for (const row of rows) {
                    let path = '';
                    if (result.type === 'list') {
                        path = row.file?.path || row.path;
                        if (!path && row.type === 'file') path = row.path;
                    } else if (result.type === 'table') {
                        const link = row[0];
                        path = link?.path;
                    }

                    if (path) {
                        const file = this.app.vault.getAbstractFileByPath(path);
                        if (file instanceof TFile) files.push(file);
                    }
                }
                return files;
            } catch (error) {
                console.error(`[Curator] Error executing Dataview query: ${finalQuery}`, error);
                return [];
            }
        }

        return [];
    }
}
