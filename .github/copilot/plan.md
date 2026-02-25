# Trilium → AllCodex: Full Transformation Plan

> Based on a deep scan of the TriliumNext codebase (v0.101.3, 339 built-in notes, pnpm monorepo with 15+ packages).

---

## Table of Contents

1. [Bun Migration](#1-bun-migration)
2. [Branding & String Renaming](#2-branding--string-renaming)
3. [Grimoire Theme (CSS)](#3-grimoire-theme-css)
4. [Lore Entity Templates](#4-lore-entity-templates)
5. [Wiki-Style Features](#5-wiki-style-features)
6. [ETAPI Integration with AllKnower](#6-etapi-integration-with-allknower)
7. [What's Hard / Impossible / Easy](#7-difficulty-matrix)
8. [Recommended Phase Order](#8-recommended-phase-order)

---

## 1. Bun Migration

> [!CAUTION]
> **SKIPPED. AllCodex stays on pnpm + Node.js + tsx.** Reasons: `better-sqlite3` is a native C++ addon that requires `node-gyp`, Electron 40.4.1 cannot run under Bun, and the workspace patches for CKEditor5 don't map to Bun's patch system. **Bun is for AllKnower only.**

---

## 2. Branding & String Renaming

> **Verdict: ✅ EASY — Pure text replacement, no logic changes**

### 2a. i18n String Replacement (~30 min)

The English translation file controls ALL user-visible text in the UI:

**File:** [translation.json](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/translations/en/translation.json) (2,327 lines)

Key replacements:

| Find | Replace With |
|---|---|
| `"Trilium Notes"` / `"TriliumNext"` | `"AllCodex"` |
| `"note"` / `"notes"` (in UI strings) | `"lore"` / `"lore entries"` |
| `"tree"` (sidebar label) | `"chronicle"` |
| `"notebook"` / `"book"` (note type) | `"tome"` |
| `"New note"` | `"New Lore Entry"` |
| `"Note tree"` | `"Lore Chronicle"` |

> [!IMPORTANT]
> Do NOT blindly find/replace `"note"` — it appears in hundreds of technical strings like `"noteId"`, `"noteType"`, `"parentNoteId"`. Only replace **user-facing display strings** inside the `translation.json` values. The keys must stay the same.

**Other locales:** You only need to edit `en/translation.json`. The other 36 locales can be left as-is (they'll fall through to English for missing keys) or updated later.

### 2b. Server-side branding

| File | What to change |
|---|---|
| [app_info.ts](file:///home/allmaker/projects/allknower/AllCodex/apps/server/src/etapi/app_info.ts) | Change app name returned by ETAPI |
| [www.ts](file:///home/allmaker/projects/allknower/AllCodex/apps/server/src/www.ts) | ASCII art banner on startup — change "Trilium Notes" to "AllCodex" |
| Root [package.json](file:///home/allmaker/projects/allknower/AllCodex/package.json) | Change `name`, `description`, `author`, `repository`, `bugs`, `homepage` |
| [README.md](file:///home/allmaker/projects/allknower/AllCodex/README.md) | Complete rewrite for AllCodex |
| [CLAUDE.md](file:///home/allmaker/projects/allknower/AllCodex/CLAUDE.md) | Rewrite with AllCodex-specific architecture context |

### 2c. Favicon & Icons

| File | What to change |
|---|---|
| [apps/server/src/assets/](file:///home/allmaker/projects/allknower/AllCodex/apps/server/src/assets/) | Replace `favicon.ico`, `icon.png`, etc. with AllCodex branding |
| [apps/client/src/assets/](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/assets/) | Replace any client-side logos |

---

## 3. Grimoire Theme (CSS)

> **Verdict: ✅ EASY-MEDIUM — Trilium's theming is built on CSS variables**

### How Trilium themes work

1. **CSS variable definitions** in theme files set all colors, fonts, and spacing
2. The user picks a theme in Options → Appearance
3. Themes can be **built-in** (files in `stylesheets/`) or **user-defined** (stored as notes with `#appTheme` label)

### Files to modify/create

| File | Purpose |
|---|---|
| [theme-dark.css](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/stylesheets/theme-dark.css) | 122 lines — override ALL CSS variables for grimoire look |
| [theme-next-dark.css](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/stylesheets/theme-next-dark.css) | 504 lines — the "Next" theme, more modern. Could be your base. |
| [style.css](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/stylesheets/style.css) | 1,824 lines — main stylesheet. Add grimoire-specific element styles here. |
| [tree.css](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/stylesheets/tree.css) | 200+ lines — left sidebar tree styling |
| [ckeditor-theme.css](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/stylesheets/ckeditor-theme.css) | Text editor styling (this is where note content looks like a manuscript) |

### Key CSS variables you'll override

```css
:root {
    --main-background-color: /* deep parchment/dark brown */;
    --main-text-color: /* aged gold/cream */;
    --main-font-family: /* fantasy font like 'Cinzel', 'Uncial Antiqua', etc. */;
    --left-pane-background-color: /* darker sidebar */;
    --link-color: /* arcane blue/purple */;
    --active-tab-background-color: /* grimoire accent */;
    /* ... all ~60 variables */
}
```

### Approach

1. Start from [theme-next-dark.css](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/stylesheets/theme-next-dark.css) as base (it's the most modern)
2. Override all color/font variables
3. Add grimoire-specific CSS for: parchment textures (via `background-image`), ornamental borders, custom scrollbar styling
4. Import a fantasy Google Font in the main HTML (e.g. Cinzel for headers, EB Garamond for body)

### Font loading

Edit [apps/server/src/routes/index.ts](file:///home/allmaker/projects/allknower/AllCodex/apps/server/src/routes) — the EJS templates that render the HTML. Add a `<link>` for Google Fonts, or bundle fonts in `apps/client/src/fonts/`.

---

## 4. Lore Entity Templates

> **Verdict: ✅ DOABLE — Trilium has a powerful built-in template system via promoted attributes**

### How Trilium templates work

1. A **template** is a regular note with the label `#template`
2. Templates define **promoted attributes** — fields that appear as a structured form at the top of any note using that template
3. Promoted attributes are defined as labels like: `#label:fieldName = "promoted,alias=Display Name,single,text"`
4. The `promoted_attribute_definition_parser.ts` supports these field types: **text, number, boolean, date, datetime, time, url** (+ color as a special case)
5. Child notes automatically inherit promoted attributes from parent templates via `isInheritable: true`

### Where to add AllCodex templates

**File:** [hidden_subtree_templates.ts](file:///home/allmaker/projects/allknower/AllCodex/apps/server/src/services/hidden_subtree_templates.ts) (322 lines)

This file defines all built-in templates. Currently contains: Text Snippet, List View, Grid View, Calendar, Table, Geo Map, Board, Presentation.

Add your worldbuilding templates here. Each template is a `HiddenSubtreeItem` with:
- `id` — unique template ID (e.g. `_template_character`)
- `title` — display name
- `type` — usually `"text"`
- `icon` — Boxicons icon class
- `attributes[]` — array of promoted attribute definitions

### Template definitions for each entity type

**Character Template:**
```ts
{
    id: "_template_character",
    type: "text",
    title: "Character",
    icon: "bx bx-user",
    attributes: [
        { name: "template", type: "label" },
        { name: "label:fullName", type: "label", value: "promoted,alias=Full Name,single,text" },
        { name: "label:aliases", type: "label", value: "promoted,alias=Aliases,multi,text" },
        { name: "label:age", type: "label", value: "promoted,alias=Age,single,number" },
        { name: "label:race", type: "label", value: "promoted,alias=Race,single,text" },
        { name: "label:gender", type: "label", value: "promoted,alias=Gender,single,text" },
        { name: "label:affiliation", type: "label", value: "promoted,alias=Affiliation,single,text" },
        { name: "label:role", type: "label", value: "promoted,alias=Role,single,text" },
        { name: "label:status", type: "label", value: "promoted,alias=Status,single,text" },
        // etc. for secrets, relationships, backstory, goals
    ]
}
```

Repeat this pattern for all 8 templates: **Character, Location, Faction, Creature, Event, Timeline, Manuscript, Statblock**.

### i18n for templates

Add translation keys to [translation.json](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/translations/en/translation.json) under a new `"lore_templates"` section for all field display names.

### Statblock renderer (custom note type — HARD)

> [!WARNING]
> Adding a **new note type** to Trilium requires changes in **7+ places**: the `ALLOWED_NOTE_TYPES` array in `packages/commons`, a new widget in `apps/client/src/widgets/type_widgets/`, server-side MIME handling, the note creation dialog, etc. This is labor-intensive but doable (Trilium added `aiChat` recently). However, a **much simpler** approach is to create a Statblock as a **text note with a template** and use promoted attributes for stat values. The rendering can be handled by a **custom render script** (Trilium supports `#renderNote` attributes that attach custom JS/HTML rendering to notes).

### Map of all fields per template type

| Template | Promoted Fields (type) | Notes |
|---|---|---|
| **Character** | fullName(text), aliases(text,multi), age(number), race(text), gender(text), affiliation(text), role(text), status(text), secrets(text,multi), backstory(text) | Relationships = relations to other character notes |
| **Location** | name(text), locationType(text), region(text), population(number), ruler(text), history(text), landmarks(text,multi), secrets(text,multi) | Connected locations = relations |
| **Faction** | name(text), factionType(text), foundingDate(text), leader(text), goals(text,multi), secrets(text,multi), hierarchy(text) | Members/allies/enemies = relations |
| **Creature** | name(text), creatureType(text), habitat(text), diet(text), abilities(text,multi), dangerLevel(number), lore(text) | For D&D stats, use Statblock sub-notes |
| **Event** | name(text), inWorldDate(text), outcome(text), consequences(text), secrets(text,multi) | Participants/location = relations |
| **Timeline** | name(text), calendarSystem(text) | Children = Event notes sorted by inWorldDate |
| **Manuscript** | title(text), genre(text), status(text), wordCount(number) | Use Trilium's zen mode for distraction-free writing |
| **Statblock** | crName(text), crLevel(number), ac(number), hp(number), str(number), dex(number), con(number), int(number), wis(number), cha(number), abilities(text,multi) | Pure promoted attributes, no custom note type needed |

---

## 5. Wiki-Style Features

### 5a. Cross-linking with bidirectional links ✅ ALREADY EXISTS

Trilium already has:
- Internal note links via `[[]]` syntax or CKEditor link picker
- **Backlinks widget** — shows all notes that link TO the current note
- [Backlinks.css](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/widgets/Backlinks.css) and related widget

**No work needed.** Just ensure templates encourage linking via relation attributes.

### 5b. Table of Contents ✅ ALREADY EXISTS

Trilium has a built-in ToC widget: [toc.ts](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/widgets/toc.ts) (596 lines). It auto-generates from heading structure.

**No work needed.**

### 5c. Variables system ⚠️ MEDIUM — Needs custom development

Trilium does NOT have a variables system. You need to build one.

**Approach:**

1. Create a special "Variables" note (type `code`, mime `application/json`)
2. Store world variables as JSON: `{ "currency": "Aurens", "capital": "Solara", ... }`
3. Write a **frontend script** (Trilium supports `#widget` scripts) that does find/replace in rendered note content
4. Use a custom syntax like `{{currency}}` that the script replaces with the stored value
5. Attach this script globally via `#run=frontendStartup`

**Files to create/modify:**
- New note (created via ETAPI or manually): "All Reach Variables"
- New widget script: either as a note with `#widget` or as a file in `apps/client/src/widgets/`

**Difficulty:** Medium. Trilium's scripting API is well-documented and powerful. The tricky part is making the replacement work inside CKEditor5 (the WYSIWYG editor) without breaking the editor state.

> [!TIP]
> A simpler v1: variables are only expanded in **share/export** view, not in the live editor. This avoids CKEditor5 complexity entirely.

### 5d. Secrets system ✅ MOSTLY EXISTS

Trilium has **protected notes** (`isProtected` flag) — these require a password to view. However, the "GM-only" use case is slightly different: you want some content visible to the author but hidden from shared/public views.

**Approach:**

1. Use the existing **share system** (`#shareRoot` label publishes notes to a public URL)
2. Add a custom label `#gmOnly` to any note or section
3. Modify the share renderer at [content_renderer.ts](file:///home/allmaker/projects/allknower/AllCodex/apps/server/src/share/content_renderer.ts) (299 lines) to strip content with `#gmOnly` from shared output
4. For section-level secrets within a note, use a convention like a CKEditor admonition block with a specific class that the share renderer filters out

**Difficulty:** Easy for note-level secrets. Medium for section-level (need CKEditor plugin work).

### 5e. Sorting and filtering ✅ ALREADY EXISTS

Trilium has:
- **Search** with full query syntax: `#template #status=alive #race=elf`
- **Collections** with table/list/grid views that can sort and filter by attributes
- Saved searches (search notes)

**No work needed** beyond creating good attribute conventions in templates.

### 5f. Tagging system ✅ ALREADY EXISTS

Trilium labels ARE tags. Any note can have labels like `#prophecy`, `#dead`, `#main-cast`, `#antagonist`. The search system finds notes by labels.

**No work needed.**

### 5g. To-do list per entry ✅ ALREADY EXISTS

CKEditor5 has a built-in to-do list plugin. Users can add checkbox lists in any note.

For a structured approach, use the **Board collection** (kanban) attached as a child note.

**No work needed.**

### 5h. Map markers linked to lore ✅ MEDIUM (easier with Azgaar FMG)

Trilium has a **Geo Map collection** ([geomap/](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/widgets/collections/geomap/)) using Leaflet. Notes with a `#geolocation` promoted attribute appear as pins.

**You use [Azgaar's Fantasy Map Generator](https://github.com/Azgaar/Fantasy-Map-Generator) — this is the right approach:**

Azgaar FMG exports:
- **SVG** — fully scalable vector map with named layers (biomes, routes, settlements, regions)
- **JSON** — structured world data including cell coordinates, burgs (cities), routes, states, etc.

**Integration approach:**

1. Export your All Reach map from Azgaar as **SVG**
2. In the Trilium geomap widget, replace the OpenStreetMap tile layer with `L.imageOverlay(svgUrl, imageBounds)` using the SVG as the base
3. Use Leaflet's `L.CRS.Simple` (pixel coordinate system) instead of the default geographic CRS — this is a ~5 line change
4. Notes with `#geolocation` label (storing pixel `x,y` coordinates from the SVG) will appear as clickable pins on the map
5. **Bonus:** Parse Azgaar's exported JSON to auto-import existing burgs/settlements as lore entries via AllKnower's ETAPI client

**Files to modify:**
- [geomap/](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/widgets/collections/geomap/) — 28 files, but the critical change is ~10-20 lines in the tile layer initialization
- Add `#geolocation` as a promoted attribute to Location and Faction templates

**Azgaar JSON bonus — AllKnower can do this:**
```ts
// Parse exported Azgaar JSON and bulk-create Location notes
const { burgs, states, rivers } = azgaarJson;
for (const burg of burgs) {
    await etapiClient.createNote({ title: burg.name, template: "_template_location" });
    await etapiClient.setAttribute({ name: "geolocation", value: `${burg.x},${burg.y}` });
}
```

**Difficulty:** Medium. The Leaflet CRS.Simple swap is easy; the work is pixel-coordinate alignment with your SVG.

### 5i. Relation maps ✅ ALREADY EXISTS

Trilium has a full **relation map** note type ([relation_map/](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/widgets/type_widgets/relation_map/)) using jsPlumb. Shows visual graph of entity connections.

**No work needed.** Entity relationships defined as Trilium `relation` attributes automatically appear in relation maps.

### 5j. Wiki-style documentary layout ⚠️ MEDIUM

Trilium's current note rendering is clean but not "wiki-style". To get a wiki/World Anvil feel:

**Approach:**

1. Create a CSS class for wiki-layout notes (two-column: sidebar with metadata, main content area)
2. Use the promoted attributes panel (already shows structured fields at top of note) as the "info box"
3. Style it via CSS to look like a Wikipedia/World Anvil article info box
4. Add custom CSS for the note content area: serif fonts, wider paragraphs, image float behaviors

**Files to modify:**
- [PromotedAttributes.css](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/widgets/PromotedAttributes.css) — restyle to look like a wiki infobox
- [PromotedAttributes.tsx](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/widgets/PromotedAttributes.tsx) — potentially modify layout
- [NoteDetail.css](file:///home/allmaker/projects/allknower/AllCodex/apps/client/src/widgets/NoteDetail.css) — overall note content styling

---

## 6. ETAPI Integration with AllKnower

> **Verdict: ✅ STRAIGHTFORWARD — ETAPI is well-documented and complete**

### Available ETAPI endpoints

| Endpoint | Method | What it does |
|---|---|---|
| `/etapi/create-note` | POST | Create a note with title, type, content, parentNoteId |
| `/etapi/notes/:noteId` | GET/PATCH/DELETE | Read, update, delete notes |
| `/etapi/notes/:noteId/content` | GET/PUT | Read/write note body content (HTML for text notes) |
| `/etapi/notes` | GET | Search notes with full query syntax |
| `/etapi/attributes` | POST | Create a label or relation on a note |
| `/etapi/attributes/:id` | GET/PATCH/DELETE | Manage attributes |
| `/etapi/branches` | POST | Create parent-child relationships |
| `/etapi/branches/:id` | GET/PATCH/DELETE | Manage branches |
| `/etapi/notes/:noteId/attachments` | GET | List note attachments |

### How AllKnower creates a lore entry via ETAPI

```
1. POST /etapi/create-note
   Body: { parentNoteId: "<lore-root>", title: "Kaelthar the Wise", type: "text", content: "<html>..." }

2. POST /etapi/attributes  (for each promoted field)
   Body: { noteId: "<new-note>", type: "label", name: "race", value: "Elf" }

3. POST /etapi/attributes  (to attach template)
   Body: { noteId: "<new-note>", type: "relation", name: "template", value: "<character-template-id>" }

4. POST /etapi/attributes  (for relations to other entities)
   Body: { noteId: "<new-note>", type: "relation", name: "affiliatedWith", value: "<faction-note-id>" }
```

### Authentication

ETAPI uses **token-based auth**. Create a token in AllCodex UI → Options → ETAPI, then pass it as `Authorization: <token>` header. AllKnower needs this token in its env config.

### Finding the lore root

AllKnower needs a root note ID under which to create all lore entries. Options:
1. Hardcode it in AllKnower config (`ALLCODEX_LORE_ROOT_ID`)
2. Search for it: `GET /etapi/notes?search=%23loreRoot` (finds the note with `#loreRoot` label)

---

## 7. Difficulty Matrix

| Feature | Difficulty | Reason |
|---|---|---|
| ~~Bun migration~~ | ⛔ SKIPPED | Native modules + Electron = not worth it |
| i18n string renaming | 🟢 EASY | Pure JSON text replacement |
| Branding swap | 🟢 EASY | A few files, straightforward |
| Grimoire CSS theme | 🟢 EASY | CSS variables, well-documented |
| Lore entity templates | 🟢 EASY | Follow existing pattern in `hidden_subtree_templates.ts` |
| Cross-linking | ⚪ FREE | Already built-in |
| ToC | ⚪ FREE | Already built-in |
| Backlinks | ⚪ FREE | Already built-in |
| Search/filter by attributes | ⚪ FREE | Already built-in |
| Tagging | ⚪ FREE | Already built-in |
| To-do lists | ⚪ FREE | Already built-in |
| Relation maps | ⚪ FREE | Already built-in |
| Secrets (note-level) | 🟢 EASY | Modify share renderer to filter `#gmOnly` |
| Secrets (section-level) | 🟡 MEDIUM | CKEditor plugin needed |
| Wiki-style layout | 🟡 MEDIUM | CSS + PromotedAttributes restyle |
| Variables system | 🟡 MEDIUM | Custom widget/script needed |
| Fantasy map (Azgaar SVG) | 🟡 MEDIUM | Leaflet CRS.Simple swap + SVG overlay (~20 lines) |
| Azgaar JSON → lore import | 🟢 EASY | AllKnower parses JSON, creates notes via ETAPI |
| Statblock renderer | 🟡 MEDIUM | Custom render script or new note type |
| ETAPI to AllKnower | 🟢 EASY | Well-documented REST API, just HTTP calls |
| Brain dump UI panel | 🟡 MEDIUM | New widget in AllCodex sidebar that calls AllKnower API |

---

## 8. Recommended Phase Order

### Phase 1: Foundation (1-2 days)
1. ~~Bun migration~~ → **SKIPPED. pnpm forever.**
2. ✅ Branding swap (README, package.json, app_info, ASCII banner)
3. ✅ i18n string renaming (translation.json)
4. ✅ Favicon/icon replacement

### Phase 2: Visual Identity (1-2 days)
5. ✅ Grimoire CSS theme (dark fantasy color palette, fonts, textures)
6. ✅ PromotedAttributes wiki-style infobox restyle
7. ✅ Tree/sidebar styling

### Phase 3: Worldbuilding Templates (1 day)
8. ✅ Add all 8 lore templates to `hidden_subtree_templates.ts`
9. ✅ Add i18n keys for template fields
10. ✅ Test template creation and promoted attribute rendering

### Phase 4: AllKnower Integration (1-2 days)
11. ✅ Set up ETAPI token
12. ✅ Configure AllKnower's ETAPI client with correct endpoints
13. ✅ Test brain dump → ETAPI → note creation pipeline
14. ✅ Test RAG indexer reading notes via ETAPI

### Phase 5: Custom Features (3-5 days)
15. ⚠️ Secrets system (share renderer modification)
16. ⚠️ Variables system (custom widget/script)
17. ⚠️ Fantasy map integration (Leaflet image overlay)
18. ⚠️ Brain dump UI panel in AllCodex sidebar
19. ⚠️ Statblock renderer

### Phase 6: Polish
20. Update CLAUDE.md with AllCodex architecture
21. Write AllCodex README
22. End-to-end testing of all features

---

## Verification Plan

### Automated
- `pnpm run server:test` — existing server unit tests should still pass after branding changes
- `pnpm run client:test` — existing client tests
- `pnpm run test:all` — full test suite

### Manual
1. **Theme verification:** Run `pnpm run server:start`, open `http://localhost:8080`, verify grimoire theme loads correctly
2. **Template verification:** Create a new note, apply Character template, verify all promoted fields appear
3. **ETAPI verification:** Use curl to create a note via ETAPI:
   ```bash
   curl -X POST http://localhost:8080/etapi/create-note \
     -H "Authorization: <token>" \
     -H "Content-Type: application/json" \
     -d '{"parentNoteId":"root","title":"Test Lore","type":"text","content":"<p>Test</p>"}'
   ```
4. **Branding verification:** Check that no "Trilium" text appears in the UI (except in code/technical references)
5. **Search/filter:** Search for `#race=elf` and verify correct results
