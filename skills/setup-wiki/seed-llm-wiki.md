# LLM Wiki

**Type**: Repository-wiki

**Path**: `{wiki-path}`

**Schema**: `{wiki-path}/AGENTS.md`

The LLM Wiki is a collection of markdown files organised as an Obsidian-style vault.
It enriches the agent's knowledge for discovery, querying, and content-creation tasks.

## Conventions

- All pages use YAML frontmatter and `[[wikilinks]]`
- The vault structure follows the schema in AGENTS.md
- Layer-1 files (`00-Kontext/` through `06-Archiv/`, `10-{Domain}/`) are semantic-content-immutable — edits go to `09-wiki/entities/`, `09-wiki/concepts/`, etc. Metadata markers (`wiki_refs`, `last_ingested`) may be added to frontmatter. File moves require HITL approval.
- `index.md` is the content catalog — optional, written by an external process (referenced but not maintained by the agent)
- No `log.md` is maintained anymore

## Consumer rules

1. Read `AGENTS.md` first to understand vault structure and conventions.
2. Consult `index.md` to find relevant pages for a query (if it exists).
3. Use `[[wikilinks]]` when referencing wiki concepts in agent output.
4. Never modify semantic content of Layer-1 files. Metadata markers (`wiki_refs`, `last_ingested`) are allowed in frontmatter. File moves only with HITL.
