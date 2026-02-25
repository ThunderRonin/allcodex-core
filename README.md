# AllCodex

**AI-powered worldbuilding knowledge base** — a self-hosted lore management system for writers, game masters, and world builders.

AllCodex is a fork of [TriliumNext/Trilium](https://github.com/TriliumNext/Trilium), stripped to its server core and extended with a purpose-built grimoire portal frontend and an AI orchestration layer.

---

## Architecture

```
AllCodex (this repo)
├── apps/server/        — AllCodex server (Node.js + SQLite, ETAPI)
├── apps/portal/        — Grimoire portal frontend (Next.js, Bun, Tailwind v4)
├── apps/server-e2e/    — End-to-end tests
├── packages/commons/   — Shared types and utilities
├── packages/share-theme/    — Public note sharing theme
├── packages/pdfjs-viewer/   — PDF viewer for shared notes
└── packages/highlightjs/    — Syntax highlighting
```

The **server** (`apps/server`) is the data backbone — it stores all lore notes in SQLite and exposes them via [ETAPI](apps/server/etapi.openapi.yaml) (a REST API).

The **portal** (`apps/portal`) is a standalone Next.js app that communicates exclusively with the server through ETAPI and the AllKnower AI service. It provides a World Anvil-style interface for browsing, writing, and enriching lore with AI.

The **AllKnower** service (separate repo) provides the AI layer: RAG-based semantic search, brain dump → structured notes, lore consistency checking, relationship suggestion, and gap detection.

---

## Getting Started

### Requirements
- [pnpm](https://pnpm.io/) ≥ 10 (server + packages)
- [Bun](https://bun.sh/) ≥ 1.3 (portal)
- Node.js ≥ 20

### Install dependencies
```bash
pnpm install
```

### Run the server
```bash
pnpm server:start
# AllCodex server available at http://localhost:8080
# ETAPI available at http://localhost:8080/etapi/
```

### Run the portal
```bash
cd apps/portal
bun run dev
# Portal available at http://localhost:3000
```

### Build for production
```bash
pnpm server:build                     # builds the server
cd apps/portal && bun run build       # builds the portal
```

---

## Portal Configuration

Copy `apps/portal/.env.example` to `apps/portal/.env.local` and fill in your values:

```env
ALLCODEX_URL=http://localhost:8080
ALLCODEX_ETAPI_TOKEN=your_etapi_token_here

ALLKNOWER_URL=http://localhost:3001
ALLKNOWER_BEARER_TOKEN=your_allknower_token_here
```

Your ETAPI token can be found/generated in AllCodex server settings.

---

## Portal Features

| Page | Description |
|---|---|
| **Dashboard** | Stat overview, recent entries, system status |
| **Lore Browser** | Filterable grid of all lore entries by type |
| **Lore Detail** | Wiki-style two-column view with attributes and relations |
| **Search** | Dual-mode: semantic AI search (RAG) or attribute lookup |
| **Brain Dump** | Paste raw notes → AllKnower structures them into lore entries |
| **Consistency** | AI scans lore for contradictions and inconsistencies |
| **Relationships** | Paste text → AI suggests connections to existing entries |
| **Gap Detector** | AI identifies underdeveloped areas in your world |

---

## Server (ETAPI)

The server's REST API is documented in [`apps/server/etapi.openapi.yaml`](apps/server/etapi.openapi.yaml).

Key endpoints used by the portal:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/etapi/notes?search=...` | Search notes |
| `GET` | `/etapi/notes/:id` | Get note metadata |
| `GET` | `/etapi/notes/:id/content` | Get note HTML content |
| `POST` | `/etapi/create-note` | Create a new note |
| `PATCH` | `/etapi/notes/:id` | Update note metadata |
| `PUT` | `/etapi/notes/:id/content` | Update note content |
| `DELETE` | `/etapi/notes/:id` | Delete a note |
| `GET` | `/etapi/app-info` | Server version info |

---

## Lore Taxonomy

Lore entries are standard AllCodex notes tagged with attributes:

```
#lore                        — marks a note as a lore entry
#loreType=character          — character entries
#loreType=location           — locations
#loreType=faction            — factions / organisations
#loreType=creature           — creatures / monsters
#loreType=event              — historical events
#loreType=manuscript         — in-world documents
```

The portal's lore browser and search use these attributes for filtering.

---

## Development

### Testing
```bash
pnpm server:test        # server unit tests
pnpm test:all           # all tests
```

### Type checking
```bash
pnpm typecheck
```

### Linting
```bash
pnpm dev:linter-check
pnpm dev:format-check
```

---

## Upstream

AllCodex is a fork of [TriliumNext/Trilium](https://github.com/TriliumNext/Trilium), which is itself a community fork of [zadam/trilium](https://github.com/zadam/trilium). The original client, desktop (Electron), and web-clipper applications have been removed; the server and data model remain intact.

---

## License

AGPL-3.0-only — see [LICENSE](LICENSE).
