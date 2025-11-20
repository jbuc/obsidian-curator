import { CoreService } from '../services/CoreService';
import { MetadataService } from '../services/MetadataService';
import { App, TFile } from 'obsidian';
import { DEFAULT_SETTINGS } from '../settings/settings';

describe('CoreService', () => {
    let app: App;
    let metadataService: MetadataService;
    let coreService: CoreService;

    beforeEach(() => {
        app = new App();
        metadataService = new MetadataService(app);
        coreService = new CoreService(app, DEFAULT_SETTINGS, metadataService);
    });

    test('should ignore non-markdown files', async () => {
        const file = new TFile();
        file.path = 'test.png';
        file.extension = 'png';

        await coreService.fileCheck(file);

        // Verify no metadata cache access or other logic triggered
        expect(app.metadataCache.getFileCache).not.toHaveBeenCalled();
    });

    test('should process markdown files', async () => {
        const file = new TFile();
        file.path = 'test.md';
        file.extension = 'md';
        file.basename = 'test';

        (app.metadataCache.getFileCache as jest.Mock).mockReturnValue({});

        await coreService.fileCheck(file);

        expect(app.metadataCache.getFileCache).toHaveBeenCalledWith(file);
    });
});
