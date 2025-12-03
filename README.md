# Curator for Obsidian

**Curator** is a powerful, rule-based automation plugin for Obsidian that helps you keep your vault organized effortlessly. By leveraging the power of **Dataview** queries, Curator allows you to define precise criteria for moving, renaming, tagging, and updating your notes automatically.

## Features

*   **Flexible Triggers**: Run automations when notes change, on a schedule, on startup, or manually.
*   **Dataview Integration**: Use the full power of Dataview Query Language (DQL) to define exactly which notes to target.
*   **Import/Export**: Easily share or backup your rulesets as Markdown files.
*   **Comprehensive Actions**:
    *   **Move**: Organize notes into folders.
    *   **Rename**: Add prefixes or suffixes to filenames.
    *   **Tag**: Add or remove tags.
    *   **Update Properties**: Modify YAML frontmatter/properties.
*   **Dry Run**: Test your rules safely before applying them to see exactly what will happen.
*   **Mobile Friendly**: Fully responsive UI designed for desktop, tablet, and mobile.

## Installation

### Via BRAT (Beta Reviewers Auto-update Tool)
1.  Install the **BRAT** plugin from the Obsidian Community Plugins.
2.  Open BRAT settings and click "Add Beta plugin".
3.  Enter the repository URL: `https://github.com/jbuc/obsidian-curator`
4.  Click "Add Plugin".

### Manual Installation
1.  Download the latest release from the Releases page.
2.  Extract the files (`main.js`, `manifest.json`, `styles.css`) into your vault's `.obsidian/plugins/curator` folder.
3.  Reload Obsidian.

## Usage Guide

Curator works by defining **Rulesets**. Each Ruleset contains a **Trigger** and a list of **Rules**.

### 1. Triggers (When?)
Define *when* your automation should run.
*   **Notes change to...**: Runs when a note is modified and *matches* a specific Dataview query (e.g., `FROM "Inbox"`).
*   **Notes change from...**: Runs when a note is modified and *no longer matches* a query.
*   **Scheduled time**: Runs automatically at a specific time on selected days.
*   **Obsidian starts**: Runs once when you open Obsidian.
*   **A command runs**: Adds a command to the Command Palette that you can trigger manually.

### 2. Rules (Which notes?)
Within a Ruleset, you can define multiple **Rules**. Each rule has a **Condition**.
*   **Condition**: A Dataview query (e.g., `#project AND !completed`).
*   **Inherit Scope**: You can choose to use the Trigger's query as the condition for your rules, simplifying setup.

### 3. Actions (What to do?)
When a Rule matches a note, it executes a series of **Actions**.
*   **Move**: Moves the note to a specified folder.
*   **Rename**: Adds a prefix or suffix to the filename.
*   **Tag**: Adds or removes a tag.
*   **Update**: Sets a property (frontmatter) key to a specific value.

## Example Workflows

**Auto-Move Daily Notes**
*   **Trigger**: Scheduled time (23:59)
*   **Rule Condition**: `FROM "Daily" AND file.cday < date(today)`
*   **Action**: Move to `Archive/Daily`

**Project Management**
*   **Trigger**: Notes change to... `FROM "Inbox"`
*   **Rule Condition**: `#project`
*   **Action**: Move to `Projects/Active`
*   **Action**: Tag `#status/active`

## Requirements

*   **Dataview Plugin**: Curator relies on Dataview for querying files. Please ensure it is installed and enabled.

## Support

If you encounter any issues or have feature requests, please file an issue on the [GitHub Repository](https://github.com/jbuc/obsidian-curator/issues).
