# Auto Organizer

Auto Organizer is a more complex and advanced fork of Auto Note Mover by Farux. It is designed to be used by users who need more control over the conditions necessary to trigger an action. It also provides the opportunity to conduct multiple actions on a note. It can be triggered either manually or automatically when a file has been changed.

Examples:
- if I add a frontmatter.status property of "done" to a note that has a frontmatter.type property of "task" the note will be moved to my "To Do/Tasks/Done" folder and will apply the template "task complete" to the note. 
- if I add the tag "meeting" to a file it will prepend today's date to the title. 

## How it works

Create one or more **criteria rules**. Each rule combines:

- A nested criteria tree (groups + conditions) that decides when the rule matches.
- One or more actions (move, apply template, rename, etc.) that run sequentially when the rule fires.
- Optional `stopOnMatch` behavior to short-circuit once the actions complete.

When the active note matches the rule, Auto Note Mover will move the note to the destination folder.

If you create a new note from a link in an existing note or from another plugin, Auto Note Mover will move those notes to the folder you want, so you don't have to worry about where or how to create the note.

If the rule is matched but the destination folder is not found, or if the destination folder has a note with the same name, a warning will be displayed and the move will be aborted.

## Triggers

There are two types of triggers for Auto Note Mover.

### Automatic

Triggered when you create, edit, or rename a note, and moves the note if it matches the rules.
You can also activate the trigger with a command.

### Manual

Will not automatically move notes.

You can trigger by command.

## Criteria rules (beta)

1. Enable **Criteria engine** in the plugin settings (Settings → Community plugins → Auto Note Mover).
2. Use the visual builder to compose your logic. Each rule lets you nest groups (All / Any + true/false) and add inline conditions for properties such as `file.name`, `file.folder`, `tags`, `frontmatter.status`, etc. Available comparators: `equals`, `contains`, `startsWith`, `endsWith`, `matchesRegex`, `exists`, `notExists`.
3. Add one or more actions (move, apply template, rename, add/remove tag). Actions run top-to-bottom for that rule. If you have the Templater plugin enabled, the **apply template** action will try to route the template through Templater; otherwise it falls back to the raw file contents.
4. Use the rule header toggles to enable/disable the rule or collapse it. “Stop on match” is implicit—leave later rules enabled only when you want them to run after a match.
5. Need to share or bulk-edit rules? Expand **Advanced → Edit criteria rules as JSON** inside the settings pane. The current structure is also documented in `docs/criteria-engine-design.md` and you can copy starter examples from `docs/criteria-engine-sample.json`.

Tips:

- Tags are automatically normalized so `#project` and `project` both match when you specify the `tags` property.
- Frontmatter arrays (e.g., `status: [planning, drafting]`) are checked entry by entry, so matching either value moves the note.
- Regex conditions support both raw patterns (`project`) and literal syntax (`/pattern/flags`).
- Use descriptive property names (e.g., `frontmatter.type`) to avoid confusion with similarly named fields in different contexts.
- Upgrading from the old property rules? Your existing configuration is migrated automatically the next time the plugin loads so you can continue editing it in the new builder.

## Legacy property rules (deprecated)

The original UI for simple tag/title-to-folder rules has been removed, but existing configurations continue to run when the criteria engine is disabled.

1. Enter the property you want to evaluate (for example: tags, type, status, folder, path).
2. Provide the exact value to match for that property.
3. (Optional) Define a title pattern using JavaScript regular expressions if you want to move notes based on their name.
4. Choose the destination folder for matching notes.
5. Rules run from top to bottom. Notes are moved by the **first matching rule.**

Legacy tips still apply while this mode is enabled:

- Tags are automatically normalized so `#project` and `project` both match when you specify the `tags` property.
- Frontmatter arrays (e.g., `status: [planning, drafting]`) are checked entry by entry, so matching either value moves the note.
- Title patterns always use JavaScript regular expressions (e.g., `^Daily-\\d+$`).
- Use the `title` or `name` property for exact matches; rely on the Title Pattern field when you need regex-based matching.
- Use descriptive property names (e.g., `frontmatter.type`) to avoid confusion with similarly named fields in different contexts.

## Notice

1. Attached files will not be moved, but they will still appear in the note.
2. Auto Note Mover will not move notes that have "**AutoNoteMover: disable**" in the frontmatter.

## Example configurations

Rather see the JSON directly? Open `docs/criteria-engine-sample.json` for a handful of pre-built rule sets (daily notes, tag routing, project boards, etc.) that can be pasted into the advanced editor. The file mirrors what the UI produces, so it’s safe to tweak and import.


## Troubleshooting

### 1. Notes do not move.

Make sure that the rules are correct, that no excluded folders are set, and that they are not disabled in the frontmatter.
Another possibility is that if the vault is monitored by a real-time sync software like Dropbox, if the editing overlaps with the timing of the sync, the sync software might lock the note and prevent it from being moved.

### 2. Duplicate notes
Check your sync software.

Duplicate notes due to iCloud glitches have been reported.
https://github.com/farux/obsidian-auto-note-mover/issues/19

## Attribution
suggest.ts and file-suggest.ts are copyrighted works of Liam Cain (https://github.com/liamcain) obsidian-periodic-notes (https://github.com/liamcain/obsidian-periodic-notes).

popper.js https://popper.js.org/


## Special Thanks
Thanks to [@pjeby](https://github.com/pjeby) for his help in creating this plugin.
