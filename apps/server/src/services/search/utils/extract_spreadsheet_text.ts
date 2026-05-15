"use strict";

/**
 * Extracts searchable text from spreadsheet JSON content.
 *
 * Spreadsheet notes (type "code", MIME "text/x-spreadsheet") store cell data
 * as JSON.  Two layouts are handled:
 *
 *  1. Array-of-rows:  `[[{value: "A"}, {value: "B"}], [{value: "C"}]]`
 *  2. Sheets/rows/cells: `{sheets: [{rows: [{cells: [{value: "X"}]}]}]}`
 *
 * All cell values are coerced to strings and joined with spaces.
 */

interface CellObj {
    value?: unknown;
    [key: string]: unknown;
}

interface SheetRow {
    cells?: CellObj[];
    [key: string]: unknown;
}

interface Sheet {
    rows?: SheetRow[];
    [key: string]: unknown;
}

interface SheetsWrapper {
    sheets?: Sheet[];
    [key: string]: unknown;
}

export function extractSpreadsheetText(content: string): string {
    if (!content) {
        return "";
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(content);
    } catch {
        return "";
    }

    const values: string[] = [];

    if (Array.isArray(parsed)) {
        // Array-of-rows format: [[{value: "A"}, ...], ...]
        for (const row of parsed) {
            if (!Array.isArray(row)) continue;
            for (const cell of row) {
                if (cell && typeof cell === "object" && "value" in cell && cell.value != null) {
                    values.push(String(cell.value));
                }
            }
        }
    } else if (parsed && typeof parsed === "object") {
        // Sheets/rows/cells format
        const wrapper = parsed as SheetsWrapper;
        const sheets = wrapper.sheets;
        if (Array.isArray(sheets)) {
            for (const sheet of sheets) {
                if (!sheet || !Array.isArray(sheet.rows)) continue;
                for (const row of sheet.rows) {
                    if (!row || !Array.isArray(row.cells)) continue;
                    for (const cell of row.cells) {
                        if (cell && typeof cell === "object" && "value" in cell && cell.value != null) {
                            values.push(String(cell.value));
                        }
                    }
                }
            }
        }
    }

    return values.join(" ");
}
