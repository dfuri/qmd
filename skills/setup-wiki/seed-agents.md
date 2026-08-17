---
title: Wiki Schema
created: {CREATED_DATE}
updated: {CREATED_DATE}
type: schema
---
# Wiki Schema Configuration

This file governs how the LLM builds and maintains your Wiki. Edit it freely.

## Vault Structure

The structure of `00-Kontext/` depends on the wiki type:

- **Global Wiki**: `00-Kontext/teams/{team-name}/` — one subfolder per team. `10-{Domain}/` — one folder per domain, `{domain}-context.md` inside.
- **Team Wiki**: `00-Kontext/` contains the team profile. `10-{Domain}/` — team-specific domains.
- **Personal Wiki**: `00-Kontext/` contains the member's personal profile. No domains.

Shared folders:
- `01-Inbox/` — Quick thoughts, brain dumps, unprocessed notes.
- `02-Projekte/` — Active projects with concrete goals and end dates.
- `03-Bereiche/` — Ongoing areas of responsibility without end date.
- `04-Ressourcen/` — Reference material, knowledge, collected information.
- `05-Daily-Notes/` — Daily logbook.
- `06-Archiv/` — Completed projects and inactive areas.
- `10-{Domain}/` — One folder per domain, contains `{domain}-context.md`.
- `index.md` — Content catalog. Optional, written by an external process (not by the agent). Can be referenced here.
- `00-Kontext/general/TEAM-FORMAT.md` and `DOMAIN-FORMAT.md` — Format templates.

## Vault Rules

- Use `[[wikilinks]]` to link notes.
- New notes should be atomic: one idea per note (exception: Daily Notes).
- Filenames: lowercase, hyphens, no spaces, no umlauts.
- Team profile: `{team-name}-profile.md`
- Domain file: `{domain}-context.md`
- Daily Note: `{team-name}-YYYY-MM-DD.md`
- `03-Bereiche/` and `04-Ressourcen/` are always folders (they grow over time).
- Archive only on HITL instruction.
- Store new knowledge when the HITL says "remember this" or "merk dir das".
- `index.md` is written by an external process; the agent does not update it itself. It is optional and can be referenced.
- If you see a `todo` or `message` tag in frontmatter, set the property value to `draft`. Applies to curated and uncurated pages.
- If you see a heading "Todo" or "Aufgabe", or a `- [ ]` checkbox, write the `todo: draft` property into frontmatter.
- Source pages in `10-{Domain}/` may receive new properties or have existing property values changed. Properties must not be deleted.

## Frontmatter and Content

### General
Use this frontmatter for all files that have no specific frontmatter (see below).

```yaml
---
title: Page title
created: YYYY-MM-DD
updated: YYYY-MM-DD
teams: [TeamName | None]
domains: [DomainName | None]
tags: [from taxonomy]
sources: [source-1.md, source-2.md]
confidence: high | medium | low
contradictions: [other-page]
# Source markers (set by 09-wiki/ ingest):
wiki_refs: [09-wiki/entities/foo, 09-wiki/concepts/bar]
last_ingested: YYYY-MM-DD
---
```

### Daily Note
  - Name: {team-name}-YYYY-MM-DD.md
  - Use YAML frontmatter:
    - `type: team` — page category (MUST be exactly "team")
    - `created:` — ISO date of first creation
    - `teams:` — name of the team or teams
    - `tags:` — entity subtype, MUST be one of: Person, Organisation, Projekt, Produkt, Veranstaltung, Ort, Sonstiges
    - `aliases:` (optional) — alternative names (translations, abbreviations)
    - `reviewed:` (optional) — if true, page is human-verified and protected

### Team
  - Name: {team-name}-profile.md
  - Use YAML frontmatter:
    - `type: team` — page category (MUST be exactly "team")
    - `created:` — ISO date of first creation
    - `domains:` — name of domain or domains
    - `aliases:` (optional) — alternative names (translations, abbreviations)
    - `reviewed:` (optional) — if true, page is human-verified and protected
  - Content:
    - see `00-Kontext/general/TEAM-FORMAT.md`

### Domain
  - Name: {domain name}-context.md
  - Use YAML frontmatter:
    - `type: domain` — page category (MUST be exactly "domain")
    - `created:` — ISO date of first creation
    - `teams:` — name of the team or teams
    - `tags:` — entity subtype, MUST be one of: Person, Organisation, Projekt, Produkt, Veranstaltung, Ort, Sonstiges
    - `aliases:` (optional) — alternative names (translations, abbreviations)
    - `reviewed:` (optional) — if true, page is human-verified and protected
  - Content:
    - see `00-Kontext/general/DOMAIN-FORMAT.md`

### Project
  - Name: {project-name}.md (in `02-Projekte/`)
  - Use YAML frontmatter:
    - `type: entity` — page category
    - `created:` — ISO date of first creation
    - `updated:` — ISO date of last change
    - `teams:` — name of the team or teams
    - `domains:` — name of domain or domains
    - `tags:` — entity subtype
    - `sources:` — source files
    - `confidence:` — high | medium | low

### Naming Conventions

| Type | Format | Example |
|---|---|---|
| Team profile | `{team-name}-profile.md` | `team-engineering-profile.md` |
| Domain glossary | `{domain}-context.md` | `acme-context.md` |
| Daily Note | `{team-name}-YYYY-MM-DD.md` | `team-engineering-2026-07-09.md` |
| Project | `{project-name}.md` (in `02-Projekte/`) | `appliance-setup.md` |
| Other | Descriptive Name.md | `Local AI Agents.md` |

## Tag and Properties Taxonomy

### Property `todo`
- `draft` — open, not actively worked on
- `done` — completed

### Property `message`
- `draft` — open, not actively worked on
- `sent` — has been sent

### Domain
- `{domain-tag-1}`
- `{domain-tag-2}`

### Technology
- `llm`
- `inference`
- `protocol`

### Workflow
- `workflow`
- `skill`
- `kanban`
- `hitl`

### Application
- `use-case`
- `social-media`
- `email`

### Meta
- `meta`
- `schema`
- `entity`
- `concept`
- `comparison`
- `query`

## Page Thresholds

- Create a new page when a topic appears in 2+ sources OR is central to a source.
- Extend an existing page when new sources provide relevant information.
- Do not create a page for fleeting mentions or edge topics.
- Split a page when it exceeds 200 lines.
- Archive a page when it is fully obsolete.

## Session Routines
### On Session Start
- Check `01-Inbox/` for new notes, show what is there, and offer to sort entries into the appropriate folders.
- Check `01-Inbox/` items for `wiki_refs` — if missing, offer to ingest into `09-wiki/` (see `09-wiki/SCHEMA.md` for ingest workflow).
### Context on Demand
- When the HITL asks: "What is currently going on", "Where did I leave off", or similar: read the last 2-3 Daily Notes in `05-Daily-Notes/` and the active project files in `02-Projekte/` to give a briefing. If the user asks to update the Daily Note and a note for the current day already exists, update the existing one (new sections for new topics).
- If the `todo` property is set and does not have value `done`, scan the note for tasks that the user should do and output them. Write `- [ ]` into that line. If unclear, output: "Note '{Name}' contains a TODO". Once all checkboxes are ticked, set `todo` to `done`. Reverse also: if `todo: done` is set, activate all checkboxes.
- If the `message` property is set and does not have value `sent`, scan the note for what could be communicated and to whom, then output it. Write `- [ ]` into that line. If unclear, output: "Note '{Name}' contains a topic to communicate". Once all checkboxes are ticked, set `message` to `sent`. Reverse also: if `message: sent` is set, activate all checkboxes.
### On Session End
- When the HITL ends the session or a natural end is reached, offer to:
  - Create a Daily Note entry in `05-Daily-Notes/` with a summary of the day. If a note for the current day already exists, update it (new sections for new topics)
  - Save new insights as notes
  - Clean up the Inbox if necessary

## Search
- For wiki search requests ("wiki", "search", "find", "knowledge", "Was steht ..."), first invoke the `wiki-search` skill via the skill tool if available. The skill is named exactly `wiki-search` (not `search-wiki`).
- Only if the `wiki-search` skill is unavailable, fall back to the `qmd query` tool. If that is also unavailable, let the LLM decide the search procedure itself.

## Formatting and Definitions
### Date Fields
- The LLM may produce wrong dates during extraction; ask the user which date is correct if not clear from the session.
- `created:` is preserved on merge (older value kept); `updated:` is always set to the current date.
- `source_note:` (optional) — wiki-link to the original source file.

### Mentions Format
"Mentions in Source" entries use academic-footnote style with source attribution. The format is:
- "Verbatim quote in original language (optional translation)" — [[source-name|display-name]]

Rules:
- Quotes must be VERBATIM — never paraphrase, summarize, or translate away the original.
- The source wiki-link is required so future page merges can trace each quote to its origin.
- Multiple quotes from the same source go in the same block, separated by newlines.

### Content Rules
- mentions_in_source MUST be VERBATIM quotes — never paraphrase or translate.
- Summaries/descriptions should use the wiki output language.
- Entity/concept names must match the source file's original language exactly.
- All pages must include bidirectional links where relevant.

### Multi-Source Merge Rules
- Sources array: Append new sources, never overwrite.
- Aliases: Append alternative names (translations, abbreviations) without overwriting existing ones.
- reviewed flag: If true, preserve all existing content, only append genuinely new info.
- Contradictions: Preserve both sides with attribution, add to ## Contradictions section.
- NO_NEW_CONTENT: Return this signal if source adds nothing new.

### Maintenance Policies
- Stale threshold: 90 days without updates.
- Contradiction severity: warning, conflict, error.
- Orphan page: no inbound links from other wiki pages.
- Missing page: referenced by [[link]] but does not exist.

## Update Policy

When contradictory new information appears:
1. Check dates — newer sources take precedence.
2. Record both positions with date and source.
3. Set `contradictions: [other-page]` in frontmatter.
4. Flag for review.
