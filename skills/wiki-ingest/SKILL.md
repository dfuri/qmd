---
name: wiki-ingest
description: Ingest one, several, or all Layer-1 sources of an LLM wiki into 09-wiki/. Manually triggered by the HITL, with change-detection via `last_ingested`/`updated`. Use when the HITL asks to ingest, add, or process wiki source files, wants to run a manual ingest, or says "ingest", "wiki-ingest", "re-ingest", "process into the wiki". Not auto-invoked by the model.
disable-model-invocation: true
license: MIT
compatibility: Requires the qmd CLI (or the qmd MCP server). Install qmd via `npm install -g @tobilu/qmd`.
metadata:
  author: qmd
  version: "1.0.0"
---

# Wiki Ingest

<what-to-do>

YOU execute this workflow. Ingest one, several, or all Layer-1 wiki sources into `09-wiki/` following `09-wiki/SCHEMA.md`. This is the manual counterpart to an automated ingest — it lets the HITL trigger an ingest on demand.

The wiki path is resolved from context (see "Resolving the wiki path" in the supporting-info). If no path can be determined → abort with "Wiki path not found."

This skill performs the **LLM synthesis** (compiling knowledge into `09-wiki/` pages). It does not ship its own scripts — the change-detection and scope logic below is executed directly by the agent, reusing the same rules as `09-wiki/SCHEMA.md`.

## 0. Orient yourself (every session)

Before anything, follow the `09-wiki/SCHEMA.md` "Resuming the Wiki" ritual:

1. Read `{wiki}/AGENTS.md`
2. Read `{wiki}/09-wiki/SCHEMA.md`
3. Read `{wiki}/09-wiki/index.md`
4. Read the last ~30 lines of `{wiki}/09-wiki/log.md`

Only after this should you ingest, to avoid duplicate pages, missed cross-references, and contradicting the schema.

## 1. Determine scope

The HITL invokes the skill with an **optional** input:

- **No argument** → run a **preview** over all Layer-1 sources (see scope rules), present the list of files that need work (new / re-ingest), and let the HITL confirm the scope before ingesting. This is the "ask before mass-updating" guard from SCHEMA.md.
- **One or more concrete paths** → ingest those files immediately, without asking.

### Scope of Layer-1 sources

**Included** (ingestable):
- `02-Projekte/`, `03-Bereiche/`, `04-Ressourcen/`, `05-Daily-Notes/`, `06-Archiv/`, `10-{Domain}/`

**Excluded** (never ingested):
- `00-Kontext/` — team profiles, agent context only
- `01-Inbox/` — HITL sorts to target folders first
- System/technical folders & files: `.git/`, `.obsidian/`, `Excalidraw/`, `raw/`, `.qmd/`, `09-wiki/` (agent-owned), plus root files `index.md`, `log.md`, `graph.json`, `AGENTS.md`

> **Note:** `06-Archiv/` is included — archived sources are re-compiled (marked historical). `05-Daily-Notes/` is included.

If the HITL requests a path in an excluded folder (`00-Kontext/`, `01-Inbox/`), explain: "`00-Kontext/` and `01-Inbox/` are not ingested. Please sort the item to a target folder first."

## 2. Change-detection per file

For each candidate source file, read its frontmatter and apply the SCHEMA.md rules:

- `wiki_refs` does **not** exist → **new** source → full ingest
- `wiki_refs` exists **and** `updated <= last_ingested` → **skip** (no changes)
- `wiki_refs` exists **and** `updated > last_ingested` → **re-ingest** (modified)
- No `updated` frontmatter → fall back to file mtime

Report the skip/re-ingest/new status to the HITL.

## 3. Ingest workflow

Follow `09-wiki/SCHEMA.md` §1 (Ingest) and the "Bulk Ingest" batching rules:

1. **Read the sources** — read each file from its Layer-1 path; note frontmatter (`updated`, `tags`, `type`, `wiki_refs`, `last_ingested`).
2. **Discuss takeaways** — for a single file, briefly discuss what's interesting for the domain. Skip this in batch/preview mode and proceed directly.
3. **Check what exists** — search `09-wiki/index.md` and use `search_files` for entities/concepts before creating anything (avoids duplicates).
4. **Write or update wiki pages**:
   - New entities/concepts → create only if they meet the Page Thresholds (2+ source mentions, or central to one source).
   - Existing pages → add new info, update facts, bump `updated`.
   - Cross-reference: every page links to at least 2 other pages; check back-links.
   - Tags: only from the SCHEMA.md taxonomy.
   - Provenance: on 3+ source pages, append `^[../path/source.md]` markers; `sources:` frontmatter cites Layer-1 paths.
   - Confidence: set `medium`/`low` for opinion-heavy or single-source claims.
5. **Update navigation + source markers**:
   - Add new pages to `09-wiki/index.md` (correct section, alphabetical); update totals/date in header.
   - Append to `09-wiki/log.md`: `## [YYYY-MM-DD] ingest | Source Title` (one entry per batch).
   - Write source markers into each Layer-1 source file's frontmatter:
     ```yaml
     wiki_refs: [09-wiki/entities/foo, 09-wiki/concepts/bar]
     last_ingested: YYYY-MM-DD
     ```
     Append to existing `wiki_refs` (avoid duplicates). **Never** change the source's `updated` date.
6. **Report** — list every file created or updated.

## 4. Git commit/push (ask the HITL)

At the end, **ask the HITL** whether to commit and push the wiki changes. Do not commit automatically — the HITL decides for a manual run.

---

</what-to-do>

<supporting-info>

## Resolving the wiki path

Do not rely on environment variables. Resolve the wiki root from context, in this order:

1. If the repo has a `docs/agents/llm-wiki.md`, read it for the wiki path.
2. If the target path was already established in the current session (e.g. the user named it), use that.
3. Otherwise, ask the HITL for the wiki root path.

## Reference

- `09-wiki/SCHEMA.md` — authoritative schema: Ingest, Bulk Ingest, Update Policy, Page Thresholds, taxonomy.
- `setup-wiki` skill — scaffolds the vault, SCHEMA.md, and conventions that this skill operates on.
- `wiki-search` skill — the complementary read-side funnel.

## Conventions

- Main language is English; technical terms stay as-is.
- Never modify Layer-1 source bodies — sources are semantically immutable. Only the `wiki_refs`/`last_ingested` markers in frontmatter are set by the ingest.
- Always update `09-wiki/index.md` and `09-wiki/log.md` — they are the navigational backbone.
- `06-Archiv/` is deliberately included for ingest.

</supporting-info>
