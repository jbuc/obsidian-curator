import { BinderService } from '../core/BinderService';
import { GroupService } from '../core/GroupService';
import { TriggerService } from '../core/TriggerService';
import { ActionService } from '../core/ActionService';
import { RulesetService } from '../core/RulesetService';
import { CuratorConfig, Action } from '../core/types';

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

describe('Curator End-to-End', () => {
    let binderService: BinderService;
    let groupService: GroupService;
    let triggerService: TriggerService;
    let actionService: ActionService;
    let rulesetService: RulesetService;
    let mockApp: App;

    beforeEach(() => {
        jest.clearAllMocks();

        mockApp = {
            vault: {
                on: jest.fn(),
                offref: jest.fn(),
                adapter: {
                    exists: jest.fn().mockResolvedValue(false)
                },
                createFolder: jest.fn().mockResolvedValue(undefined),
                getMarkdownFiles: jest.fn().mockReturnValue([])
            },
            metadataCache: {
                getFileCache: jest.fn().mockReturnValue({
                    tags: ['#test']
                })
            },
            fileManager: {
                renameFile: jest.fn().mockResolvedValue(undefined),
                processFrontmatter: jest.fn()
            },
            plugins: {
                plugins: {
                    dataview: {
                        api: {
                            pages: jest.fn((query) => {
                                if (query === '#test') {
                                    return [{ file: { path: 'folder/note.md' } }];
                                }
                                return [];
                            })
                        }
                    }
                }
            },
            _id: Math.random()
        } as unknown as App;

        binderService = new BinderService(mockApp);
        groupService = new GroupService(mockApp);
        triggerService = new TriggerService(mockApp);
        actionService = new ActionService(mockApp, binderService);
        rulesetService = new RulesetService(
            mockApp,
            triggerService,
            groupService,
            binderService,
            actionService
        );
    });

    test('should move file when trigger fires and group matches', async () => {
        // 1. Setup Configuration
        const config: CuratorConfig = {
            groups: [
                { id: 'g1', name: 'Test Group', query: '#test' }
            ],
            triggers: [
                { id: 't1', name: 'On Modify', type: 'obsidian_event', event: 'modify' }
            ],
            actions: [
                { id: 'a1', name: 'Move to /Archive', type: 'move', config: { folder: 'Archive', createIfMissing: true } }
            ],
            rulesets: [
                {
                    id: 'r1',
                    name: 'Archive Test Notes',
                    enabled: true,
                    triggerId: 't1',
                    rules: [
                        { groupId: 'g1', actionIds: ['a1'] }
                    ]
                }
            ]
        };

        // 2. Initialize RulesetService
        rulesetService.updateConfig(config);

        // 3. Simulate Trigger
        // We need to simulate the 'modify' event which the TriggerService listens to.
        // Since TriggerService.initializeListeners() registers the listener, we need to find that listener and call it.

        // Spy on fireTrigger to ensure it's called
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fireTriggerSpy = jest.spyOn(triggerService as any, 'fireTrigger');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleTriggerSpy = jest.spyOn(rulesetService as any, 'handleTrigger');

        // Find the 'modify' callback registered on app.vault.on
        // triggerService.initializeListeners() is called in main.ts, but here we need to call it manually or assume it's called in constructor?
        // TriggerService constructor doesn't call initializeListeners.
        // So we must call it.
        triggerService.initializeListeners();

        const onModifyCall = (mockApp.vault.on as jest.Mock).mock.calls.find(call => call[0] === 'modify');
        if (!onModifyCall) throw new Error('Modify listener not registered');

        const modifyCallback = onModifyCall[1];
        await modifyCallback(mockFile);

        // 4. Wait for async operations to complete
        // Since TriggerService.fireTrigger is synchronous but calls async handlers without awaiting,
        // we need to get the promise returned by handleTrigger and await it.

        // Wait for handleTrigger to be called
        await new Promise<void>(resolve => {
            if (handleTriggerSpy.mock.calls.length > 0) return resolve();
            const interval = setInterval(() => {
                if (handleTriggerSpy.mock.calls.length > 0) {
                    clearInterval(interval);
                    resolve();
                }
            }, 10);
        });

        // Get the promise returned by the first call to handleTrigger
        const handleTriggerPromise = handleTriggerSpy.mock.results[0].value;
        await handleTriggerPromise;

        // 5. Verify
        // Check Binder logs
        const logs = binderService.getEntries();
        expect(logs.length).toBeGreaterThan(0);

        // We primarily care that the action was executed

        // Check if moveFile was called (via app.fileManager.renameFile)
        expect(mockApp.fileManager.renameFile).toHaveBeenCalled();
        expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
            expect.objectContaining({ path: 'folder/note.md' }),
            'Archive/note.md'
        );
    });

    test('ActionService should move file', async () => {
        const action: Action = {
            id: 'a1',
            name: 'Move Action',
            type: 'move',
            config: { folder: 'Archive', createIfMissing: true }
        };

        await actionService.executeAction(mockFile, action);

        expect(mockApp.vault.createFolder).toHaveBeenCalledWith('Archive');
        expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(mockFile, 'Archive/note.md');
    });

    test('should fire folder enter trigger when file is moved into folder', async () => {
        const config: CuratorConfig = {
            groups: [],
            triggers: [
                {
                    id: 't_folder',
                    name: 'On Enter Folder',
                    type: 'folder_event',
                    event: 'enter',
                    folder: 'TargetFolder'
                }
            ],
            actions: [],
            rulesets: [
                {
                    id: 'r_folder',
                    name: 'Folder Rule',
                    enabled: true,
                    triggerId: 't_folder',
                    rules: [
                        { actionIds: [] } // No actions needed for this test, just checking trigger
                    ]
                }
            ]
        };

        rulesetService.updateConfig(config);

        const fireTriggerSpy = jest.spyOn(triggerService as any, 'fireTrigger');

        // Simulate rename event
        // Moving FROM 'Source/note.md' TO 'TargetFolder/note.md'
        const file = new TFile();
        Object.assign(file, { path: 'TargetFolder/note.md', parent: { path: 'TargetFolder' } });
        const oldPath = 'Source/note.md';

        // Manually call handleEvent since we can't easily trigger the vault event with arguments in this mock setup
        // without more complex mocking of the event ref callback.
        // But we can call the private handleEvent method if we cast to any, or just invoke the listener if we find it.

        triggerService.initializeListeners();
        const onRenameCall = (mockApp.vault.on as jest.Mock).mock.calls.find(call => call[0] === 'rename');
        const renameCallback = onRenameCall[1];

        await renameCallback(file, oldPath);

        expect(fireTriggerSpy).toHaveBeenCalledWith('t_folder', file);
    });

    test('should fire startup trigger', async () => {
        const config: CuratorConfig = {
            groups: [],
            triggers: [
                {
                    id: 't_startup',
                    name: 'On Startup',
                    type: 'system_event',
                    event: 'startup'
                }
            ],
            actions: [],
            rulesets: [
                {
                    id: 'r_startup',
                    name: 'Startup Rule',
                    enabled: true,
                    triggerId: 't_startup',
                    rules: []
                }
            ]
        };

        rulesetService.updateConfig(config);
        const fireTriggerSpy = jest.spyOn(triggerService as any, 'fireTrigger');

        // Mock getMarkdownFiles
        const mockFiles = [mockFile];
        (mockApp.vault as any).getMarkdownFiles = jest.fn().mockReturnValue(mockFiles);

        await triggerService.handleSystemEvent('startup');

        expect(fireTriggerSpy).toHaveBeenCalledWith('t_startup', mockFile);
    });

    test('should NOT fire startup trigger if time constraint is not met', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const config: CuratorConfig = {
            groups: [],
            triggers: [
                {
                    id: 't_startup_future',
                    name: 'On Startup Future',
                    type: 'system_event',
                    event: 'startup',
                    timeConstraints: {
                        start: futureDate.toISOString()
                    }
                }
            ],
            actions: [],
            rulesets: [
                {
                    id: 'r_startup_future',
                    name: 'Startup Rule Future',
                    enabled: true,
                    triggerId: 't_startup_future',
                    rules: []
                }
            ]
        };

        rulesetService.updateConfig(config);
        const fireTriggerSpy = jest.spyOn(triggerService as any, 'fireTrigger');

        // Mock getMarkdownFiles
        const mockFiles = [mockFile];
        (mockApp.vault as any).getMarkdownFiles = jest.fn().mockReturnValue(mockFiles);

        await triggerService.handleSystemEvent('startup');

        expect(fireTriggerSpy).not.toHaveBeenCalled();
    });
});
