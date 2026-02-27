# AllCodex: Remaining Server-Side Work

> Generated 2026-02-27 — based on audit of current codebase vs. original plan.
> This covers **AllCodex (server) only**. Portal and AllKnower work is tracked in their own repos.

---

## Service Hierarchy (Don't Forget)

```
AllKnower (AI orchestrator)
  ├── calls → AllCodex ETAPI (lore database)
  └── calls → AllCodex-Portal API (if needed)

AllCodex-Portal (frontend)
  └── calls → AllCodex ETAPI (lore database)

AllCodex (this repo — server only)
  └── exposes ETAPI at :8080
```

AllCodex **never** calls AllKnower. AllKnower **calls** AllCodex.

---

## 1. Branding Cleanup (~50 Trilium references)

**Goal:** Replace all user-facing `TRILIUM_` / `trilium` references with `ALLCODEX_` / `allcodex`, while maintaining backward compatibility so existing Docker deployments and configs don't break.

### 1a. Environment Variables (30+ vars)

**Strategy:** Accept both `ALLCODEX_*` and `TRILIUM_*` with `ALLCODEX_*` taking priority. Log a deprecation warning when a `TRILIUM_*` var is detected.

**Files to modify:**

| File | What | Var Count |
|------|------|-----------|
| `apps/server/src/services/config.ts` | Central config parser — reads all `TRILIUM_*` env vars | ~20 |
| `apps/server/src/services/data_dir.ts` | `TRILIUM_DATA_DIR`, `TRILIUM_DOCUMENT_PATH`, `TRILIUM_BACKUP_DIR`, `TRILIUM_LOG_DIR`, `TRILIUM_TMP_DIR`, `TRILIUM_ANONYMIZED_DB_DIR`, `TRILIUM_CONFIG_INI_PATH` | 7 |
| `apps/server/src/services/port.ts` | `TRILIUM_PORT`, `TRILIUM_NETWORK_PORT` | 2 |
| `apps/server/src/services/host.ts` | `TRILIUM_NETWORK_HOST` | 1 |
| `apps/server/src/services/utils.ts` | `TRILIUM_ENV`, `TRILIUM_RESOURCE_DIR` | 2 |
| `apps/server/src/services/scheduler.ts` | `TRILIUM_SAFE_MODE` | 1 |
| `apps/server/src/services/sql.ts` | `TRILIUM_INTEGRATION_TEST` | 1 |
| `apps/server/src/services/migration.ts` | `TRILIUM_INTEGRATION_TEST`, `TRILIUM_IGNORE_DB_VERSION` | 2 |
| `apps/server/src/services/options_init.ts` | `TRILIUM_START_NOTE_ID` | 1 |
| `apps/server/src/routes/index.ts` | `TRILIUM_SAFE_MODE` | 2 |
| `apps/server/src/routes/route_api.ts` | `TRILIUM_NO_UPLOAD_LIMIT` | 1 |
| `apps/server/src/routes/routes.ts` | `TRILIUM_INTEGRATION_TEST` | 1 |
| `apps/server/src/routes/api/script.ts` | `TRILIUM_SAFE_MODE` | 1 |

**Implementation approach:**

```ts
// Helper in config.ts or a new utils/env.ts
function env(allcodexKey: string, triliumKey?: string): string | undefined {
    const val = process.env[allcodexKey];
    if (val !== undefined) return val;

    const legacy = triliumKey ? process.env[triliumKey] : undefined;
    if (legacy !== undefined) {
        log.warn(`Deprecated env var ${triliumKey} — use ${allcodexKey} instead`);
        return legacy;
    }
    return undefined;
}

// Usage:
const dataDir = env("ALLCODEX_DATA_DIR", "TRILIUM_DATA_DIR");
```

**Steps:**
1. Create `env()` helper with deprecation warning
2. Replace every `process.env["TRILIUM_*"]` / `process.env.TRILIUM_*` call site
3. Update Docker Compose files (`docker-compose.yml`, `docker-compose.rootless.yml`) to use `ALLCODEX_*`
4. Update `start-docker.sh` and `rootless-entrypoint.sh`
5. Update `Dockerfile*` files if they reference env vars

### 1b. Data Directory Name

**File:** `apps/server/src/services/data_dir.ts`

- Current: `const DIR_NAME = "trilium-data"` → change to `"allcodex-data"`
- The `getTriliumDataDir()` function → rename to `getDataDir()`
- Add fallback: if `allcodex-data` doesn't exist but `trilium-data` does, use `trilium-data` + log deprecation warning

### 1c. HTTP Headers

**Files:**
- `apps/server/src/services/auth.ts` (line 150) — `trilium-cred` → `allcodex-cred`
- `apps/server/src/services/request.ts` (line 64) — same
- `apps/server/src/express.d.ts` (lines 10-15) — TypeScript types for headers
- `apps/server/src/routes/route_api.ts` (lines 119-121) — header reading
- `apps/server/src/etapi/etapi_utils.ts` (line 62) — `trilium-local-now-datetime`
- `apps/server/src/services/date_utils.ts` (line 13) — comment

**Headers to rename:**
| Old | New |
|-----|-----|
| `trilium-cred` | `allcodex-cred` |
| `trilium-component-id` | `allcodex-component-id` |
| `trilium-local-now-datetime` | `allcodex-local-now-datetime` |
| `trilium-hoisted-note-id` | `allcodex-hoisted-note-id` |

**Backward compat:** Accept both old and new header names, prefer new. The Portal will only send the new names.

### 1d. Error Messages & Comments

| File | Line | Current | Change to |
|------|------|---------|-----------|
| `www.ts` | 145 | mentions `TRILIUM_HOST` | `ALLCODEX_HOST` |
| `www.ts` | 152 | "When Trilium is already open..." | "When AllCodex is already open..." |
| `data_dir.ts` | 101 | "...user running Trilium" | "...user running AllCodex" |

### 1e. Window Titles (Low Priority)

`apps/server/src/services/window.ts` has Electron window titles ("Trilium Notes", "Trilium Notes Setup"). Since we removed the desktop app, this file may be dead code. **Verify if `window.ts` is still imported anywhere.** If dead, delete. If alive, rebrand.

### 1f. Package Scope (`@triliumnext/*`)

**Decision: LEAVE AS-IS for now.** Renaming the npm scope to `@allcodex/*` would require:
- Renaming every `packages/*/package.json` name field
- Updating every import statement across the entire codebase (hundreds)
- Updating `pnpm-workspace.yaml`, `tsconfig.json` references
- Zero user-facing impact

This is a massive refactor with no user benefit. Defer indefinitely or do as a separate dedicated effort.

---

## 2. Share Page Theming (Grimoire Style)

**Goal:** Public shared notes at `/share/` should have a dark fantasy "grimoire" aesthetic matching the AllCodex brand, instead of the default Trilium styling.

### Current Architecture

```
packages/share-theme/
├── src/
│   ├── styles/           ← CSS files (base, layout, content, mobile, etc.)
│   ├── templates/
│   │   └── page.ejs      ← Main HTML template for shared pages
│   ├── scripts/           
│   └── types.d.ts
└── package.json
```

The server renders shared notes using `content_renderer.ts` → `page.ejs` template → inlined CSS from `styles/`.

### Steps

1. **Rebrand share-theme package:**
   - `package.json` name: `@triliumnext/share-theme` → keep (see 1f) or rename to `@allcodex/share-theme`
   - Remove Trilium references from `README.md`
   - Update `page.ejs` line 87: `<style id="trilium-icon-packs">` → `<style id="allcodex-icon-packs">`

2. **Create grimoire CSS override** — modify these files in `packages/share-theme/src/styles/`:

   | File | Changes |
   |------|---------|
   | `base.css` | Dark background (`#1a1410`), aged parchment text (`#d4c5a0`), fantasy fonts (Cinzel for headings, EB Garamond for body). Import Google Fonts in `page.ejs`. |
   | `layout.css` | Sidebar dark wood texture, ornamental border between sidebar/content |
   | `content.css` | Manuscript-style paragraphs, decorative heading underlines, blockquote styling as "lore excerpts" |
   | `navbar/` | Dark header bar with AllCodex logo, subtle gold accents |
   | `toc.css` | Dark panel with muted gold links |
   | `childlinks.css` | Card-style links with fantasy hover effect |

3. **Add AllCodex favicon and logo:**
   - Replace default favicon served to share pages
   - Add SVG logo for share navbar

4. **Wiki-style infobox for shared pages:**
   - Promoted attributes already render in share pages via `content_renderer.ts`
   - Add CSS to style the promoted attributes block as a right-floated "infobox" (Wikipedia/World Anvil style)
   - This is pure CSS — no server code changes needed

5. **Font loading:**
   - Add `<link>` for Google Fonts (Cinzel, EB Garamond) in `page.ejs` `<head>`
   - OR bundle fonts as static assets in `packages/share-theme/src/fonts/`

### Visual Target

```
┌─────────────────────────────────────────────────────┐
│  ☽ AllCodex                    [nav bar, dark wood]  │
├──────────┬──────────────────────────────────────────┤
│          │                         ┌──────────────┐ │
│  Table   │  # Kaelthar the Wise   │ Race: Elf    │ │
│  of      │                        │ Age: 847     │ │
│  Contents│  Kaelthar is the last  │ Status: Alive│ │
│          │  of the Arcane Seers...│ Role: Seer   │ │
│  ────    │                        └──────────────┘ │
│  - Origin│  ## Origin                               │
│  - Powers│  Born in the crystal...                  │
│  - Allies│                                          │
│          │  ## Powers                                │
│          │  He wields the...                        │
└──────────┴──────────────────────────────────────────┘
```

---

## 3. CLAUDE.md Rewrite

**Goal:** Replace the current Trilium-focused developer guide with one that accurately describes AllCodex's architecture post-client-removal.

### Outline

```markdown
# CLAUDE.md

## Overview
AllCodex is a server-only lore database for worldbuilding, forked from TriliumNext.
It exposes an ETAPI for note/lore management, consumed by AllCodex-Portal (UI)
and AllKnower (AI orchestrator).

## Architecture
- Monorepo (pnpm): apps/server, packages/commons, packages/share-theme, etc.
- No client/desktop/web-clipper (removed)
- Server: Express 5 + SQLite (better-sqlite3) + TypeScript

## Key Subsystems
- Becca (backend cache)
- Shaca (share cache)
- ETAPI (external API)
- Share pages (public note rendering at /share/)

## AllCodex-Specific Features
- Lore templates (Character, Location, Faction, Creature, Event, Timeline, Manuscript, Statblock)
- gmOnly secrets system
- World variables ({{var}} expansion in shared pages)
- Scalar API docs at /docs
- Colorful dev logging

## Running
- pnpm install && pnpm run server:start

## Testing
- pnpm test:all

## Key Files
(updated list reflecting current state)
```

---

## 4. README Rewrite

**Goal:** Project README for the GitHub repo, describing AllCodex to potential users and contributors.

### Outline

```markdown
# AllCodex

> AI-powered worldbuilding knowledge base — the lore database for AllKnower.

## What is AllCodex?
Server-only lore database with a REST API (ETAPI). Stores worldbuilding notes
with templates, metadata, relationships, and secrets. Public lore can be shared
via the built-in share pages.

## Architecture
AllCodex is part of the AllKnower ecosystem:
- **AllKnower** — AI orchestrator that creates, enriches, and queries lore
- **AllCodex** — Lore database server (this repo)
- **AllCodex-Portal** — Web UI for browsing and editing lore

## Features
- 8 worldbuilding templates (Character, Location, Faction, etc.)
- GM-only secrets (hidden from shared/public views)
- World variables ({{currency}} expands to your world's currency)
- Full REST API with interactive docs at /docs
- Note relationships and backlinks
- Full-text search with attribute filtering

## Quick Start
(Docker + manual setup instructions)

## API
Interactive docs: http://localhost:8080/docs
JSON spec: http://localhost:8080/etapi/openapi.json

## License
AGPL-3.0
```

---

## 5. Section-Level Secrets

**Goal:** Allow specific sections within a note to be hidden from share pages, not just entire notes.

### Current State
- **Note-level:** `#gmOnly` label → entire note hidden from share. ✅ DONE
- **Section-level:** `content_renderer.ts` already strips DOM elements with `class="gm-only"` from rendered HTML. ✅ SERVER DONE
- **Gap:** No standard way for users/Portal to add `class="gm-only"` to HTML blocks.

### What AllCodex Needs To Do

**Nothing.** The server-side stripping is already implemented. The remaining work is:

1. **Portal responsibility:** The Portal's rich text editor needs a "Mark as GM-Only" button that wraps selected content in `<div class="gm-only">...</div>`.
2. **ETAPI responsibility:** Already works — when creating/updating note content via `PUT /etapi/notes/:id/content`, the HTML body can include `<div class="gm-only">secret stuff</div>` and it will be stripped on share pages.
3. **Documentation:** Add a section to the README/docs explaining the convention:
   - Any HTML element with `class="gm-only"` is stripped from shared output
   - Works with `<div>`, `<span>`, `<section>`, etc.
   - Nesting is supported (parent with class removes all children)

### Steps for AllCodex
- [ ] Add documentation for the `.gm-only` CSS class convention
- [ ] Add a share-theme CSS rule that styles `.gm-only` blocks with a visual indicator (red border, "GM ONLY" badge) for the author's view (when logged in)
- [ ] Verify the stripping works correctly with nested elements (write a test)

---

## 6. Azgaar Fantasy Map Import

**Goal:** Parse an Azgaar Fantasy Map Generator JSON export and bulk-create Location notes in AllCodex.

### Architecture Decision

> **This is AllKnower's job, not AllCodex's.**

Per the service hierarchy:
```
AllKnower (has the Azgaar import endpoint)
  └── parses JSON
  └── calls AllCodex ETAPI to create Location notes
```

AllCodex just needs its existing ETAPI to handle the requests. No new endpoints needed.

### What AllKnower Does (not tracked here)

1. Exposes `POST /api/import/azgaar` endpoint
2. Accepts Azgaar FMG `.json` export file
3. Parses burgs, states, religions, cultures, rivers, routes
4. For each burg → `POST /etapi/create-note` with Location template
5. For each state → `POST /etapi/create-note` with Faction template
6. Sets promoted attributes: coordinates, population, ruler, region
7. Creates relation attributes between locations and factions

### What AllCodex Needs To Do

- [ ] Verify ETAPI can handle rapid sequential note creation (load test with 100+ notes)
- [ ] Ensure Location and Faction templates have all fields Azgaar exports map to:
  - Location: `coordinates` (for map pin), `population`, `region`, `ruler`
  - Faction: `leader`, `type` (state/religion/culture)
- [ ] Document the expected ETAPI call sequence for bulk import in the API docs
- [ ] Consider adding a `POST /etapi/bulk-create-notes` batch endpoint to reduce HTTP overhead (OPTIONAL — only if performance is a problem)

### Template Field Mapping (Azgaar → AllCodex)

| Azgaar Entity | AllCodex Template | Key Fields |
|---------------|-------------------|------------|
| Burg | Location | name, coordinates (x,y), population, state (→ Faction relation), culture, religion |
| State | Faction | name, type="state", capital (→ Location relation), area, population |
| Culture | Faction | name, type="culture", origins |
| Religion | Faction | name, type="religion", form, deity |
| River | Location | name, type="river", length, mouth (→ Location relation) |
| Route | *(skip or store as relation between Locations)* | |

---

## Priority Order

| # | Task | Effort | Impact | Priority |
|---|------|--------|--------|----------|
| 1 | Branding cleanup (env vars + headers) | Medium | High — user-facing, Docker compat | **P0** |
| 3 | CLAUDE.md rewrite | Small | Medium — dev experience | **P1** |
| 4 | README rewrite | Small | High — first thing people see | **P1** |
| 5 | Section-level secrets (docs + test) | Small | Low — server work already done | **P2** |
| 2 | Share page grimoire theming | Large | Medium — visual impact for shared lore | **P2** |
| 6 | Azgaar import (verify templates + optional batch endpoint) | Small | Low — AllKnower does the heavy lifting | **P3** |

---

## Checklist

### Branding Cleanup
- [ ] Create `env()` helper with backward compat + deprecation warning
- [ ] Replace all `TRILIUM_*` env var reads (30+ sites)
- [ ] Rename `trilium-data` default dir with fallback
- [ ] Rename HTTP headers (4 headers, accept both old/new)
- [ ] Update error messages (3 sites)
- [ ] Update Docker files (compose, Dockerfile, entrypoint scripts)
- [ ] Check if `window.ts` is dead code → delete or rebrand
- [ ] Update `share-theme` template (`trilium-icon-packs` → `allcodex-icon-packs`)

### Share Page Theming
- [ ] Design color palette (dark fantasy grimoire)
- [ ] Modify `base.css` — colors, fonts, background
- [ ] Modify `layout.css` — sidebar, content area
- [ ] Modify `content.css` — headings, paragraphs, blockquotes
- [ ] Modify `navbar/` — dark header with AllCodex logo
- [ ] Add wiki-style infobox CSS for promoted attributes
- [ ] Add Google Fonts (Cinzel + EB Garamond) to `page.ejs`
- [ ] Replace favicon and add logo SVG
- [ ] Style `.gm-only` blocks for author view (red border + badge)
- [ ] Test on mobile (modify `mobile.css`)

### Documentation
- [ ] Rewrite CLAUDE.md
- [ ] Rewrite README.md
- [ ] Document `.gm-only` CSS class convention
- [ ] Document ETAPI bulk import sequence for AllKnower

### Verification
- [ ] Section-level secrets: write test for nested `.gm-only` stripping
- [ ] ETAPI load test: 100 sequential create-note calls
- [ ] Verify Location/Faction templates cover Azgaar export fields
- [ ] End-to-end: share page renders with grimoire theme
