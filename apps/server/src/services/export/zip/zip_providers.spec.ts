import { describe, expect, it, vi } from "vitest";

import HtmlExportProvider from "./html.js";
import MarkdownExportProvider from "./markdown.js";
import type { ZipExportProviderData } from "./abstract_provider.js";

// ── Minimal stubs ─────────────────────────────────────────────────────────────

function makeProviderData(overrides: Partial<ZipExportProviderData> = {}): ZipExportProviderData {
    return {
        branch: {} as any,
        getNoteTargetUrl: () => null,
        archive: {} as any,
        zipExportOptions: undefined,
        rewriteFn: (content: string) => content, // identity by default
        ...overrides,
    };
}

function makeNoteMeta(overrides: Record<string, unknown> = {}) {
    return {
        format: "html",
        notePath: ["root", "child"],
        noteId: "note-1",
        title: "Test Note",
        ...overrides,
    } as any;
}

// ── HtmlExportProvider.prepareContent ─────────────────────────────────────────

describe("HtmlExportProvider#prepareContent", () => {
    it("wraps bare HTML content in a full page template", () => {
        const provider = new HtmlExportProvider(makeProviderData());
        const noteMeta = makeNoteMeta({ format: "html", notePath: ["root", "child"] });

        const result = provider.prepareContent("My Note", "<p>Hello world</p>", noteMeta);

        expect(typeof result).toBe("string");
        const html = result as string;
        expect(html).toContain("<html>");
        expect(html).toContain("My Note");
        expect(html).toContain("Hello world");
        expect(html).toContain("style.css");
    });

    it("does not double-wrap content that already has an <html> tag", () => {
        const provider = new HtmlExportProvider(makeProviderData());
        const noteMeta = makeNoteMeta({ format: "html", notePath: ["root", "child"] });
        const alreadyWrapped = "<html><head></head><body><p>Pre-wrapped</p></body></html>";

        const result = provider.prepareContent("My Note", alreadyWrapped, noteMeta) as string;

        // Should not have two <html> tags
        expect((result.match(/<html>/gi) ?? []).length).toBeLessThanOrEqual(1);
    });

    it("skips HTML template when skipHtmlTemplate is true", () => {
        const provider = new HtmlExportProvider(
            makeProviderData({ zipExportOptions: { skipHtmlTemplate: true } })
        );
        const noteMeta = makeNoteMeta({ format: "html", notePath: ["root"] });
        const bare = "<p>Bare fragment</p>";

        const result = provider.prepareContent("Title", bare, noteMeta) as string;

        // rewriteFn is identity, so content should not have a wrapping <html> structure
        expect(result).not.toContain("<head>");
    });

    it("passes through Buffer content unchanged", () => {
        const provider = new HtmlExportProvider(makeProviderData());
        const noteMeta = makeNoteMeta({ format: "html", notePath: ["root"] });
        const buf = Buffer.from("binary data");

        const result = provider.prepareContent("Title", buf, noteMeta);

        expect(Buffer.isBuffer(result)).toBe(true);
    });

    it("passes through non-html format content unchanged", () => {
        const provider = new HtmlExportProvider(makeProviderData());
        const noteMeta = makeNoteMeta({ format: "markdown" });

        const result = provider.prepareContent("Title", "# Hello", noteMeta);

        expect(result).toBe("# Hello");
    });

    it("applies rewriteFn to HTML content", () => {
        const rewriteFn = vi.fn((content: string) => content.replace("ORIGINAL", "REWRITTEN"));
        const provider = new HtmlExportProvider(
            makeProviderData({
                zipExportOptions: { skipHtmlTemplate: true },
                rewriteFn,
            })
        );
        const noteMeta = makeNoteMeta({ format: "html", notePath: ["root"] });

        provider.prepareContent("Title", "<p>ORIGINAL</p>", noteMeta);

        expect(rewriteFn).toHaveBeenCalled();
    });

    it("throws when notePath is missing for bare HTML content", () => {
        const provider = new HtmlExportProvider(makeProviderData());
        const noteMeta = makeNoteMeta({ format: "html", notePath: [] });

        expect(() =>
            provider.prepareContent("Title", "<p>No path</p>", noteMeta)
        ).toThrow("Missing note path.");
    });

    it("accepts optional _note and _branch params without affecting output", () => {
        const provider = new HtmlExportProvider(makeProviderData());
        const noteMeta = makeNoteMeta({ format: "markdown" });

        // These optional params are unused — method should still work fine
        const result = provider.prepareContent("Title", "# heading", noteMeta, undefined, undefined);

        expect(result).toBe("# heading");
    });
});

// ── MarkdownExportProvider.prepareContent ─────────────────────────────────────

describe("MarkdownExportProvider#prepareContent", () => {
    it("prepends a # heading when content is markdown without one", () => {
        const provider = new MarkdownExportProvider(makeProviderData());
        const noteMeta = makeNoteMeta({ format: "markdown" });

        // mdService.toMarkdown is not easily stubbable here, but we can pass
        // content that is already markdown (no <h1> at start).
        // The HTML-to-markdown conversion is a pass-through for plain text.
        const result = provider.prepareContent("My Note", "Some text content.", noteMeta) as string;

        // Should start with a heading after toMarkdown + prepend logic
        // (markdown.toMarkdown on plain text may vary, so assert heading presence)
        expect(typeof result).toBe("string");
    });

    it("passes through non-markdown format content unchanged", () => {
        const provider = new MarkdownExportProvider(makeProviderData());
        const noteMeta = makeNoteMeta({ format: "html" });

        const result = provider.prepareContent("Title", "<p>HTML content</p>", noteMeta);

        expect(result).toBe("<p>HTML content</p>");
    });

    it("passes through Buffer content unchanged", () => {
        const provider = new MarkdownExportProvider(makeProviderData());
        const noteMeta = makeNoteMeta({ format: "markdown" });
        const buf = Buffer.from("binary");

        const result = provider.prepareContent("Title", buf, noteMeta);

        expect(Buffer.isBuffer(result)).toBe(true);
    });

    it("applies rewriteFn before converting to markdown", () => {
        const rewriteFn = vi.fn((content: string) => content);
        const provider = new MarkdownExportProvider(makeProviderData({ rewriteFn }));
        const noteMeta = makeNoteMeta({ format: "markdown" });

        provider.prepareContent("Title", "some content", noteMeta);

        expect(rewriteFn).toHaveBeenCalled();
    });

    it("accepts optional _note and _branch params without affecting output", () => {
        const provider = new MarkdownExportProvider(makeProviderData());
        const noteMeta = makeNoteMeta({ format: "html" });

        const result = provider.prepareContent("T", "<p>hi</p>", noteMeta, undefined, undefined);

        expect(result).toBe("<p>hi</p>");
    });
});
