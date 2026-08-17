---
name: setup-wiki
description: Scaffold or restructure a complete LLM Wiki vault — AGENTS.md schema, folder structure, format templates, optional Karpathy-style 09-wiki/, and optional initial domain/team content. Use when the HITL wants to start a new wiki or restructure an existing one. Not auto-invoked by the model.
disable-model-invocation: true
license: MIT
compatibility: Requires the qmd CLI (or the qmd MCP server). Install qmd via `npm install -g @tobilu/qmd`.
metadata:
  author: qmd
  version: "1.0.0"
---

# Setup Wiki

<what-to-do>

Scaffold or restructure a wiki vault at a given path.

**Important: setup-wiki creates the folder structure and the schema file (AGENTS.md). It no longer creates a root `log.md`; `index.md` is optional and written by an external process. Existing content files are only moved with explicit HITL approval (see step 3b). Content changes to files never happen.**

### 1. Determine target path

Ask the user for the wiki root path if it is not already clear from context.

After the user provides a path, ask: "Create a new wiki locally or clone an existing one from Git?"
- **Create locally** → continue with the subfolder question below.
- **Clone from Git** → continue with step 1a (Git source).

**Subfolder question (only for "Create locally"):** "Should a subfolder be created for the wiki (e.g. `{path}/my-wiki/`) or is `{path}` already the wiki root?"
- **Subfolder** → `{wiki-root} = {path}/{name}`. Ask for the name.
- **Already the root** → `{wiki-root} = {path}`. No additional folder.

### 1a. Git source (only for "Clone from Git")

**① Registry options:**
Ask: "From which Git registry should the wiki be loaded?"
- **GitHub** → ask for the repo URL (e.g. `https://github.com/user/repo.git` or `git@github.com:user/repo.git`).
- **GitLab** → ask for the repo URL.
- **Other** → ask for the repo URL directly (any Git registry).

The URL is used as-is — no URL rewriting. Both HTTPS and SSH formats are valid.

**② Check for an MCP server:**
Check whether a suitable MCP server (GitHub/GitLab) is available. The agent detects this itself from its environment (the one the skill runs on).
- **MCP server available** → use its tools for cloning/auth.
- **No MCP server** → fall back to `git clone`.

**③ Check the clone target:**
Before cloning, check whether `{path}` exists and is non-empty:
- **Exists and non-empty** → warn the HITL and ask whether to clone into a subfolder or whether the folder may be emptied.
- **Does not exist or is empty** → clone directly.

**④ Clone:**
Run `git clone <url> <target>`. On failure (e.g. auth), pass the error message to the user — they can then provide an SSH key/token themselves.

After cloning, `{wiki-root} = <target>`. Then continue normally with step 1b (Inventory scan) and the interview — the cloned folder does not start empty, and the interview questions check which folders are missing.

### 1b. Inventory scan

After the path is finalized, scan `{wiki-root}` and show what already exists:

```
ls "{wiki-root}/"
```

Report to the user: "Found in `{wiki-root}`: [list of existing folders/files]". This inventory feeds into all subsequent questions — skipped folders are never re-created.

### 2. Interview phase

Ask one question at a time, waiting for each answer before continuing.

**2a. Wiki type**

Three options:
- **Global Wiki** — for an entire organization/company. `00-Kontext/` contains one subfolder per team. Multiple domains at `10-{Domain}/`.
- **Team Wiki** — scoped to a single team. `00-Kontext/` is the team context. Team-specific domains. A purpose is required.
- **Personal Wiki** — scoped to a team member. `00-Kontext/` is the personal context. No domains. No purpose.

The wiki name is derived from the basename of `{wiki-root}`.

**2b. Folders 01–06**

For each folder, check if it already exists in `{wiki-root}`. Then ask:

- **Exists** → "`{folder}/` already exists. Skip? [Yes/No]" — default Yes.
- **Does not exist** → "Create `{folder}/`? (for: {description}) [Yes/No]"

Folders:
- `01-Inbox/` — Quick thoughts, brain dumps
- `02-Projekte/` — Active projects with goals and end dates
- `03-Bereiche/` — Ongoing areas of responsibility without end date
- `04-Ressourcen/` — Reference material, knowledge
- `05-Daily-Notes/` — Daily logbook
- `06-Archiv/` — Completed projects and inactive areas

Note: `index.md` is optional and written by an external process (only referenced here, never created by the agent). `00-Kontext/` and `00-Kontext/general/` are always created if missing. `log.md` is no longer created.

**2c. Purpose** (Team Wiki only)

Ask: "What is the purpose of this wiki? What does the team use it for?"

### 3. Create vault directory structure

From the interview answers, determine which folders to create. Only `mkdir -p` for folders the user confirmed AND that do not already exist.

If all confirmed folders already exist, report: "All confirmed folders already exist. No changes needed."

```
{wiki-root}/
├── AGENTS.md
├── index.md              (optional — external process, not created by setup-wiki)
├── 00-Kontext/
│   └── general/        # TEAM-FORMAT.md, DOMAIN-FORMAT.md
├── 01-Inbox/            # (if confirmed)
├── 02-Projekte/         # (if confirmed)
├── 03-Bereiche/         # (if confirmed)
├── 04-Ressourcen/       # (if confirmed)
├── 05-Daily-Notes/      # (if confirmed)
└── 06-Archiv/           # (if confirmed)
```

Note: The LLM Wiki (`09-wiki/`) is optional and created separately in step 7b–7f.

For **Global Wiki**: also create `00-Kontext/teams/`. Domain folders (`10-{Domain}/`) are created per domain — see step 8.

Run `mkdir -p` for each directory. Never overwrite existing directories.

### 3b. Migration checks (for existing wikis — always with HITL question)

Before writing any files, check for old naming conventions and structural differences. Each migration step requires explicit HITL approval.

**① Old naming `00 Kontext` (with space):**
Check if `{wiki-root}/00 Kontext/` exists:
- **Yes** → Ask HITL: "Old naming convention detected (`00 Kontext/` instead of `00-Kontext/`). Should I migrate? (`mv "00 Kontext" 00-Kontext`)"
  - **Yes** → Execute.
  - **No** → Skip.

**② Old domain location `00-Kontext/domains/`:**
Check if `00-Kontext/domains/` (or `00 Kontext/domains/`) exists inside `{wiki-root}`:
- **Yes** → Ask HITL: "Old domain structure detected (domains under `00-Kontext/domains/`). Should I migrate each domain into its own `10-{Domain}/` folder?"
  - **Yes** → For each file in `00-Kontext/domains/`:
    1. Derive the domain name from the filename
    2. `mkdir -p "10-{DomainName}"`
    3. `mv "00-Kontext/domains/{file}" "10-{DomainName}/"`
  - After migration: `rmdir 00-Kontext/domains/` (if empty)
  - **No** → Skip.

**③ Old `raw/` folder:**
Check if `{wiki-root}/raw/` exists:
- **Yes** → Ask HITL: "`raw/` folder found (does not exist in the new structure). Should I move its contents into `04-Ressourcen/`?"
  - **Yes** → `mv {wiki-root}/raw/* {wiki-root}/04-Ressourcen/` + `rmdir {wiki-root}/raw/`
  - **No** → Skip.

After migration, no `log.md` entry is written (logs are no longer maintained).

### 4. Write AGENTS.md

Check if `{wiki-root}/AGENTS.md` already exists.

**Case A — New wiki** (does not exist):
1. Customize [seed-agents.md](./seed-agents.md) based on interview answers:
   - **Vault Structure**: Remove or adapt sections for folders the user did not confirm. For Personal Wiki, remove domain references. For Global Wiki, add the teams/ and `10-{Domain}/` descriptions.
   - **Wiki name**: Derive from the basename of `{wiki-root}` and replace it in the seed.
   - **Purpose** (Team Wiki): Add a `## Purpose` section with the user's answer.
   - **Domain tags**: Replace `{domain-tag-1}`, `{domain-tag-2}` with actual domain names if known, otherwise leave as placeholders.
   - **Todo/Message lifecycle**: The template includes detection rules and session routines for `todo` and `message` frontmatter properties. No additional customization needed.
   - **Date fields**: Replace `{CREATED_DATE}` with the current ISO date.
2. Write the full customized template to `{wiki-root}/AGENTS.md`.

**Case B — Existing wiki** (already exists):
1. Read the existing `{wiki-root}/AGENTS.md` — read it fully, including frontmatter.
2. Customize [seed-agents.md](./seed-agents.md) with the same customizations as Case A — **this is the template for new sections**. The customization steps apply only to sections added later.
3. **Section-Merge Algorithm:**
   - Extract all `##` headers from the existing file (e.g. `## Vault Structure`, `## Vault Rules`, `## Frontmatter`).
   - Go through each `##` section in the customized seed.
   - If the `##` header is **not present** in the existing file → append the section (header + entire content up to the next `##` or end of file) **at the end** of the existing file (before the final newline).
   - If the `##` header **already exists** → **SKIP** (never overwrite, never modify).
4. **Frontmatter**: Only set the `updated` date to today. Leave all other frontmatter fields unchanged.
5. **Write** the merged file back to `{wiki-root}/AGENTS.md`.
6. **Report**: "AGENTS.md merged — N new sections added, 0 existing changed."

Important: **Never** change, adapt, reorder, or delete existing sections. Even if the seed is structured differently. The existing file is authoritative for what is already there.

### 5. index.md (optional — external process)

`index.md` is **not** created by `setup-wiki`. It is written by an external process and can be referenced in the AGENTS.md. If the HITL explicitly requests it, `setup-wiki` may create an empty `index.md` from [seed-index.md](./seed-index.md) (sections: Entities, Concepts, Comparisons, Queries, Meta, each `*(No pages yet.)*`), otherwise it is skipped.

### 6. Write log.md

**Dropped.** No `log.md` is created and no log is written.

### 7. Write general format templates

**Case A — New wiki** (files do not exist):
Copy from the skill's seed files:

- `00-Kontext/general/TEAM-FORMAT.md` ← `seed-team-format.md`
- `00-Kontext/general/DOMAIN-FORMAT.md` ← `seed-domain-format.md`

**Case B — Existing wiki** (files already exist):
- Skip — never overwrite existing format templates.
- Report: "TEAM-FORMAT.md and DOMAIN-FORMAT.md already exist, skipped."

For Personal Wiki, always skip `DOMAIN-FORMAT.md` (no domains).

### 7b. Offer LLM Wiki (Karpathy-style)

Ask the user: "Should an LLM Wiki (Karpathy-style) be created under `09-wiki/`? It compiles knowledge from the folders `00-Kontext/` through `06-Archiv/` into a searchable, linked knowledge base with Entities, Concepts and Comparisons."

**Idempotency:** If `{wiki-root}/09-wiki/` already exists:
- Ask: "09-wiki/ already exists. Re-initialize? (SCHEMA.md, index.md and log.md will be replaced. Existing pages in entities/, concepts/, comparisons/, queries/ are kept.)"
- **Yes** → soft reset: overwrite SCHEMA.md, index.md, log.md; keep subdirectories and pages
- **No** → skip all 09-wiki/ steps (7c–7f)

If the user declines: skip 7c–7f and continue with step 8.

### 7c. Create 09-wiki/ directory structure

```
{wiki-root}/09-wiki/
├── SCHEMA.md
├── index.md
├── log.md
├── entities/
├── concepts/
├── comparisons/
└── queries/
```

Run `mkdir -p` for each subdirectory.

### 7d. Write 09-wiki/SCHEMA.md

Use [seed-llm-wiki-schema.md](./seed-llm-wiki-schema.md). Customize:
- Replace `{wiki-root}` with the actual absolute wiki root path
- Replace `{CREATED_DATE}` with the current ISO date

This file is the single source of truth for all agent behavior in `09-wiki/`. It defines Layer 1 (00–06 as immutable sources), Layer 2 (09-wiki/ as compiled pages), tag taxonomy, frontmatter schema, page thresholds, and all core operations (ingest, query, lint).

### 7e. Write 09-wiki/index.md

Use [seed-llm-wiki-index.md](./seed-llm-wiki-index.md). Replace `{CREATED_DATE}` with the current ISO date.

### 7f. Write 09-wiki/log.md

Use [seed-llm-wiki-log.md](./seed-llm-wiki-log.md). Replace `{CREATED_DATE}` with the current ISO date.

### 8. Offer initial content

Ask the user whether to create initial pages, contextualized by wiki type:

- **Global/Team Wiki**: Domain context — `10-{Domain}/{domain}-context.md`. Ask: "What is the domain name?" (e.g. `Acme` → folder `10-Acme/`, file `acme-context.md`)
- **Global Wiki**: Team profiles — `00-Kontext/teams/{team-name}/{team-name}-profile.md`
- **Personal Wiki**: Personal profile — `00-Kontext/{member-name}-profile.md`

If yes, scaffold each from the respective format template filled with placeholder sections.

### 9. Update repo AGENTS.md

If the repo has an `## Agent skills` block in AGENTS.md/CLAUDE.md, add or update a line:

```
### LLM Wiki

Repository-wiki at `docs/wiki/`. See `docs/agents/llm-wiki.md`.
```

Create `docs/agents/llm-wiki.md` if it does not exist (see [seed-llm-wiki.md](./seed-llm-wiki.md)).

### 10. LLM Wiki initial ingest

**Only if 09-wiki/ was created in step 7c.**

After the user confirms initial content (step 8) and repo updates (step 9), populate `09-wiki/` by scanning existing Layer-1 sources.

**Flow: Each phase is completed entirely (scan → write pages → set markers), then the next phase.**

**Idempotency:** For each source file, check frontmatter for `wiki_refs` + `last_ingested`. If both exist and `updated <= last_ingested` → skip. Else ingest.

**Page Thresholds:**
- Create page if entity/concept appears in 2+ sources OR is central to one source
- Extend existing page if a source adds relevant info (append sources, update content)
- Skip fleeting mentions, very short files (<5 substantive lines), pure TODO lists
- Group related projects under a parent concept

---

**① Customize 09-wiki/SCHEMA.md:**
Replace ALL placeholders:
- `{wiki-root}` → absolute path of the wiki root (e.g. `/home/user/wiki/my-wiki`)
- `{CREATED_DATE}` → today's date (ISO 8601, e.g. `2026-08-17`)
- Verify after replacement: `grep -c '{wiki-root}\|{CREATED_DATE}' 09-wiki/SCHEMA.md` must be 0.

**② Scan domain glossaries (`10-{Domain}/*.md`):**
For each domain file:
- Create entity page for the main domain concept (e.g. `10-Acme/acme-context.md` → `entities/acme.md`)
- Extract glossary terms — create entity/concept pages for terms central to the domain
- Write `wiki_refs` + `last_ingested` in source file frontmatter (use Python/YAML insertion, not sed)

**③ Scan projects (`02-Projekte/`):**

For each project file:
- **Single agent-type projects** → extend the parent concept page instead of creating one page per project. Add to Sources array, add description under the existing list.
- **Standalone architectural projects** → create dedicated concept page.
- **Infrastructure projects** → create concept page.
- **Pure TODO files** with no specification content → skip.
- Write source markers for ALL processed files.

**④ Scan resources (`04-Ressourcen/`):**
- Customer records (`customer/*.md`) → entity page per customer
- Reference material → concept page if substantive enough to meet Page Thresholds
- Write source markers

**⑤ Scan areas (`03-Bereiche/`):**
For each area file:
- Create concept page if content is substantial (>5 lines of meaningful content)
- Very short files → skip
- Write source markers

**⑥ Scan daily notes (`05-Daily-Notes/`):**
- DO NOT create pages per Daily Note. Instead, extract architectural decisions, component descriptions, and key events.
- Only create concept/entity pages for topics that appear across 2+ notes OR are central to one note.
- Write source markers in processed notes.

**⑦ Write source markers — detail:**
For each processed source file, add to frontmatter (before closing `---`):

```yaml
wiki_refs:
  - 09-wiki/entities/page-name
  - 09-wiki/concepts/page-name
last_ingested: YYYY-MM-DD
```

- Use a Python script to find the second `---` and insert before it. **Do not use sed** — sed can produce duplicates for multi-line frontmatter values (lists).
- `wiki_refs` lists all `09-wiki/`-pages that were created or extended from this source.
- `last_ingested` is today's ISO date.
- Verify after writing: `grep -c "last_ingested" "$file"` must be 1.

**⑧ Update `09-wiki/index.md`:**
- Update the total pages count
- Add all new pages under Entities/Concepts/Queries/Meta, sorted alphabetically
- Each entry: `- [[slug|Display Name]] — One-line summary`
- Date: `Last updated: YYYY-MM-DD`

**⑨ Append to `09-wiki/log.md`:**
```markdown
## [YYYY-MM-DD] ingest | Initial bulk ingest from Layer 1

- Created N entity pages: slug-1, slug-2, ...
- Created M concept pages: slug-1, slug-2, ...
- Scanned sources: 10-{Domain}/, 02-Projekte/, ...
- wiki_refs/last_ingested written to all processed source files (X total)
```

**⑩ Report to user:**
```
09-wiki/ initial ingest completed:
  - N Entity pages
  - M Concept pages
  - X sources marked with wiki_refs/last_ingested
```

**Avoid:**
- **No duplicates** in `last_ingested` — each source file marked at most once
- **No pages for TODOs** or mini-files <5 lines
- **No pages for individual Daily Notes** — only aggregated concepts
- **No superfluous pages** — prefer extending existing ones over creating new ones

### 11. Confirm

Show the user a summary of what was created:

```
✓ {wiki-root}/AGENTS.md        — schema
✓ {wiki-root}/index.md         — page catalog (optional, external process)
✓ {wiki-root}/00-Kontext/      — context directory
✓ {wiki-root}/00-Kontext/general/  — format templates
  …
```

Note: no `log.md` is created.

</what-to-do>

<supporting-info>

## AGENTS.md is the source of truth

The wiki's `AGENTS.md` is the canonical schema. It defines naming conventions, frontmatter rules, tag taxonomy, and maintenance policies. All LLM wiki interactions are governed by this file — keep it in sync if the wiki setup changes.

## Resolving the wiki path

Do not rely on environment variables. Resolve the wiki root from context, in this order:

1. If the repo has a `docs/agents/llm-wiki.md`, read it for the wiki path.
2. If the target path was already established in the current session (e.g. the user named it), use that.
3. Otherwise, ask the HITL for the wiki root path.

## Seed templates

All seed templates live in the same directory as SKILL.md:

- `seed-agents.md` — full AGENTS.md schema template
- `seed-index.md` — optional empty index.md (written by an external process; only created on HITL request)
- `seed-team-format.md` — TEAM-FORMAT.md template
- `seed-domain-format.md` — DOMAIN-FORMAT.md template
- `seed-llm-wiki.md` — docs/agents/llm-wiki.md for the repo
- `seed-llm-wiki-schema.md` — Karpathy-style SCHEMA.md for `09-wiki/`
- `seed-llm-wiki-index.md` — empty index.md for `09-wiki/`
- `seed-llm-wiki-log.md` — action log for `09-wiki/`

Note: `seed-log.md` was removed — no root `log.md` is created anymore.

</supporting-info>
