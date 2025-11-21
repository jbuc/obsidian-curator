import { resolvePathVariables, ActionContext } from '../filter/actionExecutor';
import { App, TFile } from 'obsidian';

describe('resolvePathVariables', () => {
    const mockFile = {
        basename: 'My Note',
        extension: 'md',
        path: 'Folder/My Note.md',
        parent: { path: 'Folder' }
    } as TFile;

    const mockApp = {
        metadataCache: {
            getFileCache: jest.fn().mockReturnValue({
                frontmatter: {
                    client: 'Acme Corp',
                    type: 'Project',
                    year: 2023
                }
            })
        }
    } as unknown as App;

    const context: ActionContext = {
        app: mockApp,
        file: mockFile
    };

    test('should resolve {{title}}', () => {
        expect(resolvePathVariables('Notes/{{title}}', context)).toBe('Notes/My Note');
    });

    test('should resolve {{name}}', () => {
        expect(resolvePathVariables('Notes/{{name}}', context)).toBe('Notes/My Note');
    });

    test('should resolve frontmatter variables', () => {
        expect(resolvePathVariables('Projects/{{frontmatter.client}}', context)).toBe('Projects/Acme Corp');
        expect(resolvePathVariables('Archive/{{frontmatter.year}}', context)).toBe('Archive/2023');
    });

    test('should resolve prop variables', () => {
        expect(resolvePathVariables('Type/{{prop.type}}', context)).toBe('Type/Project');
    });

    test('should handle missing frontmatter', () => {
        expect(resolvePathVariables('Notes/{{frontmatter.missing}}', context)).toBe('Notes/');
    });

    test('should handle date variables (mocked)', () => {
        // Mock window.moment if needed, or rely on fallback
        // For this test, we expect the fallback YYYY-MM-DD since moment isn't mocked globally here
        const today = new Date().toISOString().split('T')[0];
        expect(resolvePathVariables('Daily/{{date:YYYY-MM-DD}}', context)).toBe(`Daily/${today}`);
    });
});
