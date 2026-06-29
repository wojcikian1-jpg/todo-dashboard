# Projects View — Feature Backlog

Tracking everything brainstormed for the Projects tab. The **MVP scope** ships first; everything under **Shelved** is intentionally deferred.

## MVP scope (building first)

1. New `Projects` tab in `dashboard-shell.tsx` alongside `Board` and `Recurring`
2. **Project** entity: name, description, goal, status (Planning / Active / Blocked / On Hold / Done / Archived), start date, target date
3. **Sub-workflows** as named groupings inside a project; existing kanban reused with sub-workflow filter
4. **Issues** as a simple flat list per project (title, status: Open/Resolved, opened date)
5. **Notes** as a flat, timestamped, markdown-supported feed per project
6. Two-pane layout: left rail = project list, right pane = selected project detail with inner tabs (Overview / Tasks / Issues / Notes)
7. Tasks gain optional `project_id` and `subworkflow_id` columns (nullable — existing tasks untouched)

## Shelved (revisit after MVP is in use)

### Project metadata
- Owner field & avatars (single-user dashboard right now)
- Tags/colors/icons on projects
- Cross-project tags

### Milestones & timeline
- Milestone entity (date-anchored checkpoints inside a project)
- Horizontal milestone strip on Overview tab
- Milestone-weighted progress bar (vs. simple task-count %)

### Issue management
- Severity levels (Critical / High / Medium / Low)
- Issue status workflow beyond Open/Resolved (Investigating, Won't Fix, etc.)
- "What this blocks" — link issues to specific tasks
- Days-open counter, assignee field

### Notes & decisions
- Note categories/tags (Status Update / Decision / Risk / Retro)
- Pinned notes
- Dedicated Decision Log tab separate from notes

### Health & status signals
- Auto-derived health pill (Green/Yellow/Red from overdue milestones + open critical issues)
- Staleness indicator ("Last activity 12 days ago")
- Per-project activity feed (last N events)

### Cross-project widgets
- "My open issues across all projects" (top of Projects tab)
- "This week's milestones" widget
- "Stale projects" surfacing

### Per-project Tasks tab enhancements
- "Group by sub-workflow" swim-lane toggle on the kanban
- Sub-workflow dropdown filter

### Quick actions panel
- One-click "Add task / Log issue / Add note / Add milestone" from Overview

### Layout alternatives (not chosen for MVP)
- Gallery / tile-grid view of project cards (instead of left-rail list)

### Explicitly NOT building (YAGNI for this scale)
- Gantt charts
- Time tracking
- Task dependency graphs
- Project templates
