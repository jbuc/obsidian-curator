import { App, Modal, Setting, TFile, ButtonComponent } from 'obsidian';
import { SimulationService, SimulationResult } from 'services/SimulationService';

export class SimulationModal extends Modal {
    private resultContainer: HTMLElement;

    constructor(app: App, private simulationService: SimulationService) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('anm-simulation-modal');

        contentEl.createEl('h2', { text: 'Auto Note Mover Simulation' });

        const controls = contentEl.createDiv('anm-simulation-controls');

        new Setting(controls)
            .setName('Run on current file')
            .setDesc('Simulate rules for the currently active file.')
            .addButton(btn => btn
                .setButtonText('Run')
                .setCta()
                .onClick(async () => {
                    const file = this.app.workspace.getActiveFile();
                    if (file) {
                        const result = await this.simulationService.runSimulation(file);
                        this.displayResults([result]);
                    } else {
                        this.displayMessage('No active file found.');
                    }
                }));

        new Setting(controls)
            .setName('Run on all files')
            .setDesc('Simulate rules for all markdown files in the vault. This may take a moment.')
            .addButton(btn => btn
                .setButtonText('Run All')
                .onClick(async () => {
                    btn.setButtonText('Running...').setDisabled(true);
                    const results = await this.simulationService.runSimulationForAllFiles();
                    this.displayResults(results);
                    btn.setButtonText('Run All').setDisabled(false);
                }));

        this.resultContainer = contentEl.createDiv('anm-simulation-results');
    }

    private displayMessage(msg: string) {
        this.resultContainer.empty();
        this.resultContainer.createEl('p', { text: msg });
    }

    private displayResults(results: SimulationResult[]) {
        this.resultContainer.empty();

        if (results.length === 0) {
            this.resultContainer.createEl('p', { text: 'No rules matched any files.' });
            return;
        }

        this.resultContainer.createEl('h3', { text: `Results (${results.length} files matched)` });

        const list = this.resultContainer.createDiv('anm-result-list');

        results.forEach(res => {
            const item = list.createDiv('anm-result-item');
            item.createEl('strong', { text: res.file.path });

            const ul = item.createEl('ul');
            res.matches.forEach(match => {
                const ruleLi = ul.createEl('li');
                ruleLi.createSpan({ text: `Rule: "${match.rule.name}"` });

                const actionUl = ruleLi.createEl('ul');
                match.actions.forEach(action => {
                    let actionText = action.type;
                    if (action.type === 'move') actionText += ` to "${action.targetFolder}"`;
                    else if (action.type === 'rename') actionText += ` (prefix: ${action.prefix}, suffix: ${action.suffix})`;
                    else if (action.type === 'setProperty') actionText += ` "${action.property}" = "${action.value}"`;

                    actionUl.createEl('li', { text: actionText });
                });
            });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
