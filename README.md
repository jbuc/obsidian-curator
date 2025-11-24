# Curator

![Curator Logo](assets/icon.png)

**Curator** is an Obsidian plugin that automatically organizes your vault with powerful, rule-based automation. Move, rename, template, and tag your notes based on their properties, tags, and content—all without lifting a finger.

## ✨ Key Features

- 🎯 **Rule-Based Automation** - Create sophisticated rules with nested conditions (AND/OR/NOT logic)
- 📁 **Smart File Organization** - Automatically move notes to the right folders
- 🏷️ **Dynamic Properties** - Set or update frontmatter based on your rules
- 📝 **Template Integration** - Apply templates automatically (works with Templater)
- 🔄 **Batch Renaming** - Add prefixes, suffixes, or completely rename files
- 🧪 **Dry Run Mode** - Test your rules safely before applying them
- 📊 **Weighted Prioritization** - Control which rules take precedence
- 🔍 **Debug Mode** - Verbose logging for troubleshooting
- 🎨 **Tabbed Settings** - Clean, organized interface

## 📦 Installation

### From Obsidian Community Plugins

1. Open **Settings** → **Community Plugins**
2. Browse and search for **"Curator"**
3. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/jbuc/obsidian-curator/releases)
2. Create a folder named `curator` in your vault's `.obsidian/plugins/` directory
3. Place both files in that folder
4. Reload Obsidian and enable the plugin

## 🚀 Quick Start

1. **Open Settings** → Navigate to Curator settings
2. **Choose Trigger Mode**:
   - **Automatic**: Rules run when you create, edit, or rename notes
   - **Manual**: Rules only run via command palette
3. **Create Your First Rule**:
   - Click **"Add Rule"** in the Rules tab
   - Set conditions (e.g., "If tag equals 'meeting'")
   - Add actions (e.g., "Move to 'Meetings' folder")
   - Save and test!

## 🎓 Example Use Cases

### Daily Note Organization
Move daily notes to dated folders automatically:
```
Condition: file.name starts with "Daily-"
Action: Move to "Journal/{{date:YYYY}}/{{date:MM}}"
```

### Project-Based Filing
Organize project notes by their frontmatter:
```
Condition: frontmatter.project exists
Action: Move to "Projects/{{frontmatter.project}}"
```

### Task Completion
Auto-archive completed tasks:
```
Condition: frontmatter.status equals "done" AND tags contains "task"
Actions: 
  1. Move to "Archive/Tasks"
  2. Apply template "task-complete"
  3. Set property "completed" to "{{date:YYYY-MM-DD}}"
```

### Meeting Notes
Organize meeting notes with auto-dating:
```
Condition: tags contains "meeting"
Actions:
  1. Rename with prefix "{{date:YYYY-MM-DD}} - "
  2. Move to "Meetings/{{date:YYYY}}"
```

## 🔧 Advanced Features

### Variable System
Use variables in your destination paths and property values:

- `{{title}}` or `{{name}}` - The file name
- `{{parent}}` - Immediate parent folder name
- `{{file.folder}}` - Full folder path
- `{{date:YYYY-MM-DD}}` - Current date (customizable format)
- `{{frontmatter.key}}` or `{{prop.key}}` - Frontmatter property value
- `{{label}}` - Reusable property labels (define in Universal Settings)

### Dry Run Mode
Test your rules without making any changes:

1. Go to **Diagnosis** tab
2. Click **"Run Dry Run"**
3. Review what would happen to each file
4. Adjust rules as needed

### Weighted Prioritization
Control which rules run first by setting property weights in **Universal Settings**. Higher-weighted properties score higher when matched.

### Debug Mode
Enable verbose logging in **Universal Settings** → **Debug Mode** to see exactly how rules are evaluated.

## 📚 Documentation

- **Rules Tab**: Create and manage automation rules
- **Universal Settings**: Configure trigger mode, variables, and debug options
- **Diagnosis**: Test rules with dry run and view diagnostics

## 💡 Tips & Tricks

- Use **descriptive rule names** to keep your setup organized
- Enable **"Stop on Match"** on rules to prevent multiple rules from affecting the same file
- Test new rules in **Dry Run** mode first
- Use the **{{parent}}** variable for folder-based organization
- Combine multiple actions in one rule for complex workflows
- Regular expressions are supported in conditions for pattern matching

## 🐛 Troubleshooting

### Notes don't move
- Check that trigger mode is set to "Automatic"
- Verify your rule conditions are correct
- Make sure the destination folder exists (or enable "Create folder if missing")
- Check that the note doesn't have `AutoNoteMover: disable` in frontmatter

### Duplicate notes
This can happen with sync software (iCloud, Dropbox, etc.) if editing overlaps with sync timing. The sync software might lock the file during the move operation.

### Need more help?
Enable **Debug Mode** in Universal Settings to see detailed logs of rule evaluation.

## 🙏 Attribution

- Inspired by and forked from [Auto Note Mover](https://github.com/farux/obsidian-auto-note-mover) by Farux
- File suggest components by [Liam Cain](https://github.com/liamcain) from [Periodic Notes](https://github.com/liamcain/obsidian-periodic-notes)
- Uses [Popper.js](https://popper.js.org/) for UI positioning

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ by [jbuc](https://github.com/jbuc)**
