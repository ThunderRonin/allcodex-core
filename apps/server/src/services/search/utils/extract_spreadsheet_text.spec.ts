import { describe, it, expect } from "vitest";
import { extractSpreadsheetText } from "./extract_spreadsheet_text.js";

describe("extractSpreadsheetText", () => {
    it("extracts cell values from array-of-rows format", () => {
        const content = JSON.stringify([
            [{ value: "Name" }, { value: "Age" }],
            [{ value: "Alice" }, { value: "30" }],
        ]);
        expect(extractSpreadsheetText(content)).toBe("Name Age Alice 30");
    });

    it("extracts cell values from sheets/rows/cells format", () => {
        const content = JSON.stringify({
            sheets: [
                {
                    rows: [
                        { cells: [{ value: "X" }, { value: "Y" }] },
                        { cells: [{ value: "Z" }] },
                    ],
                },
            ],
        });
        expect(extractSpreadsheetText(content)).toBe("X Y Z");
    });

    it("returns empty string for invalid JSON", () => {
        expect(extractSpreadsheetText("{not valid json")).toBe("");
    });

    it("returns empty string for empty or null content", () => {
        expect(extractSpreadsheetText("")).toBe("");
        expect(extractSpreadsheetText("null")).toBe("");
    });

    it("handles numeric cell values by converting to string", () => {
        const content = JSON.stringify([
            [{ value: 42 }, { value: 3.14 }],
        ]);
        expect(extractSpreadsheetText(content)).toBe("42 3.14");
    });

    it("skips cells without a value property", () => {
        const content = JSON.stringify([
            [{ value: "keep" }, { style: "bold" }, { value: null }],
        ]);
        expect(extractSpreadsheetText(content)).toBe("keep");
    });

    it("handles multiple sheets", () => {
        const content = JSON.stringify({
            sheets: [
                { rows: [{ cells: [{ value: "Sheet1" }] }] },
                { rows: [{ cells: [{ value: "Sheet2" }] }] },
            ],
        });
        expect(extractSpreadsheetText(content)).toBe("Sheet1 Sheet2");
    });
});
