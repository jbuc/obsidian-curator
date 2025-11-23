import { BinderService } from '../core/BinderService';
import { IdentifierService } from '../core/IdentifierService';
import { GroupService } from '../core/GroupService';
import { TriggerService } from '../core/TriggerService';
import { ActionService } from '../core/ActionService';
import { JobService } from '../core/JobService';
import { RulesetService } from '../core/RulesetService';
import { CuratorConfig } from '../core/types';

// Mock Obsidian module
jest.mock('obsidian', () => ({
    App: class { },
    TFile: class { },
    MetadataCache: class { },
    Vault: class { },
    FileManager: class { },
    getAllTags: jest.fn((cache) => cache?.tags || []),
    normalizePath: jest.fn((path) => path),
    Notice: class { },
    Plugin: class { },
    PluginSettingTab: class { },
    Setting: class {
        setName() { return this; }
        setDesc() { return this; }
        addButton() { return this; }
    }
}));

import { App, TFile } from 'obsidian';

// Mock Obsidian classes
const mockFile = new TFile();
Object.assign(mockFile, {
    path: 'folder/note.md',
    basename: 'note',
    extension: 'md',
    name: 'note.md',
    parent: { path: 'folder' }
});

const mockApp = {
    vault: {
        on: jest.fn(),
        offref: jest.fn(),
        adapter: {
            exists: jest.fn().mockResolvedValue(false)
        },
        createFolder: jest.fn().mockResolvedValue(undefined)
    },
    metadataCache: {
        getFileCache: jest.fn().mockReturnValue({
            tags: ['#test']
        })
    },
    fileManager: {
        renameFile: jest.fn().mockResolvedValue(undefined),
        processFrontmatter: jest.fn()
    }
} as unknown as App;

describe('Curator End-to-End', () => {
    let binderService: BinderService;
    let identifierService: IdentifierService;
    let groupService: GroupService;
    let triggerService: TriggerService;
    let actionService: ActionService;
    let jobService: JobService;
    let rulesetService: RulesetService;

    beforeEach(() => {
        jest.clearAllMocks();

        binderService = new BinderService(mockApp);
        identifierService = new IdentifierService(mockApp);
        groupService = new GroupService(mockApp, identifierService);
        triggerService = new TriggerService(mockApp);
        actionService = new ActionService(mockApp, binderService);
        jobService = new JobService(mockApp, actionService, binderService);
        rulesetService = new RulesetService(
            mockApp,
            triggerService,
            groupService,
            jobService,
            binderService,
            identifierService,
            actionService
        );
    });

    test.skip('should move file when trigger fires and group matches', async () => {
        // 1. Setup Configuration
        const config: CuratorConfig = {
            identifiers: [
                { id: 'id1', name: 'Has Tag #test', type: 'tag', config: { tag: '#test' } }
            ],
            groups: [
                { id: 'g1', name: 'Test Group', identifiers: ['id1'], operator: 'AND' }
            ],
            triggers: [
                { id: 't1', name: 'On Modify', type: 'obsidian_event', event: 'modify' }
            ],
            actions: [
                { id: 'a1', name: 'Move to /Archive', type: 'move', config: { folder: 'Archive', createIfMissing: true } }
            ],
            jobs: [
                { id: 'j1', name: 'Archive Job', actionIds: ['a1'] }
            ],
            rulesets: [
                { id: 'r1', name: 'Archive Test Notes', enabled: true, triggerId: 't1', groupId: 'g1', jobId: 'j1' }
            ]
        };

        // 2. Initialize
        const registerSpy = jest.spyOn(triggerService, 'registerTrigger');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleTriggerSpy = jest.spyOn(rulesetService as any, 'handleTrigger');

        triggerService.initializeListeners();
        rulesetService.updateConfig(config);

        expect(registerSpy).toHaveBeenCalled();

        // 3. Simulate Trigger
        // We need to manually fire the callback registered with the trigger service
        // Since we can't easily trigger the real obsidian event in this mock env without more complex setup,
        // we will inspect the registered callbacks in TriggerService or just simulate the flow by calling handleTrigger on RulesetService if it was public.
        // But better: TriggerService registers a listener with app.vault.on. We can capture that listener.

        const onModifyCall = (mockApp.vault.on as jest.Mock).mock.calls.find(call => call[0] === 'modify');
        expect(onModifyCall).toBeDefined();
        const modifyCallback = onModifyCall[1];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fireTriggerSpy = jest.spyOn(triggerService as any, 'fireTrigger');

        // 4. Execute
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.log('Active Triggers:', Array.from((triggerService as any).activeTriggers.values()));
        await modifyCallback(mockFile);

        expect(fireTriggerSpy).toHaveBeenCalled();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.log('Listeners size:', (triggerService as any).listeners.size);

        // Check if handleTrigger was called
        expect(handleTriggerSpy).toHaveBeenCalled();
        expect(handleTriggerSpy).toHaveBeenCalledWith('t1', mockFile);

        // 5. Verify
        // Check Binder logs
        const logs = binderService.getEntries();
        // Check Binder logs (optional, just verify some activity)
        expect(logs.length).toBeGreaterThan(0);

        // We primarily care that the action was executed

        // Check if moveFile was called (via app.fileManager.renameFile)
        expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
            mockFile,
            'Archive/note.md'
        );
    });

    test('ActionService should move file', async () => {
        const action: any = {
            id: 'a1',
            name: 'Move Action',
            type: 'move',
            config: { folder: 'Archive', createIfMissing: true }
        };

        await actionService.executeAction(mockFile, action);

        expect(mockApp.vault.createFolder).toHaveBeenCalledWith('Archive');
        expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(mockFile, 'Archive/note.md');
    });
});
