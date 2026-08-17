# LLM Wiki — Schema

Build and maintain a persistent, compounding knowledge base as interlinked markdown files under `09-wiki/`. Based on [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

Unlike traditional RAG (which rediscovers knowledge from scratch per query), the wiki compiles knowledge once and keeps it current. Cross-references are already there. Contradictions have already been flagged. Synthesis reflects everything ingested.

**Division of labor:** The human curates sources in `00-Kontext/` through `06-Archiv/` and directs analysis. The agent summarizes, cross-references, files in `09-wiki/`, and maintains consistency.

## When This Schema Activates

This schema governs agent behavior whenever:
- A new session starts and `09-wiki/` exists
- The user asks to ingest, add, or process a source into the wiki
- The user asks a question that should be answered from compiled wiki knowledge
- The user asks to lint, audit, or health-check `09-wiki/`
- The user references their wiki, knowledge base, or notes

## Wiki Location

**Location:** `{wiki-root}/09-wiki/` — always within the existing wiki root.

```
WIKI_LLM="{wiki-root}/09-wiki"
```

The wiki is just a directory of markdown files — open it in VS Code or any editor. No database, no special tooling required.

## Architecture: Three Layers

```
{wiki-root}/
├── 00-Kontext/              ← Layer 1 (RAW): immutable source material
├── 01-Inbox/                ← Layer 1 (brain dumps, sorted to target folders before ingest)
├── 02-Projekte/             ← Layer 1
├── 03-Bereiche/             ← Layer 1
├── 04-Ressourcen/           ← Layer 1
├── 05-Daily-Notes/          ← Layer 1
├── 06-Archiv/               ← Layer 1
├── 10-{Domain}/             ← Layer 1: domain glossaries
├── AGENTS.md                ← Layer 1: root schema
├── index.md                 ← Layer 1: root content catalog
├── log.md                   ← Layer 1: root action log
└── 09-wiki/                 ← Layer 2: compiled knowledge
    ├── SCHEMA.md            ← Layer 3: this file
    ├── index.md             ← Compiled catalog of 09-wiki/ pages
    ├── log.md               ← Chronological action log for 09-wiki/
    ├── entities/            ← Entity pages (people, orgs, products, models)
    ├── concepts/            ← Concept/topic pages
    ├── comparisons/         ← Side-by-side analyses
    └── queries/             ← Filed query results worth keeping
```

**Layer 1 — Raw Sources:** `../02-Projekte/` through `../06-Archiv/` plus `../10-*/` (domain folders), `../AGENTS.md`, `../index.md`, `../log.md`.  
**Excluded from ingest:** `../00-Kontext/` (agent context only) and `../01-Inbox/` (HITL sorts items to target folders before ingest).  
Semantic content is immutable — the agent never rewrites body text. Metadata markers (`wiki_refs`, `last_ingested`) may be appended to frontmatter by the ingest workflow. File moves only with HITL approval.

**Layer 2 — The Wiki:** `./` (i.e. `09-wiki/`). Agent-owned markdown files. Created, updated, and cross-referenced by the agent. Every page belongs to one of the subdirectories above.

**Layer 3 — The Schema:** `./SCHEMA.md` (this file). Defines structure, conventions, and tag taxonomy for Layer 2.

### Layer-1 Source Mapping

| Layer-1 Path | Contains | Best suited for |
|---|---|---|
| `../02-Projekte/` | Active project files | Concept pages, comparisons |
| `../03-Bereiche/` | Ongoing responsibility areas | Concept pages |
| `../04-Ressourcen/` | Reference material, links | Entity and concept pages |
| `../05-Daily-Notes/` | Daily log entries | Events, decisions, temporal data |
| `../06-Archiv/` | Superseded content | Mark as historical; do not re-compile |
| `../10-{Domain}/*` | All domain docs (glossary + others) | Concept and entity pages |
| `../00-Kontext/` | Team profiles — **not ingested** | Agent context only |
| `../01-Inbox/` | Brain dumps — **not ingested** | HITL sorts to target folders |

## Domain Glossaries vs. Compiled Wiki

Glossaries and documents in `10-{Domain}/` are manually curated, authoritative sources.
`09-wiki/concepts/` and `09-wiki/entities/` are the automatically compiled knowledge base from all Layer-1 sources.

- **A domain is one source among many** — the wiki pulls all files from `10-{Domain}/*` like any other Layer-1 file
- **On conflict between wiki and domain:** the wiki sets `contested: true` + `contradictions: [../10-{Domain}/file.md]` and flags it for review
- **No automatic sync back** — the domain stays user-curated
- **After a manual change:** the user (or the agent while sorting) sets `updated` → the agent detects the change at the next ingest and re-ingests
- **Inbox documents are sorted first** (e.g. into `10-{Domain}/` or `02-Projekte/`), then ingested by the wiki

## Resuming the Wiki (CRITICAL — do this every session)

When starting a new session with an existing wiki, **always orient yourself before doing anything:**

```
① read_file "{wiki-root}/AGENTS.md"                    # root conventions
② read_file "{wiki-root}/09-wiki/SCHEMA.md"            # 09-wiki/ conventions (this file)
③ read_file "{wiki-root}/09-wiki/index.md"             # existing catalog
④ read_file "{wiki-root}/09-wiki/log.md" offset=<last 30>  # recent activity
```

Only after orientation should you ingest, query, or lint. This prevents:
- Creating duplicate pages for entities that already exist
- Missing cross-references to existing content
- Contradicting the schema's conventions
- Repeating work already logged

For large wikis (100+ pages), also run a quick `search_files` for the topic at hand before creating anything new.

## Initializing `09-wiki/`

**This is not done by the agent.** The `setup-wiki` skill creates the directory structure, SCHEMA.md, index.md, and log.md. The agent's job starts after initialization — see `setup-wiki` for the scaffolding workflow.

## Conventions

- **File names:** lowercase, hyphens, no spaces, no umlauts (e.g., `transformer-architecture.md`)
- **Every wiki page** starts with YAML frontmatter (see below)
- **Use `[[wikilinks]]`** to link between pages — minimum 2 outbound links per page
- **Bidirectional links:** When you create or update a page, check that pages linking to it also link back
- **On update:** Always bump the `updated` date in frontmatter
- **Index:** Every new page must be added to `index.md` under the correct section
- **Log:** Every action must be appended to `log.md`
- **Layer-1 provenance:** When synthesizing from Layer-1 sources, cite the source path in frontmatter `sources:` field (e.g., `sources: [../02-Projekte/foo.md, ../04-Ressourcen/bar.md]`)
- **Provenance markers:** On pages that synthesize 3+ sources, append `^[../02-Projekte/source-file.md]` at the end of paragraphs whose claims come from a specific source. This lets a reader trace each claim back without re-reading the whole Layer-1 file. Optional on single-source pages where the `sources:` frontmatter is enough.
- **Source markers:** After ingesting a Layer-1 source into `09-wiki/`, write `wiki_refs:` and `last_ingested:` into the source file's frontmatter. This marks it as processed and enables change-detection on re-ingest.

### Frontmatter

#### Wiki pages (entities, concepts, comparisons, queries)

```yaml
---
title: Page Title
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: entity | concept | comparison | query | summary
tags: [from taxonomy below]
sources: [../02-Projekte/source-file.md, ../04-Ressourcen/another-source.md]
# Optional quality signals:
confidence: high | medium | low        # how well-supported the claims are
contested: true                        # set when the page has unresolved contradictions
contradictions: [other-page-slug]      # pages this one conflicts with
---
```

`confidence` and `contested` are optional but recommended for opinion-heavy or fast-moving topics. Lint surfaces `contested: true` and `confidence: low` pages for review so weak claims don't silently harden into accepted wiki fact.

#### Layer-1 source files (inbox, domains, projects, etc.)

```yaml
---
# Existing frontmatter from AGENTS.md (title, created, updated, ...)
# After ingestion by 09-wiki/, the agent adds:
wiki_refs: [09-wiki/entities/domain, 09-wiki/concepts/delegation]
last_ingested: YYYY-MM-DD
---
```

`wiki_refs:` lists all `09-wiki/` pages that were created or updated from this source. `last_ingested:` is the ISO date of the most recent ingest. The agent sets both after each ingest. On subsequent reads: if `updated <= last_ingested`, skip (no changes). If `updated > last_ingested`, re-ingest.

### Provenance markers — detail

On pages with 3+ sources, append a marker after specific paragraphs:

```
Some claim that comes from a specific source.^[../02-Projekte/project-x.md]

Another claim from a different source.^[../04-Ressourcen/research-paper.md]
```

This is **optional** — use it when precision matters (technical claims, controversial topics). Single-source pages can rely on the `sources:` frontmatter alone.

## Tag Taxonomy

Tags are inherited from the root `AGENTS.md` taxonomy. All tags used on `09-wiki/` pages must appear in the taxonomy below. Add new tags here BEFORE using them.

### Message Status
- `done` — curated message
- `draft` — still pending, but not actively in progress
- `received` — received message, but not curated
- `sent` — message was sent

### Domain
- `{domain-tag-1}` — placeholder for the wiki's first domain
- `{domain-tag-2}` — placeholder for the wiki's second domain
- `multi-agent` — Agent communication and delegation
- `compliance` — Legal and regulatory requirements

### Technology
- `llm` — Large Language Models general
- `inference` — Model inference, quantization, hardware
- `hardware` — Server, GPU, appliance
- `cloud` — Cloud connectivity, hybrid operation
- `protocol` — Communication protocols

### Workflow
- `workflow` — Process definitions
- `skill` — Agent skills
- `kanban` — Task management
- `hitl` — Human-in-the-Loop
- `scrum` — Scrum workflows

### Application
- `use-case` — Scenarios and use cases
- `social-media` — Social media workflows
- `email` — Email-based workflows

### Meta
- `meta` — Wiki infrastructure
- `schema` — Schema file
- `entity` — Entity page
- `concept` — Concept page
- `comparison` — Comparison page
- `query` — Query result page
- `email` — This page is an email message either incoming or outgoing
- `post` — This page is a social media message

**Rule:** every tag on a page must appear in this taxonomy. If a new tag is needed, add it here first, then use it. This prevents tag sprawl.

## Page Thresholds

- **Create a page** when an entity/concept appears in 2+ Layer-1 sources OR is central to one source
- **Add to existing page** when a source mentions something already covered
- **DON'T create a page** for passing mentions, minor details, or things outside the domain
- **Split a page** when it exceeds ~200 lines — break into sub-topics with cross-links
- **Archive a page** when its content is fully superseded — move to `_archive/`, remove from index

## Entity Pages

One page per notable entity. Located in `entities/`. Include:
- Overview / what it is
- Key facts and dates
- Relationships to other entities ([[wikilinks]])
- Source references (Layer-1 paths in `sources:` frontmatter)

## Concept Pages

One page per concept or topic. Located in `concepts/`. Include:
- Definition / explanation
- Current state of knowledge
- Open questions or debates
- Related concepts ([[wikilinks]])

## Comparison Pages

Side-by-side analyses. Located in `comparisons/`. Include:
- What is being compared and why
- Dimensions of comparison (table format preferred)
- Verdict or synthesis
- Sources

## Update Policy

When new information conflicts with existing content:

1. **Check the dates** — newer sources generally supersede older ones
2. **If genuinely contradictory**, note both positions with dates and sources
3. **Mark the contradiction** in frontmatter: `contradictions: [page-name]`
4. **Flag for user review** in the lint report
5. **Track in contradiction file** — append or update the entry in `../01-Inbox/contradictions.md` (see Contradiction File below)

### Contradiction File

All active contradictions are tracked in `../01-Inbox/contradictions.md` for manual HITL resolution.

**Format:**
```markdown
# Contradictions

- [[09-wiki/page-a]] vs [[09-wiki/page-b]] — brief description (since YYYY-MM-DD)
```

**Lifecycle:**
- **Detected:** When a contradiction is flagged during ingest (see Update Policy) or lint, append or update the entry in `../01-Inbox/contradictions.md`.
- **Resolved:** When the wiki pages no longer conflict, remove the corresponding entry from `../01-Inbox/contradictions.md`. If the file becomes empty, write `*(No active contradictions.)*`.

The file is created automatically on first use. The agent never ingests this file (it lives in the excluded `01-Inbox/` directory).

## Core Operations

### 1. Ingest

When the user provides a source from Layer 1 (e.g., "ingest `02-Projekte/foo.md`" or "ingest a new project file"), integrate it into `09-wiki/`.

**⓪ Verify source scope:**
- Only ingest from `../02-Projekte/`, `../03-Bereiche/`, `../04-Ressourcen/`, `../05-Daily-Notes/`, `../06-Archiv/`, and `../10-{Domain}/`.
- Sources in `../00-Kontext/` and `../01-Inbox/` are **excluded** — if the user requests them, explain: "`00-Kontext/` and `01-Inbox/` are not ingested. Please sort the item to a target folder first."

**① Capture the raw source:**
- Read the file from its Layer-1 path: `read_file "../02-Projekte/foo.md"`
- Note the frontmatter: date, tags, type, **`wiki_refs`**, **`last_ingested`**, **`updated`**
- **Change-detection:** Check if the file has been processed before:
  - `wiki_refs` exists **AND** `updated <= last_ingested` → **SKIP** (no changes since last ingest).
  - `wiki_refs` exists **AND** `updated > last_ingested` → **re-ingest** (source was modified).
  - `wiki_refs` does not exist → **new source**, full ingest.
- Report skip/re-ingest/new to the user.

**② Discuss takeaways** with the user — what's interesting, what matters for the domain. (Skip this in automated/batch contexts — proceed directly.)

**③ Check what already exists** — search `index.md` and use `search_files` to find existing pages for mentioned entities/concepts. This is the difference between a growing wiki and a pile of duplicates.

**④ Write or update wiki pages:**
- **New entities/concepts:** Create pages only if they meet the Page Thresholds (2+ source mentions, or central to one source)
- **Existing pages:** Add new information, update facts, bump `updated` date. When new info contradicts existing content, follow the Update Policy.
- **Cross-reference:** Every new or updated page must link to at least 2 other pages via `[[wikilinks]]`. Check that existing pages link back.
- **Tags:** Only use tags from the taxonomy in this SCHEMA.md
- **Provenance:** On pages synthesizing 3+ sources, append `^[../02-Projekte/source.md]` markers to paragraphs whose claims trace to a specific source.
- **Confidence:** For opinion-heavy, fast-moving, or single-source claims, set `confidence: medium` or `low` in frontmatter. Don't mark `high` unless the claim is well-supported across multiple sources.

**⑤ Update navigation + source markers:**
- Add new pages to `index.md` under the correct section, alphabetically
- Update the "Total pages" count and "Last updated" date in index header
- Append to `log.md`: `## [YYYY-MM-DD] ingest | Source Title`
- **Write source markers** into the Layer-1 source file's frontmatter:
  ```yaml
  wiki_refs: [09-wiki/entities/foo, 09-wiki/concepts/bar]
  last_ingested: YYYY-MM-DD
  ```
  - `wiki_refs` lists every `09-wiki/` page created or updated from this source
  - `last_ingested` is today's ISO date
  - Append to existing `wiki_refs` if the source was already partially ingested (avoid duplicates)

**⑥ Report what changed** — list every file created or updated to the user.

A single source can trigger updates across 5-15 wiki pages. This is normal and desired — it's the compounding effect.

### 2. Query

When the user asks a question about the wiki's domain:

① **Read `index.md`** to identify relevant pages.
② **For wikis with 100+ pages**, also `search_files` across all `.md` files for key terms — the index alone may miss relevant content.
③ **Read the relevant pages** using `read_file`.
④ **Synthesize an answer** from the compiled knowledge. Cite the wiki pages you drew from: "Based on [[entity-page]] and [[concept-page]]..."
⑤ **File valuable answers back** — if the answer is a substantial comparison, deep dive, or novel synthesis, create a page in `queries/` or `comparisons/`. Don't file trivial lookups — only answers that would be painful to re-derive.
⑥ **Update log.md** with the query and whether it was filed.

### 3. Lint

When the user asks to lint, health-check, or audit `09-wiki/`:

① **Orphan pages:** Find pages with no inbound `[[wikilinks]]` from other pages within `09-wiki/`.

Use programmatic scan across all `09-wiki/` pages:
```python
import os, re
from collections import defaultdict

wiki = "{wiki-root}/09-wiki"
pages = []
for root, dirs, files in os.walk(wiki):
    if "_archive" in root or root == wiki:
        continue
    for f in files:
        if f.endswith(".md") and f != "SCHEMA.md" and f != "index.md" and f != "log.md":
            pages.append(os.path.join(root, f))

inbound = defaultdict(set)
for p in pages:
    with open(p) as fh:
        content = fh.read()
    for m in re.finditer(r'\[\[([^\]]+)\]\]', content):
        target = m.group(1).split("|")[0].strip()
        # resolve relative wikilinks to page paths
        for candidate in pages:
            if target in candidate or target == os.path.splitext(os.path.basename(candidate))[0]:
                inbound[os.path.normpath(candidate)].add(os.path.normpath(p))

orphans = [p for p in pages if not inbound.get(os.path.normpath(p))]
```

② **Broken wikilinks:** Find `[[links]]` that point to pages that don't exist within `09-wiki/`.

③ **Index completeness:** Every wiki page in `09-wiki/` should appear in `09-wiki/index.md`. Compare filesystem against index entries.

④ **Frontmatter validation:** Every wiki page must have all required fields (title, created, updated, type, tags, sources). Tags must be in the taxonomy.

⑤ **Stale content:** Pages whose `updated` date is >90 days older than the most recent Layer-1 source that mentions the same entities.

⑥ **Contradictions:** Pages on the same topic with conflicting claims. Look for pages that share tags/entities but state different facts. Surface all pages with `contested: true` or `contradictions:` frontmatter for user review. For each contradiction found, append or update the entry in `../01-Inbox/contradictions.md`. When a previously flagged contradiction no longer exists, remove its entry from that file. If the file becomes empty, write `*(No active contradictions.)*`.

⑦ **Quality signals:** List pages with `confidence: low` and any page that cites only a single source but has no confidence field set — these are candidates for either finding corroboration or demoting to `confidence: medium`.

⑧ **Page size:** Flag pages over 200 lines — candidates for splitting.

⑨ **Tag audit:** List all tags in use, flag any not in the SCHEMA.md taxonomy.

⑩ **Log rotation:** If `log.md` exceeds 500 entries, rotate it: rename to `log-YYYY.md`, start fresh.

⑪ **Report findings** with specific file paths and suggested actions, grouped by severity (broken links > orphans > source drift > contested pages > stale content > style issues).

⑫ **Append to log.md:** `## [YYYY-MM-DD] lint | N issues found`

## Working with the Wiki

### Searching

```
# Find pages by content
search_files "transformer" path="{wiki-root}/09-wiki/" file_glob="*.md"

# Find pages by filename
search_files "*.md" target="files" path="{wiki-root}/09-wiki/"

# Find pages by tag
search_files "tags:.*domain" path="{wiki-root}/09-wiki/" file_glob="*.md"

# Recent activity
read_file "{wiki-root}/09-wiki/log.md" offset=<last 20 lines>
```

### Bulk Ingest

When ingesting multiple Layer-1 sources at once, batch the updates:

1. Read all sources first
2. Identify all entities and concepts across all sources
3. Check existing pages for all of them (one search pass, not N)
4. Create/update pages in one pass (avoids redundant updates)
5. Update `index.md` once at the end
6. Write a single log entry covering the batch

### Archiving

When content is fully superseded or the domain scope changes:

1. Create `_archive/` directory if it doesn't exist
2. Move the page to `_archive/` with its original subdirectory (e.g., `_archive/entities/old-page.md`)
3. Remove from `index.md`
4. Update any pages that linked to it — replace wikilink with plain text + "(archived)"
5. Log the archive action

## Pitfalls

- **Never change semantic content of Layer-1 files** (`../00-Kontext/` through `../06-Archiv/`, `../10-*/`) — sources are immutable. Corrections go in `09-wiki/` pages.
  - **Allowed:** append `wiki_refs`/`last_ingested` to frontmatter (ingest markers, not a semantic change)
  - **Allowed (with HITL question):** move files (e.g. `01-Inbox/` → `10-{Domain}/` or migrate an old structure)
  - **Never allowed:** change, delete, or rewrite the text/body of a Layer-1 file
- **Always orient first** — read SCHEMA + index + recent log before any operation in a new session. Skipping this causes duplicates and missed cross-references.
- **Always update index.md and log.md** — skipping this makes the wiki degrade. These are the navigational backbone.
- **Don't create pages for passing mentions** — follow the Page Thresholds. A name appearing once in a footnote doesn't warrant an entity page.
- **Don't create pages without cross-references** — isolated pages are invisible. Every page must link to at least 2 other pages.
- **Frontmatter is required** — it enables search, filtering, and staleness detection.
- **Tags must come from the taxonomy** — freeform tags decay into noise. Add new tags here first, then use them.
- **Keep pages scannable** — a wiki page should be readable in 30 seconds. Split pages over 200 lines. Move detailed analysis to dedicated deep-dive pages.
- **Ask before mass-updating** — if an ingest would touch 10+ existing pages, confirm the scope with the user first.
- **Rotate the log** — when log.md exceeds 500 entries, rename it `log-YYYY.md` and start fresh. The agent should check log size during lint.
- **Handle contradictions explicitly** — don't silently overwrite. Note both claims with dates, mark in frontmatter, flag for user review.
- **Watch for circular reasoning** — when creating pages from other `09-wiki/` pages (rather than Layer-1 sources), ensure the chain traces back to a Layer-1 original. Don't create pages that only cite other compiled pages.
