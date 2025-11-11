# Auto Note Mover

Auto Note Mover will automatically move the active notes to their respective folders according to the rules.

## How it works

Create one or more **filter rules**. Each rule combines:

- A nested filter tree (groups + conditions) that decides when the rule matches.
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

## Filter rules (beta)

1. Enable **Filter engine** in the plugin settings (Settings → Community plugins → Auto Note Mover).
2. Use the visual rule builder to combine groups (`all`, `any`, `none`) and individual conditions. Properties can reference file metadata (e.g., `file.name`, `file.folder`, `tags`, `frontmatter.status`). Comparators currently include `equals`, `contains`, `startsWith`, `endsWith`, `matchesRegex`, `exists`, and `notExists`. Set `negate: true` on a condition to invert it.
3. Add one or more actions to run when the filter matches. Actions execute sequentially, so you can move a note, apply a template, rename it, or add/remove tags in one pass.
4. Decide whether the rule should stop evaluation (`stopOnMatch`) or allow later rules to run.
5. Save the JSON in the temporary editor. See `docs/filter-engine-sample.json` for ready-to-use examples that mirror the mockups above.
6. Need to hand-edit the configuration? Expand the “Advanced: edit filter rules as JSON” section in the settings to tweak the raw structure or paste shared snippets.

Tips:

- Tags are automatically normalized so `#project` and `project` both match when you specify the `tags` property.
- Frontmatter arrays (e.g., `status: [planning, drafting]`) are checked entry by entry, so matching either value moves the note.
- Regex conditions support both raw patterns (`project`) and literal syntax (`/pattern/flags`).
- Use descriptive property names (e.g., `frontmatter.type`) to avoid confusion with similarly named fields in different contexts.
- Upgrading from the old property rules? Your existing configuration is migrated automatically the next time the plugin loads so you can continue editing it in the new builder.

## Legacy property rules (deprecated)

The original UI for simple tag/title-to-folder rules has been removed, but existing configurations continue to run when the filter engine is disabled.

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

## Example of use

### Tag
![Food0](https://user-images.githubusercontent.com/33874906/152721614-45a65095-3af2-4e80-8973-26be686ca585.png)

![Food2](https://user-images.githubusercontent.com/33874906/152721697-7cf722fc-bc82-4c5d-8bbe-6c087755d29c.png)

### Nested Tag
![nest0](https://user-images.githubusercontent.com/33874906/152721876-58b19020-eb75-4324-a8ba-2110dba11ea6.png)

![nest1](https://user-images.githubusercontent.com/33874906/152721897-be270fc9-6381-46b6-99d0-1d5a08260a06.png)

### Daily Notes
![day0](https://user-images.githubusercontent.com/33874906/152721914-48ed5cc5-ec08-4f80-9425-8c68b719107a.png)

![day1](https://user-images.githubusercontent.com/33874906/152721927-659d0ad4-ce9f-4aea-8752-8eb668500af5.png)

### Task Notes
![task0](https://user-images.githubusercontent.com/33874906/152723161-6a8d9999-15e9-4e97-8b71-e07ff30fb330.png)

![task1](https://user-images.githubusercontent.com/33874906/152723175-839e724c-4437-42ff-ba05-f458e45c3f21.png)

### Star Notes
![sta0](https://user-images.githubusercontent.com/33874906/152721996-74f29153-4266-4aff-88e6-e765ef031d65.png)

![sta1](https://user-images.githubusercontent.com/33874906/152722006-54f5c315-8d5b-457b-8cfc-ec982a2b088c.png)

### How to Notes
![how0](https://user-images.githubusercontent.com/33874906/152722040-e100961b-8398-485d-bc64-f3fa784b79be.png)

![how1](https://user-images.githubusercontent.com/33874906/152722054-820441a1-a244-43cb-b8f2-fcde06310d40.png)

### Command
![comm](https://user-images.githubusercontent.com/33874906/152723205-70599951-75ee-4915-a160-17a3faed67b0.png)

### Disable Auto Note Mover in front matter.
![fm0](https://user-images.githubusercontent.com/33874906/152722074-d550e13c-2955-40ab-b324-7e934d86ea1a.png)


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
