# Curator Plugin QA Checklist

Use this document to verify the functionality of the Curator plugin. Please add comments or mark items as `[x]` (Pass) or `[ ]` (Fail/Pending).

## 1. Settings & UI
- [ ] **Plugin Loads**: Plugin enables without errors in the console.
- [ ] **Settings Tab**: "Curator" appears in Obsidian settings.
- [ ] **Version Info**: Version and Build ID are displayed.
- [ ] **Navigation**: Switching between "Rules" and "Logbook" tabs works.
- [ ] **Global Controls**: "Expand All", "Collapse All", and "Delete All" buttons function correctly.

## 2. Ruleset Management
- [ ] **Add Ruleset (Settings)**:
    - Click "Add Ruleset".
    - Enter Name and Trigger.
    - Toggle "Save as Markdown File" **OFF**.
    - Ruleset appears in the list.
- [ ] **Add Ruleset (File)**:
    - Click "Add Ruleset".
    - Enter Name and Trigger.
    - Toggle "Save as Markdown File" **ON**.
    - Select a folder (verify Folder Suggest works).
    - Ruleset appears in the list with a "File" icon/indicator.
    - Verify a `.ruleset.md` file was created in the vault.
- [ ] **Delete Ruleset**:
    - Delete a Settings-based ruleset (removes from UI).
    - Delete a File-based ruleset (removes from UI AND deletes file).
- [ ] **Delete All**: Warning prompt appears, and all rulesets are removed.
- [ ] **Enable/Disable**: Toggle switch works and persists state.

## 3. Triggers
- [ ] **Change To**: Trigger fires when opening/navigating TO a matching note.
- [ ] **Change From**: Trigger fires when modifying and navigating AWAY FROM a matching note.
- [ ] **Manual**: Command appears in Command Palette (`Curator: Run [Ruleset Name]`) and runs.
- [ ] **Startup**: Trigger runs when Obsidian opens (requires restart).
- [ ] **Schedule**: Trigger runs at the specified time.

## 4. Rule Configuration
- [ ] **Dataview Query (Scope)**:
    - Enter a valid query (e.g., `#todo`). Status shows "Valid".
    - Enter an invalid query. Status shows error.
- [ ] **Rule Conditions**:
    - Add a Rule.
    - "Use Trigger Query" toggle works (inherits scope).
    - Custom Query input works and validates.
- [ ] **Reordering**: Move Rules and Actions up/down.

## 5. Actions
- [ ] **Move**: File moves to the specified folder. (Folder Suggest works).
- [ ] **Rename**: File is renamed with Prefix/Suffix.
- [ ] **Tag**: Tags are Added/Removed.
- [ ] **Update Property**: Frontmatter properties are updated/added.
- [ ] **Dry Run**: Clicking "Test Run" shows a list of matching files and proposed actions without changing anything.

## 6. File Syncing (Advanced)
- [ ] **UI to File**: Changing the name or query in the UI updates the `.ruleset.md` file content.
- [ ] **File to UI**: Manually editing the `.ruleset.md` file updates the UI (might require closing/reopening settings).

## Notes & Bugs
*(Add your observations here)*
