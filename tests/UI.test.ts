import { App, Setting } from 'obsidian';
import { RulesTab } from '../ui/components/RulesTab';
import { DefinitionsTab } from '../ui/components/DefinitionsTab';
import { LogbookTab } from '../ui/components/LogbookTab';
import { CuratorConfig } from '../core/types';
import { BinderService } from '../core/BinderService';

// Mock Obsidian
jest.mock('obsidian', () => ({
    App: class { },
    Setting: class {
        constructor(container: any) { }
        setName() { return this; }
        setDesc() { return this; }
        addButton(cb: any) {
            const btn: any = {
                setButtonText: () => btn,
                setCta: () => btn,
                onClick: (fn: any) => { (this as any).onClick = fn; return btn; },
                setIcon: () => btn,
                setTooltip: () => btn
            };
            cb(btn);
            return this;
        }
        addText(cb: any) {
            const text: any = {
                setValue: () => text,
                setPlaceholder: () => text,
                onChange: (fn: any) => { (this as any).onChange = fn; return text; }
            };
            cb(text);
            return this;
        }
        addToggle(cb: any) {
            const toggle: any = {
                setValue: () => toggle,
                setTooltip: () => toggle,
                onChange: (fn: any) => { (this as any).onChange = fn; return toggle; }
            };
            cb(toggle);
            return this;
        }
        addDropdown(cb: any) {
            const dropdown: any = {
                addOption: () => dropdown,
                setValue: () => dropdown,
                onChange: (fn: any) => { (this as any).onChange = fn; return dropdown; }
            };
            cb(dropdown);
            return this;
        }
        addExtraButton(cb: any) {
            const btn: any = {
                setIcon: () => btn,
                setTooltip: () => btn,
                onClick: (fn: any) => { (this as any).onClick = fn; return btn; }
            };
            cb(btn);
            return this;
        }
        addTextArea(cb: any) {
            const text: any = {
                setValue: () => text,
                setPlaceholder: () => text,
                onChange: (fn: any) => { (this as any).onChange = fn; return text; }
            };
            cb(text);
            return this;
        }
        onClick: any;
        onChange: any;
    },
    ButtonComponent: class {
        constructor(container: any) { }
        setButtonText() { return this; }
        setWarning() { return this; }
        onClick(fn: any) { this.onClick = fn; return this; }
    }
}));

describe('UI Components', () => {
    let mockApp: App;
    let containerEl: HTMLElement;
    let config: CuratorConfig;
    let onUpdate: jest.Mock;

    const createMockElement = () => {
        const el: any = {
            empty: jest.fn(),
            createEl: jest.fn(),
            createDiv: jest.fn(),
            createSpan: jest.fn(),
            addClass: jest.fn(),
            style: {}
        };
        el.createEl.mockReturnValue(el);
        el.createDiv.mockReturnValue(el);
        el.createSpan.mockReturnValue(el);
        return el;
    };

    beforeEach(() => {
        mockApp = new App();
        containerEl = createMockElement();

        config = {
            groups: [],
            triggers: [],
            actions: [],
            rulesets: []
        };
        onUpdate = jest.fn();
    });

    describe('RulesTab', () => {
        test('should add a new ruleset', () => {
            const rulesTab = new RulesTab(mockApp, containerEl, config, onUpdate);
            rulesTab.display();

            // Access the private method for testing purposes
            (rulesTab as any).addRuleset();

            expect(config.rulesets.length).toBe(1);
            expect(config.rulesets[0].name).toBe('New Ruleset');
            expect(onUpdate).toHaveBeenCalled();
        });
    });

    describe('DefinitionsTab', () => {
        test('should add a new group', () => {
            const definitionsTab = new DefinitionsTab(mockApp, containerEl, config, onUpdate);
            definitionsTab.display();

            // Simulate adding group manually
            config.groups.push({
                id: 'g1',
                name: 'Test Group',
                query: '#test'
            });
            definitionsTab.display();

            expect(config.groups.length).toBe(1);
        });
    });

    describe('LogbookTab', () => {
        test('should display entries', () => {
            const binder = new BinderService(mockApp);
            binder.log('info', 'Test message');

            const logbookTab = new LogbookTab(mockApp, containerEl, binder);
            logbookTab.display();

            expect(containerEl.createDiv).toHaveBeenCalledWith('curator-logbook');
        });
    });
});
