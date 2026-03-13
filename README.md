# AllCodex

Self-hosted lore database for worldbuilding. A server-only fork of [TriliumNext/Trilium](https://github.com/TriliumNext/Trilium), stripped down to its core and rebuilt for writers, game masters, and world builders.

AllCodex stores your worldbuilding notes in SQLite and serves them over a REST API (ETAPI). It handles lore templates, GM-only secrets, world variable expansion, and public sharing out of the box.

## Ecosystem

AllCodex is one piece of the AllKnower stack:

| Service | Role | Repo |
|---------|------|------|
| **AllCodex** (this repo) | Lore database server, ETAPI, share pages | [ThunderRonin/AllCodex](https://github.com/ThunderRonin/AllCodex) |
| **AllCodex-Portal** | Web frontend for browsing and editing lore | [ThunderRonin/AllCodex-Portal](https://github.com/ThunderRonin/AllCodex-Portal) |
| **AllKnower** | AI orchestrator: brain dump, consistency checks, relationship discovery | separate repo |

AllKnower calls AllCodex. The Portal calls AllCodex. AllCodex just serves data.

## Features

- **8 lore templates** with promoted attributes: Character, Location, Faction, Creature, Event, Timeline, Manuscript, Statblock
- **GM-only secrets**: tag notes with `#gmOnly` or wrap HTML sections in `class="gm-only"` to hide them from shared pages
- **World variables**: write `{{currency}}` in a note and it expands to the value stored in your `#worldVariables` JSON note
- **Public sharing**: render any subtree as a public website at `/share/`
- **Full REST API** with interactive docs at `/docs` (Scalar) and a JSON spec at `/etapi/openapi.json`
- **Search**: query by attributes, labels, note content, or any combination (`#loreType=character #status=alive`)
- **Note relationships**: parent/child branches + typed relation attributes between notes
- **Revision history**: every edit is versioned
- **Encryption**: per-note protection with password-gated sessions

## Quick Start

### Requirements
- Node.js 20+
- pnpm 10+

### Install and run
```bash
git clone https://github.com/ThunderRonin/AllCodex.git
cd AllCodex
pnpm install
pnpm server:start
```

Server starts at `http://localhost:8080`. API docs at `http://localhost:8080/docs`.

### Docker
```bash
docker compose up -d
```

Or build the image yourself:
```bash
docker build -t allcodex -f apps/server/Dockerfile .
docker run -p 8080:8080 -v allcodex-data:/home/node/allcodex-data allcodex
```

### Initialize the app

On first launch the database has not been created yet. You must initialize it before doing anything else — two steps, in order:

**Step 1 — create the database** (no body required):

```bash
curl -X POST http://localhost:8080/api/setup/new-document
```

Expected response: empty `200 OK`.

**Step 2 — set the password:**

```bash
curl -X POST http://localhost:8080/set-password \
  -H "Content-Type: application/json" \
  -d '{"password1": "yourpassword", "password2": "yourpassword"}'
```

Expected response:

```json
{"success": true, "redirect": "login"}
```

If you skip step 1 and go straight to `POST /set-password`, the server redirects to `/setup` because the DB doesn't exist yet. Once the password is set, any subsequent call to `POST /set-password` returns `400 Bad Request`. To change the password later use `POST /api/password/change` with `current_password` and `new_password` fields.

### Create an ETAPI token

After initializing, create an API token via the options page at `http://localhost:8080` or via the internal API. The Portal and AllKnower need this token to talk to AllCodex.

## API

Interactive reference: [http://localhost:8080/docs](http://localhost:8080/docs)

OpenAPI spec (JSON): `GET /etapi/openapi.json`
OpenAPI spec (YAML): `GET /etapi/etapi.openapi.yaml`

Common endpoints:

| Method | Path | What it does |
|--------|------|--------------|
| `GET` | `/etapi/notes?search=...` | Search notes by query |
| `GET` | `/etapi/notes/:id` | Get note metadata |
| `GET` | `/etapi/notes/:id/content` | Get note body (HTML) |
| `POST` | `/etapi/create-note` | Create a note |
| `PATCH` | `/etapi/notes/:id` | Update note metadata |
| `PUT` | `/etapi/notes/:id/content` | Update note body |
| `DELETE` | `/etapi/notes/:id` | Soft-delete a note |
| `POST` | `/etapi/attributes` | Add a label or relation |
| `GET` | `/etapi/app-info` | Server version info |

All endpoints require `Authorization: <token>` header except `/docs`, `/etapi/openapi.json`, and `/etapi/etapi.openapi.yaml`.

## Lore Taxonomy

Lore entries are standard notes with attributes that categorize them:

```
#loreType=character       characters and NPCs
#loreType=location        places, regions, landmarks
#loreType=faction         organizations, states, religions
#loreType=creature        monsters and beasts
#loreType=event           historical events
#loreType=timeline        chronologies (book-type notes)
#loreType=manuscript      in-world documents
#loreType=statblock       D&D 5e stat blocks
```

Each type has a built-in template with promoted attributes (structured fields like "Race", "Population", "Danger Level", etc.) that appear as metadata on the note.

## Project Structure

```
apps/
  server/              Express 5 + SQLite server
  server-e2e/          Playwright end-to-end tests
  build-docs/          TypeDoc generation
  db-compare/          DB comparison tool
  dump-db/             DB dump tool
  icon-pack-builder/   Icon pack generation

packages/
  commons/             Shared types and utilities
  share-theme/         CSS + templates for /share/ pages
  highlightjs/         Syntax highlighting
  pdfjs-viewer/        PDF viewer for shared notes
  express-partial-content/   Range request support
  turndown-plugin-gfm/      Markdown conversion
```

## Development

```bash
pnpm server:start         # dev server with hot reload
pnpm server:build         # production build
pnpm test:all             # run all tests
pnpm typecheck            # TypeScript check
pnpm dev:linter-check     # ESLint
```

## Contributing

Contributions are welcome. If you're interested in working on AllCodex, here's how to get started:

1. Fork the repo and clone it locally
2. Run `pnpm install` to set up the monorepo
3. Start the dev server with `pnpm server:start`
4. Make your changes on a feature branch
5. Run `pnpm test:all && pnpm typecheck` before opening a PR

A few things to keep in mind:

- **Keep PRs focused.** One feature or fix per pull request. Avoid drive-by refactors in unrelated files.
- **Test your changes.** If you're touching ETAPI endpoints or the share renderer, write or update tests.
- **Don't break existing APIs.** ETAPI is consumed by the Portal and AllKnower. Changing endpoint signatures or response shapes needs discussion first.
- **Templates go in `hidden_subtree_templates.ts`.** If you want to add a new lore type or modify an existing one, that's the file.
- **Share page styling lives in `packages/share-theme/`.** CSS changes for `/share/` go there, not in the server code.

If you're not sure where to start, look for issues tagged `good first issue`, or open a discussion with your idea before writing code.

## Upstream

Forked from [TriliumNext/Trilium](https://github.com/TriliumNext/Trilium) (which itself continues [zadam/trilium](https://github.com/zadam/trilium)). The original client, desktop, and web-clipper apps have been removed. The server, data model, and ETAPI remain intact.

## License

AGPL-3.0-only. See [LICENSE](LICENSE).
