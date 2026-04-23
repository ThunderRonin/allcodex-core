import type BBranch from "../../../becca/entities/bbranch.js";
import type BNote from "../../../becca/entities/bnote.js";
import NoteMeta from "../../meta/note_meta"
import { ZipExportProvider } from "./abstract_provider.js"
import mdService from "../markdown.js";

export default class MarkdownExportProvider extends ZipExportProvider {

    prepareMeta() { }

    prepareContent(title: string, content: string | Buffer, noteMeta: NoteMeta, _note?: BNote, _branch?: BBranch): string | Buffer {
        if (noteMeta.format === "markdown" && typeof content === "string") {
            content = this.rewriteFn(content, noteMeta);
            content = mdService.toMarkdown(content);

            if (content.trim().length > 0 && !content.startsWith("# ")) {
                content = `\
# ${title}\r
${content}`;
            }
        }
        return content;
    }

    afterDone() { }

}
