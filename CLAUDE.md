# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

AllCodex is a server-only lore database for worldbuilding, forked from [TriliumNext/Trilium](https://github.com/TriliumNext/Trilium). The original client, desktop, and web-clipper apps have been removed. What remains is the server, ETAPI (REST API), shared note rendering, and supporting packages.

AllCodex is part of a larger ecosystem:
- **AllCodex** (this repo) stores and serves lore via ETAPI
- **AllCodex-Portal** (separate repo) is the frontend (Next.js + Bun)
- **AllKnower** (separate repo) is the AI orchestrator that enriches lore

## Development Commands

### Setup
```bash
pnpm install
```

### Running the Server
```bash
pnpm server:start          # development mode (http://localhost:8080)
pnpm server:start-prod     # production mode
```

### Building
```bash
pnpm server:build
```

### Testing

#### Unit Tests (vitest)
```bash
pnpm test:all              # all tests (parallel + sequential)
pnpm test:parallel          # tests that can run in parallel
pnpm test:sequential        # server tests (sequential, shared DB)
pnpm server:coverage        # coverage report (v8)
```

Coverage baseline (as of 2025-05-15): 45.43% statements, 39.84% branches, 50.24% functions, 45.74% lines across 87 test files (1028 tests, 18 skipped).

Note: `@vitest/coverage-v8` must be pinned to the exact same version as vitest (4.0.18). Version mismatches break coverage collection.

#### E2E Tests (Playwright)

E2E tests live in `apps/server-e2e/src/lore_workflows.spec.ts` — all ETAPI-based, no browser UI tests. The Trilium client was removed; all former UI specs have been deleted.

**Quick run (pre-started server):**
```bash
# Terminal 1: start server on port 8082
cd apps/server
TRILIUM_DATA_DIR=spec/db TRILIUM_PORT=8082 TRILIUM_INTEGRATION_TEST=memory \
  TRILIUM_ENV=production node dist/main.cjs

# Terminal 2: run e2e tests (TRILIUM_DOCKER=1 skips Playwright's webServer auto-start)
cd apps/server-e2e
TRILIUM_DOCKER=1 BASE_URL=http://127.0.0.1:8082 npx playwright test --project=chromium
```

**Why `TRILIUM_DOCKER=1`:** The Playwright config's `webServer` runs `pnpm start-prod-no-dir` which rebuilds on every launch (~5 min). Setting `TRILIUM_DOCKER=1` disables the webServer block so Playwright uses an already-running server.

**Why not `pnpm start-prod-no-dir` directly:** It runs `pnpm build &&` every time, often exceeding Playwright's 5-minute webServer timeout. Pre-start the built server manually instead.

**Auth in e2e:** `TRILIUM_INTEGRATION_TEST=memory` uses in-memory SQLite. The `noAuthentication` config option controls ETAPI auth bypass. Tests make raw HTTP requests without tokens.

E2E test count: 11 tests covering lore CRUD, relationships, content types, XSS sanitization, bookmarks, search, content update, PATCH, branch cloning, export, and recent changes.

### Linting
```bash
pnpm dev:linter-check       # eslint
pnpm dev:format-check       # formatting
pnpm typecheck              # TypeScript type check
```

## Monorepo Structure

```
apps/
  server/           Node.js server (Express 5 + SQLite via better-sqlite3)
  server-e2e/       End-to-end tests
  build-docs/       API doc generation
  db-compare/       Database comparison utility
  dump-db/          Database dump utility
  icon-pack-builder/  Icon pack generation
  website/          Documentation site source

packages/
  commons/              Shared interfaces, types, utilities
  share-theme/          CSS/EJS templates for public note sharing
  highlightjs/          Syntax highlighting
  pdfjs-viewer/         PDF viewer for shared notes
  express-partial-content/  Partial content (range request) support
  turndown-plugin-gfm/     Markdown conversion plugin
```

## Architecture

### Cache Layers
- **Becca** (Backend Cache): server-side entity cache, the primary data layer. Located at `apps/server/src/becca/`.
- **Shaca** (Share Cache): lightweight read-only cache for public shared notes. Located at `apps/server/src/share/shaca/`.

### Entity System (Becca)
Entities live in `apps/server/src/becca/entities/`:
- `BNote` notes with content, metadata, and type
- `BBranch` parent-child relationships (a note can have multiple parents)
- `BAttribute` labels and relations attached to notes
- `BRevision` version history
- `BOption` app configuration

### API Surface
- **ETAPI** (External API): REST endpoints at `/etapi/` for note CRUD, search, attributes, branches. OpenAPI spec at `apps/server/etapi.openapi.yaml`. Interactive docs at `/docs` (Scalar).
- **Internal API**: REST endpoints at `/api/` used by the legacy client (still functional for scripting and sync).
- **Share**: public note rendering at `/share/`, styled by `packages/share-theme/`.
- **WebSocket**: real-time sync at `apps/server/src/services/ws.ts`.

### AllCodex-Specific Features
- **Lore templates**: Character, Location, Faction, Creature, Event, Timeline, Manuscript, Statblock. Defined in `apps/server/src/services/hidden_subtree_templates.ts`.
- **GM-only secrets**: notes with `#gmOnly` label are hidden from shared output. HTML elements with `class="gm-only"` are stripped from share pages.
- **World variables**: `{{variableName}}` placeholders in note content are expanded from JSON stored in notes labeled `#worldVariables`.
- **API docs**: Scalar interactive reference at `/docs`, JSON spec at `/etapi/openapi.json`.

## Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/main.ts` | Server entry point |
| `apps/server/src/www.ts` | HTTP server setup, port binding |
| `apps/server/src/becca/becca.ts` | Backend data cache |
| `apps/server/src/services/notes.ts` | Note creation and mutation logic |
| `apps/server/src/services/search/` | Search query parsing and execution |
| `apps/server/src/etapi/` | All ETAPI route handlers |
| `apps/server/src/share/content_renderer.ts` | Share page rendering (gmOnly, variables) |
| `apps/server/src/assets/db/schema.sql` | Database schema |
| `apps/server/etapi.openapi.yaml` | OpenAPI specification |
| `apps/server-e2e/src/lore_workflows.spec.ts` | E2E tests (Playwright, ETAPI-only) |
| `apps/server-e2e/playwright.config.ts` | E2E config (port 8082, chromium) |
| `apps/server/src/test/shaca_mocking.ts` | Share cache mock helper for unit tests |
| `apps/server/src/test/becca_mocking.ts` | Backend cache mock helper for unit tests |

## Database

SQLite via better-sqlite3. Schema at `apps/server/src/assets/db/schema.sql`. Migrations in `apps/server/src/migrations/`.

Data directory defaults to `~/trilium-data` (will be renamed to `~/allcodex-data`). Override with `TRILIUM_DATA_DIR` environment variable.

## Security Notes
- ETAPI uses token-based authentication (create tokens via server options)
- Per-note encryption with protected sessions
- OpenID and TOTP support for login
- **Title sanitization is server-side** — `html_sanitizer.sanitize()` runs on titles at write time (`services/notes.ts:139`). Script tags and RTL override chars are stripped.
- **Content is stored verbatim** — Core does NOT sanitize note content. This is by design. Content sanitization is Portal's responsibility via `sanitizeLoreHtml()` / `sanitizePlayerView()` before rendering to browsers.
- Share pages filter `#draft` and `#gmOnly` notes from both content and index listings (`content_renderer.ts`)
- Share page access can be password-protected per subtree

## Gotchas

- **`express.text()` only parses `text/plain`** — sending `Content-Type: text/html` to ETAPI PUT `/notes/:id/content` results in `req.body = null`. Use `text/plain` for ETAPI content updates.
- **Revisions skip brand-new notes** — `saveRevisionIfNeeded` checks `msSinceDateCreated >= revisionSnapshotTimeInterval`. Notes created within the interval window won't get a revision on first edit. This prevents revision spam during bulk operations like brain dump commits.
- **Node version: 22.x required** — Node 26 breaks better-sqlite3 native bindings. Use `nvm use 22` or pin via `.nvmrc`.
- **vitest workspace conflict** — Running `npx vitest run --coverage` from the repo root fails with `"different maxWorkers but same sequence.groupOrder"`. Use `pnpm server:coverage` (which uses `--filter server`) instead.
- **`shaca_mocking.ts` content check** — Uses `noteDef.content !== undefined` (not truthiness) because empty string `""` is valid content for file/PDF notes.

## Common Tasks

### Adding Lore Templates
Edit `apps/server/src/services/hidden_subtree_templates.ts`. Follow existing patterns. Each template is a `HiddenSubtreeItem` with `id`, `title`, `type`, `icon`, and `attributes[]`.

### Database Migrations
Add migration scripts in `apps/server/src/migrations/`. Update schema in `apps/server/src/assets/db/schema.sql`.

### Extending Search
Search operators are in `apps/server/src/services/search/`. Add new operators in the search context files.

### Modifying Share Pages
Templates: `packages/share-theme/src/templates/page.ejs`. Styles: `packages/share-theme/src/styles/`. Content processing: `apps/server/src/share/content_renderer.ts`.

## Build System
- pnpm for monorepo management and dependency resolution
- ESBuild for production builds
- tsx for development (watch mode)
- Docker support with multi-stage builds (see `apps/server/Dockerfile*`)