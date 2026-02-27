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
```bash
pnpm test:all              # all tests (parallel + sequential)
pnpm test:parallel          # tests that can run in parallel
pnpm test:sequential        # server tests (sequential, shared DB)
pnpm server:coverage        # coverage report
```

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

## Database

SQLite via better-sqlite3. Schema at `apps/server/src/assets/db/schema.sql`. Migrations in `apps/server/src/migrations/`.

Data directory defaults to `~/trilium-data` (will be renamed to `~/allcodex-data`). Override with `TRILIUM_DATA_DIR` environment variable.

## Security Notes
- ETAPI uses token-based authentication (create tokens via server options)
- Per-note encryption with protected sessions
- OpenID and TOTP support for login
- HTML content is sanitized before rendering
- Share page access can be password-protected per subtree

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