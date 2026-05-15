import { trimIndentation } from "@triliumnext/commons";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { buildShareNote, buildShareNotes } from "../test/shaca_mocking.js";
import { getContent, renderCode, type Result } from "./content_renderer.js";

describe("content_renderer", () => {
    beforeAll(() => {
        vi.mock("../becca/becca_loader.js", () => ({
            default: {
                load: vi.fn(),
                loaded: Promise.resolve()
            }
        }));
    });

    it("Reports protected notes not being renderable", () => {
        const note = buildShareNote({ isProtected: true });
        const result = getContent(note);
        expect(result.content).toStrictEqual("<p>Protected note cannot be displayed</p>");
    });

    describe("Text note", () => {
        it("parses simple note", () => {
            const content = trimIndentation`\
                <figure class="image image-style-align-right image_resized" style="width:29.84%;">
                    <img style="aspect-ratio:150/150;" src="api/attachments/TnyuBzEXJZln/image/Trilium Demo_icon-color.svg" width="150" height="150">
                </figure>
                <p>
                    <strong>
                        Welcome to Trilium Notes!
                    </strong>
                </p>`;
            const note = buildShareNote({ content });
            const result = getContent(note);
            expect(result.content).toStrictEqual(content);
        });

        it("renders a theme-song block ahead of shared article content", () => {
            const note = buildShareNote({
                content: "<p>The house band plays.</p>",
                "#themeSongUrl": "https://open.spotify.com/track/5ChkMS8OtdzJeqyybCc9R5?si=abc"
            });

            const result = getContent(note);

            expect(result.content).toContain('class="theme-song-card"');
            expect(result.content).toContain("https://open.spotify.com/embed/track/5ChkMS8OtdzJeqyybCc9R5");
            expect(result.content).toContain("<p>The house band plays.</p>");
        });

        it("renders a theme-song block from trusted Spotify embed iframe HTML", () => {
            const note = buildShareNote({
                content: "<p>The house band plays.</p>",
                "#themeSongUrl": '<iframe src="https://open.spotify.com/embed/track/7j43FohbLVulScL7S9sQZk?utm_source=generator&theme=0"></iframe>'
            });

            const result = getContent(note);

            expect(result.content).toContain('class="theme-song-card"');
            expect(result.content).toContain("https://open.spotify.com/embed/track/7j43FohbLVulScL7S9sQZk");
            expect(result.content).toContain("<p>The house band plays.</p>");
        });

        it("omits invalid theme-song URLs from shared output", () => {
            const note = buildShareNote({
                content: "<p>Signal remains clean.</p>",
                "#themeSongUrl": "javascript:alert(1)"
            });

            const result = getContent(note);

            expect(result.content).not.toContain("theme-song-card");
            expect(result.content).toContain("<p>Signal remains clean.</p>");
        });

        it("renders included notes", () => {
            buildShareNotes([
                { id: "subnote1", content: `<p>Foo</p><div>Bar</div>` },
                { id: "subnote2", content: `<strong>Baz</strong>` }
            ]);
            const note = buildShareNote({
                id: "note1",
                content: trimIndentation`\
                    <p>Before</p>
                    <section class="include-note" data-note-id="subnote1" data-box-size="small">&nbsp;</section>
                    <section class="include-note" data-note-id="subnote2" data-box-size="small">&nbsp;</section>
                    <p>After</p>
                `
            });
            const result = getContent(note);
            expect(result.content).toStrictEqual(trimIndentation`\
                <p>Before</p>
                <p>Foo</p><div>Bar</div>
                <strong>Baz</strong>
                <p>After</p>
            `);
        });

        it("passes through code blocks without syntax highlighting", () => {
            const note = buildShareNote({
                id: "note",
                content: trimIndentation`\
                    <h2>
                        Defining the options
                    </h2>
                    <pre>
                    <code class="language-text-x-trilium-auto">&lt;t t-name="module.SectionWidthOption"&gt;
                    &lt;BuilderRow label.translate="Section Width"&gt;
                    &lt;/BuilderRow&gt;
                    &lt;/t&gt;</code>
                    </pre>
                `
            });
            const result = getContent(note);
            expect(result.content).toStrictEqual(trimIndentation`\
                <h2>
                    Defining the options
                </h2>
                <pre>
                <code class="language-text-x-trilium-auto">&lt;t t-name="module.SectionWidthOption"&gt;
                &lt;BuilderRow label.translate="Section Width"&gt;
                &lt;/BuilderRow&gt;
                &lt;/t&gt;</code>
                </pre>
            `);
        });

        describe("Reference links", () => {
            it("handles attachment link", () => {
                const content = trimIndentation`\
                    <h1>Test</h1>
                    <p>
                        <a class="reference-link" href="#root/iwTmeWnqBG5Q?viewMode=attachments&amp;attachmentId=q14s2Id7V6pp">
                            5863845791835102555.mp4
                        </a>
                        &nbsp;
                    </p>
                `;
                const note = buildShareNote({
                    content,
                    attachments: [ { id: "q14s2Id7V6pp", title: "5863845791835102555.mp4" } ]
                });
                const result = getContent(note);
                expect(result.content).toStrictEqual(trimIndentation`\
                    <h1>Test</h1>
                    <p>
                        <a class="reference-link attachment-link role-file" href="api/attachments/q14s2Id7V6pp/download"><span><span class="tn-icon bx bx-download"></span>5863845791835102555.mp4</span></a>
                        &nbsp;
                    </p>
                `);
            });

            it("handles protected notes", () => {
                buildShareNote({
                    id: "MSkxxCFbBsYP",
                    title: "Foo",
                    isProtected: true
                });
                const note = buildShareNote({
                    id: "note",
                    content: trimIndentation`\
                        <p>
                            <a class="reference-link" href="#root/zaIItd4TM5Ly/MSkxxCFbBsYP">
                                Foo
                            </a>
                        </p>
                    `
                });
                const result = getContent(note);
                expect(result.content).toStrictEqual(trimIndentation`\
                    <p>
                        <a class="reference-link type-text" href="./MSkxxCFbBsYP">[protected]</a>
                    </p>
                `);
            });

            it("handles missing notes", () => {
                const note = buildShareNote({
                    id: "note",
                    content: trimIndentation`\
                        <p>
                            <a class="reference-link" href="#root/zaIItd4TM5Ly/AsKxyCFbBsYp">
                                Foo
                            </a>
                        </p>
                    `
                });
                const result = getContent(note);
                const content = (result.content as string).replaceAll(/\s/g, "");
                expect(content).toStrictEqual("<p>Foo</p>");
            });

            it("properly escapes note title", () => {
                buildShareNote({
                    id: "MSkxxCFbBsYP",
                    title: "The quick <strong>brown</strong> fox"
                });
                const note = buildShareNote({
                    id: "note",
                    content: trimIndentation`\
                        <p>
                            <a class="reference-link" href="#root/zaIItd4TM5Ly/MSkxxCFbBsYP">
                            Hi
                            </a>
                        </p>
                    `
                });
                const result = getContent(note);
                expect(result.content).toStrictEqual(trimIndentation`\
                    <p>
                        <a class="reference-link type-text" href="./MSkxxCFbBsYP"><span><span class="tn-icon bx bx-note"></span>The quick &lt;strong&gt;brown&lt;/strong&gt; fox</span></a>
                    </p>
                `);
            });
        });
    });

    describe("File note", () => {
        it("renders PDF with root-absolute pdfjs viewer path", () => {
            const note = buildShareNote({
                id: "pdfNote123",
                type: "file",
                mime: "application/pdf"
            });
            const result = getContent(note);
            expect(result.content).toContain('src="/pdfjs/web/viewer.html?file=/share/api/notes/pdfNote123/view"');
            expect(result.content).toContain('class="pdf-view"');
            // Ensure the old broken relative path is NOT present
            expect(result.content).not.toContain('src="../pdfjs');
        });
    });

    it("suppresses draft note content", () => {
        const note = buildShareNote({ content: "<p>Secret draft</p>", "#draft": "" });
        const result = getContent(note);
        expect(result.content).toBe("");
        expect(result.isEmpty).toBe(true);
    });

    it("suppresses gmOnly note content", () => {
        const note = buildShareNote({ content: "<p>GM secrets</p>", "#gmOnly": "" });
        const result = getContent(note);
        expect(result.content).toBe("");
        expect(result.isEmpty).toBe(true);
    });

    it("renderIndex excludes draft and gmOnly notes", () => {
        // content is required so the mock getContent is wired up instead of the real SQLite path
        const root = buildShareNote({
            id: "_share",
            title: "Share",
            content: "<p>Index page</p>",
            "#shareRoot": "",
            "#shareIndex": "",
            children: [
                { title: "Visible Note", content: "<p>ok</p>" },
                { title: "Draft Note", content: "<p>draft</p>", "#draft": "" },
                { title: "GM Note", content: "<p>gm</p>", "#gmOnly": "" }
            ]
        });
        const result = getContent(root);
        expect(result.content).toContain("Visible Note");
        expect(result.content).not.toContain("Draft Note");
        expect(result.content).not.toContain("GM Note");
    });

    // Skipped: TextNode.replaceWith is not available in current node-html-parser version.
    // applyWorldVariables calls child.replaceWith() on TextNode instances, which fails.
    // See: content_renderer.ts applyWorldVariables
    it.skip("expands world variables in text content", () => {
        buildShareNote({
            id: "worldVarsNote",
            content: JSON.stringify({ currency: "Aurens", capital: "Solara" }),
            "#worldVariables": ""
        });
        const note = buildShareNote({
            content: "<p>The currency is {{currency}} and the capital is {{capital}}.</p>"
        });
        const result = getContent(note);
        expect(result.content).toContain("Aurens");
        expect(result.content).toContain("Solara");
        expect(result.content).not.toContain("{{currency}}");
        expect(result.content).not.toContain("{{capital}}");
    });

    describe("renderCode", () => {
        it("identifies empty content", () => {
            const emptyResult: Result = {
                header: "",
                content: "   "
            };
            renderCode(emptyResult);
            expect(emptyResult.isEmpty).toBeTruthy();
        });

        it("identifies unsupported content type", () => {
            const emptyResult: Result = {
                header: "",
                content: Buffer.from("Hello world")
            };
            renderCode(emptyResult);
            expect(emptyResult.isEmpty).toBeTruthy();
        });

        it("wraps code in <pre>", () => {
            const result: Result = {
                header: "",
                content: "\tHello\nworld"
            };
            renderCode(result);
            expect(result.isEmpty).toBeFalsy();
            expect(result.content).toBe("<pre>\tHello\nworld</pre>");
        });
    });
});
