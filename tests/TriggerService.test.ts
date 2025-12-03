import { TriggerService } from 'core/TriggerService';
import { App, TFile, WorkspaceLeaf } from 'obsidian';
import { Trigger } from 'core/types';

describe('TriggerService', () => {
    let app: App;
    let service: TriggerService;

    beforeEach(() => {
        app = new App();
        service = new TriggerService(app);
    });

    test('should register triggers', () => {
        const trigger: Trigger = { type: 'change_from' };
        const callback = jest.fn();
        service.registerTrigger(trigger, callback);

        // We can't access private listeners map easily, but we can verify behavior
    });

    test('should track modified files', () => {
        service.initializeListeners();

        // Get the modify callback
        const modifyCallback = (app.vault.on as jest.Mock).mock.calls.find(call => call[0] === 'modify')[1];

        const file = new TFile();
        file.path = 'test.md';

        modifyCallback(file);

        // We can't access private dirtyFiles, but we can verify it triggers later
    });

    test('should fire change_from and change_to on active-leaf-change if file was modified', () => {
        service.initializeListeners();

        const modifyCallback = (app.vault.on as jest.Mock).mock.calls.find(call => call[0] === 'modify')[1];
        const leafChangeCallback = (app.workspace.on as jest.Mock).mock.calls.find(call => call[0] === 'active-leaf-change')[1];

        const file1 = new TFile();
        file1.path = 'file1.md';

        const file2 = new TFile();
        file2.path = 'file2.md';

        // 1. Enter file1
        const leaf1 = new WorkspaceLeaf();
        (leaf1.view as any).file = file1;
        leafChangeCallback(leaf1);

        // 2. Modify file1
        modifyCallback(file1);

        // 3. Register triggers
        const triggerFrom: Trigger = { type: 'change_from' };
        const callbackFrom = jest.fn();
        service.registerTrigger(triggerFrom, callbackFrom);

        const triggerTo: Trigger = { type: 'change_to' };
        const callbackTo = jest.fn();
        service.registerTrigger(triggerTo, callbackTo);

        // 4. Switch to file2 (Leave file1)
        const leaf2 = new WorkspaceLeaf();
        (leaf2.view as any).file = file2;
        leafChangeCallback(leaf2);

        // Expect callbacks to be fired for file1
        expect(callbackFrom).toHaveBeenCalledWith(file1);
        expect(callbackTo).toHaveBeenCalledWith(file1);
    });

    test('should NOT fire triggers if file was NOT modified', () => {
        service.initializeListeners();

        const leafChangeCallback = (app.workspace.on as jest.Mock).mock.calls.find(call => call[0] === 'active-leaf-change')[1];

        const file1 = new TFile();
        file1.path = 'file1.md';

        const file2 = new TFile();
        file2.path = 'file2.md';

        // 1. Enter file1
        const leaf1 = new WorkspaceLeaf();
        (leaf1.view as any).file = file1;
        leafChangeCallback(leaf1);

        // 2. Register triggers
        const triggerFrom: Trigger = { type: 'change_from' };
        const callbackFrom = jest.fn();
        service.registerTrigger(triggerFrom, callbackFrom);

        // 3. Switch to file2
        const leaf2 = new WorkspaceLeaf();
        (leaf2.view as any).file = file2;
        leafChangeCallback(leaf2);

        expect(callbackFrom).not.toHaveBeenCalled();
    });
});
