import { sanitizeUrl } from "@braintree/sanitize-url";
import escapeHtml from "escape-html";
import { t } from "i18next";
import { HTMLElement, Options, parse, TextNode } from "node-html-parser";

import becca from "../becca/becca.js";
import BAttachment from '../becca/entities/battachment.js';
import type BBranch from "../becca/entities/bbranch.js";
import BNote from "../becca/entities/bnote.js";
import { assetUrlFragment } from "../services/asset_path.js";
import { generateCss, getIconPacks, MIME_TO_EXTENSION_MAPPINGS, ProcessedIconPack } from "../services/icon_packs.js";
import log from "../services/log.js";
import utils from "../services/utils.js";
import SAttachment from "./shaca/entities/sattachment.js";
import SBranch from "./shaca/entities/sbranch.js";
import type SNote from "./shaca/entities/snote.js";
import shaca from "./shaca/shaca.js";
import shareRoot from "./share_root.js";

const templateCache: Map<string, string> = new Map();

/**
 * Represents the output of the content renderer.
 */
export interface Result {
    header: string;
    content: string | Buffer | undefined;
    /** Set to `true` if the provided content should be rendered as empty. */
    isEmpty?: boolean;
}

interface Subroot {
    note?: SNote | BNote;
    branch?: SBranch | BBranch
}

type GetNoteFunction = (id: string) => SNote | BNote | null;

function getSharedSubTreeRoot(note: SNote | BNote | undefined): Subroot {
    if (!note || note.noteId === shareRoot.SHARE_ROOT_NOTE_ID) {
        // share root itself is not shared
        return {};
    }

    // every path leads to share root, but which one to choose?
    // for the sake of simplicity, URLs are not note paths
    const parentBranch = note.getParentBranches()[0];

    if (note instanceof BNote) {
        return {
            note,
            branch: parentBranch
        };
    }

    if (parentBranch.parentNoteId === shareRoot.SHARE_ROOT_NOTE_ID) {
        return {
            note,
            branch: parentBranch
        };
    }

    return getSharedSubTreeRoot(parentBranch.getParentNote());
}


export function getContent(note: SNote | BNote) {
    if (note.isProtected) {
        return {
            header: "",
            content: "<p>Protected note cannot be displayed</p>",
            isEmpty: false
        };
    }

    // GM-only notes are hidden from shared/public output
    if (note.hasLabel("gmOnly")) {
        return {
            header: "",
            content: "",
            isEmpty: true
        };
    }

    const result: Result = {
        content: note.getContent(),
        header: "",
        isEmpty: false
    };

    if (note.type === "text") {
        renderText(result, note);
    } else if (note.type === "code") {
        renderCode(result);
    } else if (note.type === "mermaid") {
        renderMermaid(result, note);
    } else if (["image", "canvas", "mindMap"].includes(note.type)) {
        renderImage(result, note);
    } else if (note.type === "file") {
        renderFile(note, result);
    } else if (note.type === "book") {
        result.isEmpty = true;
    } else if (note.type === "webView") {
        renderWebView(note, result);
    } else {
        result.content = `<p>${t("content_renderer.note-cannot-be-displayed")}</p>`;
    }

    return result;
}

function renderIndex(result: Result) {
    result.content += '<ul id="index">';

    const rootNote = shaca.getNote(shareRoot.SHARE_ROOT_NOTE_ID);

    for (const childNote of rootNote.getChildNotes()) {
        const isExternalLink = childNote.hasLabel("shareExternalLink");
        const href = isExternalLink ? childNote.getLabelValue("shareExternalLink") : `./${childNote.shareId}`;
        const target = isExternalLink ? `target="_blank" rel="noopener noreferrer"` : "";
        result.content += `<li><a class="${childNote.type}" href="${href}" ${target}>${childNote.escapedTitle}</a></li>`;
    }

    result.content += "</ul>";
}

/**
 * Expands {{variableName}} placeholders in the document using JSON stored
 * in any note carrying the #worldVariables label.  The note content must be
 * a JSON object whose keys map to replacement strings.
 *
 * Example note content: { "currency": "Aurens", "capital": "Solara" }
 * Usage in text: "The currency of the realm is {{currency}}."
 */
function applyWorldVariables(document: HTMLElement) {
    // Look for the world-variables note in the share tree.
    const varNotes = Object.values(shaca.notes).filter(n => n.hasLabel("worldVariables"));
    if (varNotes.length === 0) return;

    let vars: Record<string, string> = {};
    for (const varNote of varNotes) {
        try {
            const raw = varNote.getContent();
            if (typeof raw === "string") {
                Object.assign(vars, JSON.parse(raw));
            }
        } catch (err) {
            log.error(`worldVariables note "${varNote.noteId}" contains invalid JSON, skipping. Error: ${err}`);
        }
    }
    if (Object.keys(vars).length === 0) return;

    const VAR_RE = /\{\{([^{}]+?)\}\}/g;

    // Walk text nodes and replace placeholders.
    function walkNode(node: HTMLElement) {
        for (const child of node.childNodes) {
            if (child instanceof TextNode) {
                const original = child.rawText;
                const replaced = original.replace(VAR_RE, (_, name) => {
                    const val = vars[name.trim()];
                    return val !== undefined ? escapeHtml(val) : `{{${name}}}`;
                });
                if (replaced !== original) {
                    child.replaceWith(new TextNode(replaced));
                }
            } else {
                walkNode(child as unknown as HTMLElement);
            }
        }
    }

    walkNode(document);
}

function renderText(result: Result, note: SNote | BNote) {
    if (typeof result.content !== "string") return;
    const parseOpts: Partial<Options> = {
        blockTextElements: {}
    };
    const document = parse(result.content || "", parseOpts);

    // Process include notes.
    for (const includeNoteEl of document.querySelectorAll("section.include-note")) {
        const noteId = includeNoteEl.getAttribute("data-note-id");
        if (!noteId) continue;

        const note = shaca.getNote(noteId);
        if (!note) continue;

        const includedResult = getContent(note);
        if (typeof includedResult.content !== "string") continue;

        const includedDocument = parse(includedResult.content, parseOpts).childNodes;
        if (includedDocument) {
            includeNoteEl.replaceWith(...includedDocument);
        }
    }

    // Strip GM-only sections from shared output (elements with class 'gm-only').
    for (const gmEl of document.querySelectorAll(".gm-only")) {
        gmEl.remove();
    }

    // Expand {{variableName}} world variables from the note labeled #worldVariables.
    applyWorldVariables(document);

    result.isEmpty = document.textContent?.trim().length === 0 && document.querySelectorAll("img").length === 0;

    const getNote: GetNoteFunction = note instanceof BNote
        ? (noteId: string) => becca.getNote(noteId)
        : (noteId: string) => shaca.getNote(noteId);
    const getAttachment = note instanceof BNote
        ? (attachmentId: string) => becca.getAttachment(attachmentId)
        : (attachmentId: string) => shaca.getAttachment(attachmentId);

    if (!result.isEmpty) {
        // Process attachment links.
        for (const linkEl of document.querySelectorAll("a")) {
            const href = linkEl.getAttribute("href");

            // Preserve footnotes.
            if (href?.startsWith("#fn")) {
                continue;
            }

            if (href?.startsWith("#")) {
                handleAttachmentLink(linkEl, href, getNote, getAttachment);
            }

            if (linkEl.classList.contains("reference-link")) {
                cleanUpReferenceLinks(linkEl, getNote);
            }
        }

        result.content = document.innerHTML ?? "";

        if (note.hasLabel("shareIndex")) {
            renderIndex(result);
        }
    }
}

function handleAttachmentLink(linkEl: HTMLElement, href: string, getNote: GetNoteFunction, getAttachment: (id: string) => BAttachment | SAttachment | null) {
    const linkRegExp = /attachmentId=([a-zA-Z0-9_]+)/g;
    let attachmentMatch;
    if ((attachmentMatch = linkRegExp.exec(href))) {
        const attachmentId = attachmentMatch[1];
        const attachment = getAttachment(attachmentId);

        if (attachment) {
            linkEl.setAttribute("href", `api/attachments/${attachmentId}/download`);
            linkEl.classList.add(`attachment-link`);
            linkEl.classList.add(`role-${attachment.role}`);
            linkEl.childNodes.length = 0;
            linkEl.appendChild(new TextNode(attachment.title));
        } else {
            linkEl.removeAttribute("href");
            log.error(`Broken attachment link detected in shared note: unable to find attachment with ID ${attachmentId}`);
        }
    } else {
        const [notePath] = href.split("?");
        const notePathSegments = notePath.split("/");
        const noteId = notePathSegments[notePathSegments.length - 1];
        const linkedNote = getNote(noteId);
        if (linkedNote) {
            const isExternalLink = linkedNote.hasLabel("shareExternalLink");
            const href = isExternalLink ? linkedNote.getLabelValue("shareExternalLink") : `./${linkedNote.shareId}`;
            if (href) {
                linkEl.setAttribute("href", href);
            }
            if (isExternalLink) {
                linkEl.setAttribute("target", "_blank");
                linkEl.setAttribute("rel", "noopener noreferrer");
            }
            linkEl.classList.add(`type-${linkedNote.type}`);
        } else {
            log.error(`Broken link detected in shared note: unable to find note with ID ${noteId}`);
            linkEl.removeAttribute("href");
        }
    }
}

/**
 * Processes reference links to ensure that they are up to date. More specifically, reference links contain in their HTML source code the note title at the time of the linking. It can be changed in the mean-time or the note can become protected, which leaks information.
 *
 * @param linkEl the <a> element to process.
 */
function cleanUpReferenceLinks(linkEl: HTMLElement, getNote: GetNoteFunction) {
    // Note: this method is basically a reimplementation of getReferenceLinkTitleSync from the link service of the client.
    const href = linkEl.getAttribute("href") ?? "";

    // Handle attachment reference links
    if (linkEl.classList.contains("attachment-link")) {
        const title = linkEl.innerText;
        linkEl.innerHTML = `<span><span class="tn-icon bx bx-download"></span>${utils.escapeHtml(title)}</span>`;
        return;
    }

    const noteId = href.split("/").at(-1);
    const note = noteId ? getNote(noteId) : undefined;
    if (!note) {
        // If a note is not found, simply replace it with a text.
        linkEl.replaceWith(new TextNode(linkEl.innerText));
    } else if (note.isProtected) {
        linkEl.innerHTML = "[protected]";
    } else {
        linkEl.innerHTML = `<span><span class="${note.getIcon()}"></span>${utils.escapeHtml(note.title)}</span>`;
    }
}

/**
 * Renders a code note.
 */
export function renderCode(result: Result) {
    if (typeof result.content !== "string" || !result.content?.trim()) {
        result.isEmpty = true;
    } else {
        const preEl = new HTMLElement("pre", {});
        preEl.appendChild(new TextNode(result.content));
        result.content = preEl.outerHTML;
    }
}

function renderMermaid(result: Result, note: SNote | BNote) {
    if (typeof result.content !== "string") {
        return;
    }

    result.content = `
<img src="api/images/${note.noteId}/${note.encodedTitle}?${note.utcDateModified}">
<hr>
<details>
    <summary>Chart source</summary>
    <pre>${escapeHtml(result.content)}</pre>
</details>`;
}

function renderImage(result: Result, note: SNote | BNote) {
    result.content = `<img src="api/images/${note.noteId}/${note.encodedTitle}?${note.utcDateModified}">`;
}

function renderFile(note: SNote | BNote, result: Result) {
    if (note.mime === "application/pdf") {
        result.content = `<iframe class="pdf-view" src="../pdfjs/web/viewer.html?file=../../../share/api/notes/${note.noteId}/view"></iframe>`;
    } else {
        result.content = `<button type="button" onclick="location.href='api/notes/${note.noteId}/download'">Download file</button>`;
    }
}

function renderWebView(note: SNote | BNote, result: Result) {
    const url = note.getLabelValue("webViewSrc");
    if (!url) return;

    result.content = `<iframe class="webview" src="${sanitizeUrl(url)}" sandbox="allow-same-origin allow-scripts allow-popups"></iframe>`;
}

export default {
    getContent
};
