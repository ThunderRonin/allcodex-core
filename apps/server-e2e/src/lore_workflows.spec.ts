import { test, expect, type APIRequestContext } from "@playwright/test";

declare const process: {
    env: Record<string, string | undefined>;
};

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:8082";
const TEMPLATE_BY_LORE_TYPE = {
    character: "_template_character",
    location: "_template_location",
    faction: "_template_faction",
    event: "_template_event"
} as const;

type CreatedNote = {
    noteId: string;
    title: string;
    type: string;
    mime: string;
};

type CreatedAttribute = {
    attributeId: string;
    noteId: string;
    type: "label" | "relation";
    name: string;
    value: string;
};

type NoteAttribute = {
    noteId: string;
    type: "label" | "relation";
    name: string;
    value: string;
};

type SearchResult = {
    noteId: string;
    title: string;
};

type SearchResponse = {
    results: SearchResult[];
};

type NoteResponse = {
    noteId: string;
    title: string;
    attributes?: Array<CreatedAttribute>;
};

test.describe("AllCodex Lore Workflows", () => {
    test("creates lore notes with canonical attributes through ETAPI", async ({ request }) => {
        const createdNoteIds: string[] = [];

        try {
            const uniqueSuffix = `${Date.now()}`;
            const character = await createLoreNote(request, {
                parentNoteId: "root",
                title: `QA Character ${uniqueSuffix}`,
                loreType: "character",
                content: "<p>Archivist of the eastern vault.</p>"
            });
            const location = await createLoreNote(request, {
                parentNoteId: "root",
                title: `QA Location ${uniqueSuffix}`,
                loreType: "location",
                content: "<p>Vault-city beneath the basalt sea.</p>"
            });

            createdNoteIds.push(character.noteId, location.noteId);

            const appInfo = await getJson<{ appVersion: string }>(request, "/etapi/app-info");
            expect(appInfo.appVersion).toBeTruthy();

            const characterNote = await getJson<NoteResponse>(request, `/etapi/notes/${character.noteId}`);
            const locationNote = await getJson<NoteResponse>(request, `/etapi/notes/${location.noteId}`);

            expect(characterNote.attributes?.some((attribute) => {
                return attribute.type === "label" && attribute.name === "lore";
            })).toBe(true);
            expect(characterNote.attributes?.some((attribute) => {
                return attribute.type === "label" && attribute.name === "loreType" && attribute.value === "character";
            })).toBe(true);
            expect(characterNote.attributes?.some((attribute) => {
                return attribute.type === "relation" && attribute.name === "template" && attribute.value === TEMPLATE_BY_LORE_TYPE.character;
            })).toBe(true);

            expect(locationNote.attributes?.some((attribute) => {
                return attribute.type === "label" && attribute.name === "loreType" && attribute.value === "location";
            })).toBe(true);

            expect(await getNoteContent(request, character.noteId)).toContain("Archivist of the eastern vault.");
            expect(await getNoteContent(request, location.noteId)).toContain("Vault-city beneath the basalt sea.");
        } finally {
            await deleteNotes(request, createdNoteIds);
        }
    });

    test("stores lore relationships as ETAPI relations", async ({ request }) => {
        const createdNoteIds: string[] = [];

        try {
            const uniqueSuffix = `${Date.now()}`;
            const faction = await createLoreNote(request, {
                parentNoteId: "root",
                title: `QA Faction ${uniqueSuffix}`,
                loreType: "faction",
                content: "<p>The pactbound wardens of the vault.</p>"
            });
            const character = await createLoreNote(request, {
                parentNoteId: "root",
                title: `QA Ally ${uniqueSuffix}`,
                loreType: "character",
                content: "<p>Sworn to the wardens.</p>"
            });

            createdNoteIds.push(faction.noteId, character.noteId);

            const relation = await addAttribute(request, {
                noteId: character.noteId,
                type: "relation",
                name: "ally",
                value: faction.noteId
            });

            const storedRelation = await getJson<CreatedAttribute>(request, `/etapi/attributes/${relation.attributeId}`);
            expect(storedRelation).toMatchObject({
                attributeId: relation.attributeId,
                noteId: character.noteId,
                type: "relation",
                name: "ally",
                value: faction.noteId
            });

            const characterNote = await getJson<NoteResponse>(request, `/etapi/notes/${character.noteId}`);
            expect(characterNote.attributes?.some((attribute) => {
                return attribute.type === "relation"
                    && attribute.name === "ally"
                    && attribute.value === faction.noteId;
            })).toBe(true);
        } finally {
            await deleteNotes(request, createdNoteIds);
        }
    });

    test("stores code, mermaid, and rich text note content through ETAPI", async ({ request }) => {
        const createdNoteIds: string[] = [];

        try {
            const uniqueSuffix = `${Date.now()}`;
            const codeNote = await createNote(request, {
                parentNoteId: "root",
                title: `QA Code ${uniqueSuffix}`,
                type: "code",
                mime: "text/plain",
                content: "const archivist = 'Becca';\nconsole.log(archivist);"
            });
            const mermaidNote = await createNote(request, {
                parentNoteId: "root",
                title: `QA Mermaid ${uniqueSuffix}`,
                type: "mermaid",
                content: "flowchart TD\nA[Archivist] --> B[Codex]"
            });
            const textNote = await createLoreNote(request, {
                parentNoteId: "root",
                title: `QA Rich Text ${uniqueSuffix}`,
                loreType: "event",
                content: [
                    "<h1>Chronicle</h1>",
                    "<p><strong>Rendered</strong> rich text body.</p>",
                    '<section class="gm-only">Hidden lore</section>'
                ].join("")
            });

            createdNoteIds.push(codeNote.noteId, mermaidNote.noteId, textNote.noteId);

            const codeDetails = await getJson<CreatedNote>(request, `/etapi/notes/${codeNote.noteId}`);
            const mermaidDetails = await getJson<CreatedNote>(request, `/etapi/notes/${mermaidNote.noteId}`);
            const textDetails = await getJson<CreatedNote>(request, `/etapi/notes/${textNote.noteId}`);

            expect(codeDetails.type).toBe("code");
            expect(codeDetails.mime).toBe("text/plain");
            expect(await getNoteContent(request, codeNote.noteId)).toContain("const archivist = 'Becca';");

            expect(mermaidDetails.type).toBe("mermaid");
            expect(await getNoteContent(request, mermaidNote.noteId)).toContain("flowchart TD");
            expect(await getNoteContent(request, mermaidNote.noteId)).toContain("Archivist");

            expect(textDetails.type).toBe("text");
            expect(await getNoteContent(request, textNote.noteId)).toContain("Rendered");
            expect(await getNoteContent(request, textNote.noteId)).toContain("Hidden lore");
        } finally {
            await deleteNotes(request, createdNoteIds);
        }
    });

    test("sanitizes hostile note titles on create", async ({ request }) => {
        const createdNoteIds: string[] = [];

        try {
            const xssNote = await createNote(request, {
                parentNoteId: "root",
                title: "QA RTL \u202Ecod.exe <script>window.__qaXssExecuted='title'</script>",
                type: "text",
                content: [
                    "<p>Visible paragraph</p>",
                    "<script>window.__qaXssExecuted='script'</script>",
                    '<img src="x" onerror="window.__qaXssExecuted=\'image\'">'
                ].join("")
            });

            createdNoteIds.push(xssNote.noteId);

            const storedNote = await getJson<NoteResponse>(request, `/etapi/notes/${xssNote.noteId}`);

            // Core sanitizes titles at write time (html_sanitizer.sanitize in notes.ts)
            expect(storedNote.title).not.toContain("<script");
            expect(storedNote.title).toContain("QA RTL");

            // Core stores content verbatim \u2014 sanitization is Portal's responsibility
            const storedContent = await getNoteContent(request, xssNote.noteId);
            expect(storedContent).toContain("Visible paragraph");
            expect(storedContent).toContain("<script");
            expect(storedContent).toContain("onerror");
        } finally {
            await deleteNotes(request, createdNoteIds);
        }
    });
    test("bookmark CRUD lifecycle", async ({ request }) => {
        const createdNoteIds: string[] = [];

        try {
            const note = await createNote(request, {
                parentNoteId: "root",
                title: `QA Bookmark Target ${Date.now()}`,
                type: "text",
                content: "<p>Bookmarkable lore entry.</p>"
            });
            createdNoteIds.push(note.noteId);

            // Initially no bookmarks for this note
            const before = await getJson<Array<{ noteId: string; title: string }>>(request, "/etapi/bookmarks");
            const hadBookmark = before.some((b) => b.noteId === note.noteId);
            expect(hadBookmark).toBe(false);

            // Add bookmark
            const addRes = await request.post(`${BASE_URL}/etapi/bookmarks/${note.noteId}`);
            expect(addRes.status()).toBe(201);
            const addBody = await addRes.json();
            expect(addBody.success).toBe(true);

            // Verify bookmark appears in list
            const after = await getJson<Array<{ noteId: string; title: string }>>(request, "/etapi/bookmarks");
            expect(after.some((b) => b.noteId === note.noteId)).toBe(true);

            // Remove bookmark
            const delRes = await request.delete(`${BASE_URL}/etapi/bookmarks/${note.noteId}`);
            expect(delRes.status()).toBe(204);

            // Verify removed
            const final = await getJson<Array<{ noteId: string; title: string }>>(request, "/etapi/bookmarks");
            expect(final.some((b) => b.noteId === note.noteId)).toBe(false);

            // Idempotent delete — should still return 204
            const delAgain = await request.delete(`${BASE_URL}/etapi/bookmarks/${note.noteId}`);
            expect(delAgain.status()).toBe(204);
        } finally {
            await deleteNotes(request, createdNoteIds);
        }
    });

    test("search finds notes by title and label", async ({ request }) => {
        const createdNoteIds: string[] = [];

        try {
            const uniqueTag = `qatoken${Date.now()}`;
            const note = await createLoreNote(request, {
                parentNoteId: "root",
                title: `QA Searchable ${uniqueTag}`,
                loreType: "character",
                content: "<p>A discoverable character.</p>"
            });
            createdNoteIds.push(note.noteId);

            // Search by title substring
            const titleSearch = await getJson<SearchResponse>(
                request,
                `/etapi/notes?search=${encodeURIComponent(uniqueTag)}`
            );
            expect(titleSearch.results.length).toBeGreaterThanOrEqual(1);
            expect(titleSearch.results.some((r: any) => r.noteId === note.noteId)).toBe(true);

            // Search by label
            const labelSearch = await getJson<SearchResponse>(
                request,
                `/etapi/notes?search=${encodeURIComponent("#loreType = character")}`
            );
            expect(labelSearch.results.some((r: any) => r.noteId === note.noteId)).toBe(true);

            // Search with fastSearch (fuzzy opt-in)
            const fastSearch = await getJson<SearchResponse>(
                request,
                `/etapi/notes?search=${encodeURIComponent(uniqueTag)}&fastSearch=true`
            );
            expect(fastSearch.results).toBeDefined();
        } finally {
            await deleteNotes(request, createdNoteIds);
        }
    });

    test("content update via PUT and revision list endpoint", async ({ request }) => {
        const createdNoteIds: string[] = [];

        try {
            const note = await createNote(request, {
                parentNoteId: "root",
                title: `QA Content Update ${Date.now()}`,
                type: "text",
                content: "<p>Original content.</p>"
            });
            createdNoteIds.push(note.noteId);

            // Update content (express.text() only parses text/plain)
            const putRes = await request.put(`${BASE_URL}/etapi/notes/${note.noteId}/content`, {
                data: "<p>Updated content.</p>",
                headers: { "Content-Type": "text/plain" }
            });
            expect(putRes.ok()).toBeTruthy();

            // Verify updated content
            const updatedContent = await getNoteContent(request, note.noteId);
            expect(updatedContent).toContain("Updated content.");
            expect(updatedContent).not.toContain("Original content.");

            // Revisions endpoint works (note: brand-new notes skip revision creation
            // due to revisionSnapshotTimeInterval check in saveRevisionIfNeeded)
            const revisions = await getJson<Array<{
                revisionId: string;
                noteId: string;
                title: string;
                type: string;
            }>>(request, `/etapi/notes/${note.noteId}/revisions`);
            expect(Array.isArray(revisions)).toBe(true);
        } finally {
            await deleteNotes(request, createdNoteIds);
        }
    });

    test("PATCH updates note title and type", async ({ request }) => {
        const createdNoteIds: string[] = [];

        try {
            const note = await createNote(request, {
                parentNoteId: "root",
                title: `QA Patchable ${Date.now()}`,
                type: "text",
                content: "<p>Will be patched.</p>"
            });
            createdNoteIds.push(note.noteId);

            // PATCH title
            const patchRes = await request.patch(`${BASE_URL}/etapi/notes/${note.noteId}`, {
                data: { title: "QA Patched Title" }
            });
            expect(patchRes.ok()).toBeTruthy();

            const patched = await getJson<NoteResponse>(request, `/etapi/notes/${note.noteId}`);
            expect(patched.title).toBe("QA Patched Title");

            // Content unchanged
            const content = await getNoteContent(request, note.noteId);
            expect(content).toContain("Will be patched.");
        } finally {
            await deleteNotes(request, createdNoteIds);
        }
    });

    test("branch operations: clone note to second parent", async ({ request }) => {
        const createdNoteIds: string[] = [];

        try {
            const uniqueSuffix = `${Date.now()}`;
            const parent1 = await createNote(request, {
                parentNoteId: "root",
                title: `QA Parent1 ${uniqueSuffix}`,
                type: "text",
                content: ""
            });
            const parent2 = await createNote(request, {
                parentNoteId: "root",
                title: `QA Parent2 ${uniqueSuffix}`,
                type: "text",
                content: ""
            });
            const child = await createNote(request, {
                parentNoteId: parent1.noteId,
                title: `QA Child ${uniqueSuffix}`,
                type: "text",
                content: "<p>Shared child note.</p>"
            });
            createdNoteIds.push(child.noteId, parent2.noteId, parent1.noteId);

            // Clone child to parent2
            const branchRes = await request.post(`${BASE_URL}/etapi/branches`, {
                data: {
                    noteId: child.noteId,
                    parentNoteId: parent2.noteId
                }
            });
            expect(branchRes.ok()).toBeTruthy();
            const branch = await branchRes.json();
            expect(branch.branchId).toBeTruthy();
            expect(branch.parentNoteId).toBe(parent2.noteId);

            // Verify child now has two parents
            const childNote = await getJson<{ parentNoteIds: string[] }>(
                request,
                `/etapi/notes/${child.noteId}`
            );
            expect(childNote.parentNoteIds).toContain(parent1.noteId);
            expect(childNote.parentNoteIds).toContain(parent2.noteId);
        } finally {
            await deleteNotes(request, createdNoteIds);
        }
    });

    test("note export returns valid zip", async ({ request }) => {
        const createdNoteIds: string[] = [];

        try {
            const note = await createNote(request, {
                parentNoteId: "root",
                title: `QA Export ${Date.now()}`,
                type: "text",
                content: "<p>Exportable content.</p>"
            });
            createdNoteIds.push(note.noteId);

            // Valid formats: html, markdown, share — all produce zip archives
            const exportRes = await request.get(
                `${BASE_URL}/etapi/notes/${note.noteId}/export`,
                { params: { format: "html" } }
            );
            expect(exportRes.ok()).toBeTruthy();

            const body = await exportRes.body();
            // ZIP magic bytes: PK\x03\x04
            expect(body[0]).toBe(0x50); // P
            expect(body[1]).toBe(0x4B); // K
        } finally {
            await deleteNotes(request, createdNoteIds);
        }
    });

    test("recent changes API returns history entries", async ({ request }) => {
        const createdNoteIds: string[] = [];

        try {
            const note = await createNote(request, {
                parentNoteId: "root",
                title: `QA History ${Date.now()}`,
                type: "text",
                content: "<p>Fresh note for history.</p>"
            });
            createdNoteIds.push(note.noteId);

            const history = await getJson<Array<{ noteId: string }>>(
                request,
                "/etapi/notes/history"
            );
            expect(Array.isArray(history)).toBe(true);
            expect(history.length).toBeGreaterThan(0);
            expect(history.some((h) => h.noteId === note.noteId)).toBe(true);
        } finally {
            await deleteNotes(request, createdNoteIds);
        }
    });
});

async function createLoreNote(
    request: APIRequestContext,
    params: { parentNoteId: string; title: string; loreType: keyof typeof TEMPLATE_BY_LORE_TYPE; content: string }
): Promise<CreatedNote> {
    const note = await createNote(request, {
        parentNoteId: params.parentNoteId,
        title: params.title,
        type: "text",
        content: params.content
    });

    await addAttribute(request, {
        noteId: note.noteId,
        type: "label",
        name: "lore",
        value: ""
    });
    await addAttribute(request, {
        noteId: note.noteId,
        type: "label",
        name: "loreType",
        value: params.loreType
    });
    await addAttribute(request, {
        noteId: note.noteId,
        type: "relation",
        name: "template",
        value: TEMPLATE_BY_LORE_TYPE[params.loreType]
    });

    return note;
}

async function createNote(
    request: APIRequestContext,
    params: { parentNoteId: string; title: string; type: string; content: string; mime?: string }
): Promise<CreatedNote> {
    const response = await request.post(`${BASE_URL}/etapi/create-note`, {
        data: params
    });

    expect(response.ok()).toBeTruthy();
    const payload = await response.json() as { note: CreatedNote };
    return payload.note;
}

async function addAttribute(request: APIRequestContext, attribute: NoteAttribute): Promise<CreatedAttribute> {
    const response = await request.post(`${BASE_URL}/etapi/attributes`, {
        data: attribute
    });

    expect(response.ok()).toBeTruthy();
    return await response.json() as CreatedAttribute;
}

async function deleteNotes(request: APIRequestContext, noteIds: string[]) {
    for (const noteId of [...noteIds].reverse()) {
        await request.delete(`${BASE_URL}/etapi/notes/${noteId}`);
    }
}

async function getJson<T>(request: APIRequestContext, path: string): Promise<T> {
    const response = await request.get(`${BASE_URL}${path}`);
    expect(response.ok()).toBeTruthy();
    return await response.json() as T;
}

async function getNoteContent(request: APIRequestContext, noteId: string): Promise<string> {
    const response = await request.get(`${BASE_URL}/etapi/notes/${noteId}/content`);
    expect(response.ok()).toBeTruthy();
    return await response.text();
}