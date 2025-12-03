import { RulesetService } from 'core/RulesetService';
import { TriggerService } from 'core/TriggerService';
import { GroupService } from 'core/GroupService';
import { BinderService } from 'core/BinderService';
import { ActionService } from 'core/ActionService';
import { App, TFile } from 'obsidian';
import { Ruleset, Trigger, Rule, Action } from 'core/types';

// Mock dependencies
jest.mock('core/TriggerService');
jest.mock('core/GroupService');
jest.mock('core/BinderService');
jest.mock('core/ActionService');

describe('RulesetService', () => {
    let app: App;
    let triggerService: jest.Mocked<TriggerService>;
    let groupService: jest.Mocked<GroupService>;
    let binderService: jest.Mocked<BinderService>;
    let actionService: jest.Mocked<ActionService>;
    let service: RulesetService;

    beforeEach(() => {
        app = new App();
        triggerService = new TriggerService(app) as jest.Mocked<TriggerService>;
        groupService = new GroupService(app) as jest.Mocked<GroupService>;
        binderService = new BinderService(app) as jest.Mocked<BinderService>;
        actionService = new ActionService(app, binderService) as jest.Mocked<ActionService>;

        service = new RulesetService(
            app,
            triggerService,
            groupService,
            binderService,
            actionService
        );
    });

    test('should execute actions if scope and rule match', async () => {
        const file = new TFile();
        file.path = 'test.md';

        const action: Action = { type: 'tag', config: { tag: 'test' } };
        const rule: Rule = { query: 'rule-query', actions: [action] };
        const trigger: Trigger = { type: 'change_from', query: 'scope-query' };
        const ruleset: Ruleset = {
            id: '1',
            name: 'Test Ruleset',
            enabled: true,
            trigger,
            rules: [rule]
        };

        // Setup mocks
        groupService.matchesQuery.mockResolvedValue(true); // Matches both scope and rule

        // Initialize with ruleset
        service.updateConfig({ rulesets: [ruleset] });

        // Simulate trigger callback
        // We need to access the callback passed to registerTrigger
        const registerCall = triggerService.registerTrigger.mock.calls[0];
        if (registerCall) {
            const callback = registerCall[1];
            await callback(file);
            // Wait for async handleTrigger to complete
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        expect(groupService.matchesQuery).toHaveBeenCalledWith(file, 'scope-query');
        expect(groupService.matchesQuery).toHaveBeenCalledWith(file, 'rule-query');
        expect(actionService.executeAction).toHaveBeenCalledWith(file, action);
    });

    test('should NOT execute actions if scope does not match', async () => {
        const file = new TFile();
        file.path = 'test.md';

        const action: Action = { type: 'tag', config: { tag: 'test' } };
        const rule: Rule = { query: 'rule-query', actions: [action] };
        const trigger: Trigger = { type: 'change_from', query: 'scope-query' };
        const ruleset: Ruleset = {
            id: '1',
            name: 'Test Ruleset',
            enabled: true,
            trigger,
            rules: [rule]
        };

        // Setup mocks
        groupService.matchesQuery.mockImplementation(async (f, q) => {
            if (q === 'scope-query') return false;
            return true;
        });

        service.updateConfig({ rulesets: [ruleset] });

        const registerCall = triggerService.registerTrigger.mock.calls[0];
        const callback = registerCall[1];

        await callback(file);

        expect(groupService.matchesQuery).toHaveBeenCalledWith(file, 'scope-query');
        expect(actionService.executeAction).not.toHaveBeenCalled();
    });

    test('should dry run correctly', async () => {
        const file = new TFile();
        file.path = 'test.md';

        const action: Action = { type: 'move', config: { folder: 'Archive' } };
        const rule: Rule = { query: 'rule-query', actions: [action] };
        const trigger: Trigger = { type: 'change_from', query: 'scope-query' };
        const ruleset: Ruleset = {
            id: '1',
            name: 'Test Ruleset',
            enabled: true,
            trigger,
            rules: [rule]
        };

        // Setup mocks
        groupService.getMatchingFiles.mockResolvedValue([file]);
        groupService.matchesQuery.mockResolvedValue(true);

        service.updateConfig({ rulesets: [ruleset] });

        const results = await service.dryRun('1');

        expect(results).toHaveLength(1);
        expect(results[0].file).toBe(file);
        expect(results[0].actions[0]).toContain('move to Archive');
    });
});
