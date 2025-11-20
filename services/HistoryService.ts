import { App, TFile, normalizePath } from 'obsidian';

export class HistoryService {
    private logPath: string;

    constructor(private app: App) {
        this.logPath = normalizePath('.obsidian/plugins/my-auto-note-mover/activity.log');
    }

    async logAction(file: TFile, action: string, details: string) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${action}: ${file.path} -> ${details}\n`;

        try {
            let currentContent = '';
            if (await this.app.vault.adapter.exists(this.logPath)) {
                currentContent = await this.app.vault.adapter.read(this.logPath);
            }
            await this.app.vault.adapter.write(this.logPath, currentContent + logEntry);
        } catch (error) {
            console.error('[Auto Note Mover] Failed to write to history log', error);
        }
    }

    async getHistory(): Promise<string> {
        if (await this.app.vault.adapter.exists(this.logPath)) {
            return await this.app.vault.adapter.read(this.logPath);
        }
        return '';
    }

    async clearHistory() {
        if (await this.app.vault.adapter.exists(this.logPath)) {
            await this.app.vault.adapter.write(this.logPath, '');
        }
    }
}
