---
name: wiki-search
description: Systematic search in an LLM Wiki Vault through a multi-stage funnel. Combines index.md, 09-wiki/ and qmd semantic search (MCP query tool or qmd CLI). Use this skill when the user asks for information from the wiki, wants to retrieve knowledge, or uses terms like "wiki", "search", "find", "knowledge".
license: MIT
compatibility: Requires the qmd CLI (or the qmd MCP server). Install qmd via the qmd fork/`npm install -g @tobilu/qmd`.
metadata:
  author: emas
  version: "1.0.0"
allowed-tools: Bash(qmd:*), mcp__qmd__*
---

# Wiki Search

<what-to-do>

Search the LLM Wiki Vault for information. The wiki path is determined from `docs/agents/llm-wiki.md`. If the path does not exist → abort with the message "Wiki-Pfad nicht gefunden."

The funnel has four stages. Per stage the rule is: **exactly one match** → read + answer → **done**. Otherwise → next stage.

## Stage 1: index.md

Read `{wiki}/index.md` and scan the entries (titles, tags, properties) by keyword search for the query.

Tools: `search_files` / `grep` over the `index.md` file.

- **Method:** Scan each of the sections (e.g. `## 02 Projekte`) for matching `**Title**` entries whose name, tags, or properties contain the search term
- **1 match:** extract the path from the entry (in the form `— \`path/to/file.md\` —`), read the file → answer
- **0 matches → Stage 2**
- **> 1 match → Stage 2** (remember the matches for Stage 4)

## Stage 2: 09-wiki/ (LLM-Wiki)

Follow the query procedure from SCHEMA.md (lines 278–287):

1. Read `{wiki}/09-wiki/index.md` to identify relevant pages
2. Search `{wiki}/09-wiki/` with `search_files` for the key terms
3. Read the relevant pages (`read_file`)
4. For questions/tasks about `{wiki}/09-wiki/SCHEMA.md` or wiki operations, read SCHEMA.md first for the conventions

- **1 match:** read the file → answer
- **0 matches → Stage 3**
- **> 1 match → Stage 3** (remember the matches)

## Stage 3: qmd semantic search

Use qmd for semantic + lexical + reranked retrieval. Prefer the MCP `query` tool when a qmd MCP server is available (e.g. in a container/sidecar); otherwise fall back to the qmd CLI. Both are the same engine.

**Preferred — MCP `query` tool** (available via a running qmd MCP server):

Parameters:

| Parameter | Type | Description |
|---|---|---|
| `searches` | `array` | Typed sub-queries (`lex`/`vec`/`hyde`), 1–10. **Required.** The first entry gets 2× weight. |
| `collections` | `string[]` | Filter by collections (global, team, personal). Array — singular is ignored. |
| `intent` | `string` | Disambiguation context (not searched itself) |
| `limit` | `number` | Max. results (default 10) |
| `minScore` | `number` | Minimum relevance 0–1 (default 0) |
| `candidateLimit` | `number` | Max. candidates for reranking (default 40) |
| `rerank` | `boolean` | LLM reranking (default true) |

Example call:

```
query(searches=[{lex: "search term"}, {vec: "search intent"}], collections=["global"], limit=5, minScore=0.3)
```

**Fallback — qmd CLI** (local use without an MCP server):

Use `qmd query` with structured fields you write yourself (`intent:`, `lex:`, `vec:`, `hyde:`). Filter by collection with `-c`, set the result count with `-n`, and fetch full documents with `qmd get`/`qmd multi-get`. Example:

```bash
qmd query $'intent: <what you are trying to find and what to avoid>\nlex: <exact terms, names, aliases>\nvec: <semantic paraphrase>\nhyde: <description of the document that would satisfy the request>' -c global -n 5
qmd multi-get "#abc123,#def432" --format md
```

Rules for both paths:
- Search first, then retrieve the full source before making claims — do not answer from snippets alone.
- If `qmd query` fails (no model/GPU/Ollama), fall back to `qmd search` with stronger lexical terms.
- Results carry `qmd://` paths and/or `#docid`s; cite them with the file path (or docid) and relevant line numbers.

- **1 match:** extract the file path from the result, read the file → answer
- **0 matches → Stage 4**
- **> 1 match:** collect all paths → **Stage 4** (with the full match list from stages 1–3)

## Stage 4: Best-Match

If several files remain as candidates after all three stages:

1. **Create a ranking** by relevance:
   - Keyword frequency in the title
   - Match with tags/frontmatter
   - Origin: `09-wiki/` (compiled knowledge) **preferred** over layer-1 sources (projects, daily notes, etc.)
2. **Select one file** — the highest-ranked match
3. Read the file (`read_file`)
4. If the file is not readable or contains no relevant content → take the next-best match

## Formulating the answer

From the read file:

- Extract **title** + **frontmatter** (created, updated, tags, confidence)
- Synthesize **relevant passages** for the user's question (no full-text dump)
- Mention **wikilinks** as "Siehe auch" (see also)
- Provide the **source path**: `(Quelle: 09-wiki/concepts/xyz.md)`
- For `confidence: low` or `contested: true`, add a note about low trustworthiness

If **no stage** yields a match → answer: "Keine Informationen im Wiki zu diesem Thema gefunden."

</what-to-do>

<supporting-info>

## qmd

qmd (Query Markup Documents) is an on-device semantic search engine for Markdown files. It indexes collections (e.g. global, team, personal) with BM25 + vector embeddings + LLM reranking. It can be used either through its MCP server (`query` tool) or directly via the `qmd` CLI.

## Conventions

- German as the main language, English technical terms allowed
- Never modify layer-1 sources (`00-Kontext/`, `01-Inbox/`) — only read
- Always provide the source path after an answer
- If the user asks follow-up questions about wikilinks, run them through the funnel as well

</supporting-info>
