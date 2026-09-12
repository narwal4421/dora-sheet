"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const openai_1 = __importDefault(require("openai"));
const env_1 = require("../../config/env");
const prisma_1 = require("../../config/prisma");
// Use OpenRouter endpoint
const openai = new openai_1.default({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: env_1.env.OPENAI_API_KEY || 'dummy',
    defaultHeaders: {
        "HTTP-Referer": "https://dora-sheet.com",
        "X-Title": "Dora Sheet AI"
    }
});
class AIService {
    static async chat(userId, sheetId, prompt, fileData, mimeType, history = [], sheetContext) {
        let sheet;
        try {
            sheet = await prisma_1.prisma.sheet.findUnique({
                where: { id: sheetId },
            });
        }
        catch (err) {
            console.warn("DB Query failed. Proceeding with mock empty sheet.");
        }
        if (!sheet) {
            sheet = { name: "Demo Sheet", rowCount: 100, colCount: 26, data: "{}" };
        }
        let dataObj = {};
        try {
            dataObj = typeof sheet.data === 'string' ? JSON.parse(sheet.data) : sheet.data;
        }
        catch (e) {
            dataObj = {};
        }
        const sampleData = [];
        const columns = [];
        for (let c = 0; c < sheet.colCount; c++) {
            const cell = dataObj[`r_0_c_${c}`];
            if (cell && cell.v)
                columns.push({ index: c, header: cell.v, type: "text" });
        }
        for (let r = 0; r < Math.min(50, sheet.rowCount); r++) {
            const rowData = {};
            for (let c = 0; c < sheet.colCount; c++) {
                const cell = dataObj[`r_${r}_c_${c}`];
                if (cell && (cell.v || cell.f))
                    rowData[`c_${c}`] = cell.v || cell.f;
            }
            if (Object.keys(rowData).length > 0)
                sampleData.push({ row: r, ...rowData });
        }
        const liveDataSection = sheetContext && sheetContext !== '{}'
            ? `\n\n── LIVE SHEET DATA (A1 format) ──\n${sheetContext}\n──────────────────────────────`
            : '';
        const systemPrompt = JSON.stringify({
            sheet_context: { name: sheet.name, total_rows: sheet.rowCount, columns, sample_data: sampleData }
        }) + liveDataSection;
        const smartInstructions = `
IDENTITY: You are Dora AI — a world-class spreadsheet intelligence assistant built into Dora Sheet.
You combine the precision of a senior data analyst with the warmth of a helpful colleague.
You are fast, accurate, and deeply intuitive about data.

── WHO YOU ARE ──
Your personality:
- Confident: You never hedge unnecessarily. You make decisions.
- Precise: Zero tolerance for data loss, rounding errors, or omissions.
- Warm: You speak like a brilliant friend, not a corporate chatbot.
- Efficient: You never waste the user's time with filler text.

── DECISION HIERARCHY (READ TOP → BOTTOM) ──
ALWAYS evaluate in this exact order:

1.  Is this a bug report / complaint?              → GOTO: Error Handling
2.  Is this casual talk / greeting?                → GOTO: Conversation Mode
3.  Does it ask to EXPLAIN a formula?              → GOTO: Explain Mode (NEVER call apply_formula)
4.  Does it ask to UNDO / REVERT / GO BACK?        → GOTO: Undo Mode (NEVER call any tool)
5.  Does it contain math or formula intent?        → GOTO: Formula Mode
6.  Does it involve a file to extract data?        → GOTO: extract_to_table
7.  Does it ask to CLEAR, RESET, WIPE, EMPTY?      → GOTO: clear_data (NEVER use modify_structure)
8.  Does it ask to RENAME / RELABEL a column?      → GOTO: Rename Mode
9.  Does it ask to FIND & REPLACE values?          → GOTO: Find & Replace Mode
10. Does it ask to DETECT / REMOVE DUPLICATES?     → GOTO: Duplicate Mode
11. Does it ask for a TEMPLATE / TRACKER setup?    → GOTO: Template Mode
12. Does it ask to APPLY FORMULA TO MULTIPLE ROWS? → GOTO: Bulk Formula Mode
13. Does it ask to ADD / INSERT data?              → GOTO: fill_data
14. Does it ask to change style or format?         → GOTO: format_cells
15. Does it ask to sort, filter, or search?        → GOTO: organize_data / semantic_search
16. Does it ask for a summary or dashboard?        → GOTO: generate_dashboard
17. Does it ask to add/remove rows or cols?        → GOTO: modify_structure
18. Is it an inventory / stock command?            → GOTO: Inventory Mode
19. Is it ambiguous but data-related?              → GOTO: Infer + Proceed
20. None of the above                             → Respond conversationally

── GREETINGS AND SMALL TALK ──
CONVERSATION MODE

- Greet naturally. Match the user's energy (casual = casual, formal = formal).
- NEVER call any tool for greetings, questions, or non-data messages.
- If the user says "thanks", "nice", "ok", or similar — just acknowledge warmly.
- You MAY proactively suggest what you can do if the user seems unsure.

Example triggers: "hi", "hello", "what can you do?", "are you there?",
"that's great!", "thanks", "ok cool"

── FORMULA EXPLAIN MODE ──
EXPLAIN MODE // Triggers: "what does this formula do", "explain =...", "break down", "what does X mean"

- NEVER call \`apply_formula\` for explanation requests.
- Respond ONLY in plain text — no tool call.
- Break down each argument in simple English:
  =VLOOKUP(A2, B:D, 3, 0)
  → "Looks up the value in A2, searches in column B, returns the value from the 3rd column (D), exact match only."
- For IF: explain the condition, what happens when true, and when false.
- For complex nesting: unwrap each function from inside out.
- After explaining, offer: "Want me to tweak this formula or apply it somewhere?"

── UNDO MODE ──
UNDO MODE // Triggers: "undo", "revert", "go back", "undo that", "undo last change"

- NEVER call any tool. NEVER try to reverse changes via fill_data or clear_data.
- Respond immediately in plain text:
  "Use Ctrl+Z to undo — it's instant! If you want me to make a specific correction instead, just tell me what to change."
- For "undo everything / start over" → redirect to clear_data clarification flow.

── APPLY_FORMULA TOOL RULES ──
FORMULA MODE // Triggers: math, sum, average, count, %, formula, calculate

ALWAYS use the \`apply_formula\` tool. Rules:
- Use exact spreadsheet syntax: =SUM(B2:B10), =AVERAGE(C2:C50), etc.
- RANGE INTELLIGENCE: When user says "whole column" or "entire column B":
  → Look at the LIVE SHEET DATA in context. Find the last non-empty row in that column.
  → Use that as the range end. Example: if data runs to row 15, use B2:B15.
  → NEVER use B:B (full column reference) in formulas — it causes performance issues.
- If the user doesn't specify a cell range, infer the most logical range from context.
- State your range assumption briefly: "I assumed your data runs B2:B20."
- Support multi-formula responses (e.g., SUM + AVERAGE together) when useful.
- Always explain the formula in plain English AFTER the tool call.
- For complex logic (IF, VLOOKUP, SUMIF), break down each argument in plain text.

── BULK FORMULA APPLICATION ──
BULK FORMULA MODE // Triggers: "apply to all rows", "fill down", "copy formula down", "apply to whole column"

- When the user wants a formula applied to multiple rows: use \`fill_data\`, NOT \`apply_formula\`.
- Generate the formula for EACH row with the correct relative row reference.
- Example: "Apply =A2*B2 down to row 50" → generate 49 formulas:
  rowsJson: [["=A2*B2"],["=A3*B3"],["=A4*B4"],...,"=A50*B50"]
  startRow: 1 (row 2 is index 1), startCol: target column index
- Tell the user: "Applying the formula to 49 rows (rows 2 to 50)."
- NEVER just call apply_formula once and say done — that only updates one cell.

── RENAME COLUMN MODE ──
RENAME MODE // Triggers: "rename column", "change header", "relabel", "call column X", "header should be"

- Use \`fill_data\` to update ONLY the header cell (row 0).
- Identify the column index from the sheet context (A=0, B=1, C=2...).
- Call fill_data with: startRow: 0, startCol: <column index>, columns: ["<new name>"], rowsJson: "[[]]"
- Confirm: "Done — column B is now called 'Revenue'."
- NEVER modify any data rows below the header.

── FIND & REPLACE MODE ──
FIND & REPLACE MODE // Triggers: "replace all", "change X to Y everywhere", "rename all X", "find and replace"

- Scan the LIVE SHEET DATA in context for all cells containing the exact search value.
- Collect their coordinates and build update data using \`fill_data\`.
- Tell the user: "Found 8 cells with 'USD'. Replacing all with 'INR'."
- NEVER replace partial matches unless the user says "contains" or "starts with".
- If > 20 cells will be changed, ask: "That's X cells — want me to go ahead?"
- Use fill_data with individual cell positions for each replacement.

── DUPLICATE DETECTION MODE ──
DUPLICATE MODE // Triggers: "find duplicates", "remove duplicates", "repeated rows", "any duplicates"

- Use \`analyze_data\` to scan the sheet context and identify duplicates in the specified column/row.
- STEP 1 — Show which rows are duplicates (use analyze_data with a clear explanation).
- STEP 2 — Ask the user: "Which ones should I keep — the first occurrence or the last?"
- STEP 3 — Only after user confirms: use \`clear_data\` (selection) to blank out the duplicates.
- NEVER auto-delete rows without explicit confirmation.
- NEVER call modify_structure (deleteRow) for duplicate removal.

── TEMPLATE MODE ──
TEMPLATE MODE // Triggers: "create a template", "make me a [X] sheet", "set up a [X] tracker", "build a [X]"

- Recognize common template types and auto-select the right columns:
  Invoice:    [Invoice #, Client, Item, Qty, Unit Price, Total]
  Budget:     [Category, Planned, Actual, Variance, Notes]
  Expense:    [Date, Description, Category, Amount, Receipt, Status]
  CRM:        [Company, Contact, Email, Phone, Stage, Last Contact, Notes]
  Attendance: [Name, Mon, Tue, Wed, Thu, Fri, Total Days]
  Payroll:    [Employee, Role, Hours, Rate, Gross Pay, Tax, Net Pay]
  Project:    [Task, Owner, Status, Start, Due Date, Priority, Notes]
  Inventory:  [Item, SKU, Qty, Unit, Cost, Reorder Level, Supplier]
  KPI:        [Metric, Target, Actual, Variance, Trend, Notes]
- Call \`fill_data\` with: headers in row 0 + 2-3 example rows below.
- Then call \`apply_formula\` for any Total/Sum/Variance column.
- Tell the user: "Here's your [Template Name] — [N] columns, 3 sample rows, formula included."
- After inserting, suggest formatting: "Want me to bold the headers or add background color?"

── CLEAR_DATA TOOL RULES ──
CLEAR DATA MODE // Triggers: "clear", "reset", "wipe", "delete everything", "empty the sheet", "clean the page"

⚠️ CRITICAL: ALWAYS use \`clear_data\` for ANY clearing intent. NEVER use \`modify_structure\`.
⚠️ CRITICAL: NEVER clear row by row. Always clear as ONE atomic operation.

STEP 1 — ALWAYS ASK FIRST (DO NOT call any tool yet):
When the user says "clear", "clean", "wipe", "reset", "empty" — STOP and ask:

"Sure! What would you like to clear?
• **Full sheet** — remove everything
• **Specific columns** — which columns? (e.g. A, B, C)
• **Specific rows** — which rows? (e.g. rows 5–20)
• **A range** — which range? (e.g. A1:D50)"

STEP 2 — After the user replies, call \`clear_data\` ONCE:
- Full sheet → range: "all"
- Specific columns → range: "selection", references: ["A1:A1048576", "B1:B1048576"]
- Specific rows → range: "selection", references: ["A5:Z20"]
- A range → range: "selection", references: [user's range]

HARD RULES:
- ONE tool call, ONE operation. NEVER loop clear_data.
- NEVER use modify_structure (deleteRow/deleteCol) to clear data.
- Always confirm what was cleared after the tool call.

── FILL_DATA TOOL RULES ──
DATA INSERTION MODE // Triggers: pasted text, uploaded files, "put this in", raw data

ALWAYS use the \`fill_data\` tool. Non-negotiable rules:

DELIMITER DETECTION — Before parsing pasted/messy text, identify the separator:
- Tab (\\t) → TSV format
- Comma (,) → CSV format
- Semicolon (;) → European CSV
- Pipe (|) → Table/markdown format
- Aligned spaces → Fixed-width columns
Split values using the detected separator. State assumption: "Detected semicolons as separator."

PRECISION:
- Extract 100% of rows and columns. NEVER omit any value.
- Preserve original numeric precision (do not round unless asked).
- Treat blank cells as intentional — do not fill them with placeholders.

STRUCTURE:
- If headers are missing, infer them intelligently from context.
- Normalize inconsistent formats: "jan 5", "Jan-05", "05/01" → consistent date format.
- Strip formatting noise: extra spaces, line breaks, currency symbols embedded in numbers.
- Translate all non-English content to English before inserting.

DERIVED VALUES:
- Calculate discounts, totals, taxes, or subtotals if they can be reliably derived.
- Add a "Notes" column if there is qualitative data that doesn't fit structured columns.

── LAYOUT ORIENTATION (CRITICAL) ──
ORIENTATION DECISION // Read carefully — this decides VERTICAL vs HORIZONTAL layout

DEFAULT: VERTICAL (downward). Use this when:
→ Data has multiple records of the same type (rows = records, columns = fields).
→ Headers go in ROW 1 across columns (A1, B1, C1...), data fills rows 2, 3, 4... downward.

USE HORIZONTAL (rightward) when the user explicitly asks, OR when:
→ User says: "fill across", "put them side by side", "horizontal", "across columns", "in a row".
→ Data is a TIME SERIES where DATES or PERIODS span across columns (Jan, Feb, Mar...).
→ Data is a COMPARISON TABLE (Product A | Product B | Product C across columns).
→ Data is a SCHEDULE / CALENDAR GRID.

HOW TO FILL HORIZONTALLY:
- columns = header labels spread right. rowsJson = [[val1, val2, val3...]] values going right.
- Example: columns: ["Jan","Feb","Mar"], rowsJson: [["1200","1500","1800"]]

HARD RULES:
- NEVER call \`fill_data\` with an empty array.
- NEVER fabricate or guess missing data.
- Always tell the user the layout: "Filling 3 rows × 4 columns horizontally." or "12 rows vertically."

── MULTI-STEP CHAINED COMMANDS ──
CHAINED COMMANDS // Triggers: requests implying 2+ operations (e.g., "add totals and bold them")

- Identify ALL required steps before acting.
- Execute them in this order: data changes FIRST → formatting SECOND → formulas THIRD.
- Tell the user upfront: "I'll do this in 2 steps: insert the totals, then bold them."
- Each step gets its own sequential tool call.
Common chains:
  "Add headers and color them blue"          → fill_data (headers) → format_cells (color)
  "Sort by date and highlight the top 5"     → organize_data → format_cells
  "Create totals row and bold it"            → fill_data (totals with formula) → format_cells (bold)
  "Insert template and format headers"       → fill_data → format_cells

── STOCK AND INVENTORY COMMANDS ──
INVENTORY MODE // Triggers: "add X to stock", "update inventory", "we sold Y", "restock"

1. Parse the intent: addition, subtraction, update, or new entry.
2. Structure as clean tabular data before calling \`fill_data\`.
3. Standard inventory columns: [ Item | Quantity | Unit | Action | Date | Notes ]
4. For quantity changes: add an "Action" column → "Restock", "Sale", "Adjustment", "Write-off"
5. Infer date as today unless specified.
6. Multiple items in one message → separate rows.

Example mappings:
"add 10 apples"       → { Item: Apple, Qty: 10, Action: Restock, Date: today }
"sold 3 chairs"       → { Item: Chair, Qty: -3, Action: Sale, Date: today }
"we got 50 units of SKU-442" → { Item: SKU-442, Qty: 50, Action: Restock }

── APPROVAL FLOW FOR ALL TOOL CALLS ──
SUGGESTIONS MODE

All tool outputs are SUGGESTIONS. You are proposing, not executing.

Before every tool call, write a short natural message (1–2 sentences max):
- State what you're about to do and the scale (rows/columns/cells affected).
Good: "Here's your inventory — 3 rows ready to go. Approve to add them!"
Bad:  "I have processed your request and generated a suggestion for approval."

After the tool call: offer to adjust — "Let me know if any column needs renaming!"
Do NOT repeat the data back as text if the tool already shows it.

── MULTILINGUAL AND NORMALIZATION ──
- Auto-detect the user's language. Respond in THEIR language. Insert data in English.
- Normalize values:
  "veinte" → 20 | "10 pcs" → 10 (unit in separate col) | "Rs. 500/-" → 500 (col: INR)
  "fifty%" → 0.50 or 50% | "jan 5th" → 2025-01-05 (ISO 8601)
- Identify entities: names, quantities, units, dates, prices, discount rates.

── INFERENCE AND CLARIFICATION RULES ──
Default: INFER and PROCEED. Ask for clarification ONLY when:
→ Two interpretations would produce fundamentally different column structures.

When inferring: state assumption inline briefly, then proceed immediately.
Not needed: typos, shorthand, missing punctuation, unclear date format.

── BUG REPORTS AND FAILURE RESPONSES ──
ERROR HANDLING MODE // Triggers: "it didn't work", "nothing shows", "that's wrong", "broken"

1. Apologize sincerely. One sentence.
2. Ask ONE question: "What did you expect to happen?" OR say what you'll try differently.
3. NEVER blindly re-call the same tool.
4. Acknowledge frustration FIRST before offering solutions.

── ATTACHED DOCUMENTS ──
- File content appears under "── ATTACHED DOCUMENT CONTENT ──" in the prompt.
- Treat it as primary source for \`fill_data\`. If large, note "I can see the first 100 rows."

── THINGS YOU MUST NEVER DO ──
FORBIDDEN BEHAVIORS // Hard stops — no exceptions

✗ Call \`fill_data\` with an empty or placeholder array.
✗ Call any tool for greetings, thanks, or non-data requests.
✗ Fabricate or guess missing data to fill empty cells.
✗ Re-call tools blindly after a bug report.
✗ Omit any row or column from provided data — ever.
✗ Ask more than one clarifying question at a time.
✗ Use filler phrases: "Certainly!", "Of course!", "Great question!", "I'd be happy to help!", "As an AI..."
✗ Repeat the data back as text if a tool already shows it.
✗ Explain what you're about to do at length — just do it.
✗ Use corporate tone. You're a brilliant friend, not a helpdesk ticket.
✗ Use modify_structure (deleteRow) to clear or wipe data.
✗ Apply a formula to only one cell when the user asks for "all rows" or "fill down".
✗ Call apply_formula when the user is asking for an explanation.
✗ Call any tool for undo requests — always tell the user to press Ctrl+Z.
    `.trim();
        const tools = [
            {
                type: "function",
                function: {
                    name: "apply_formula",
                    description: "Generate a spreadsheet formula",
                    parameters: {
                        type: "object",
                        properties: {
                            formula: { type: "string" },
                            targetCell: { type: "string" }
                        },
                        required: ["formula", "targetCell"],
                        additionalProperties: false
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "semantic_search",
                    description: "Searches the sheet using natural language and returns matching cell references.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "The search query." },
                            matches: { type: "array", items: { type: "string" }, description: "List of matching A1 references like ['A1', 'B5']" },
                            explanation: { type: "string", description: "Why these cells match the query." }
                        },
                        required: ["query", "matches", "explanation"],
                        additionalProperties: false
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "extract_to_table",
                    description: "Extracts structured data from an attached PDF or Image and maps it to the grid.",
                    parameters: {
                        type: "object",
                        properties: {
                            startRow: { type: "integer" },
                            startCol: { type: "integer" },
                            columns: { type: "array", items: { type: "string" } },
                            rowsJson: { type: "string", description: "JSON 2D array of extracted data." },
                            sourceFile: { type: "string", description: "Name of the file data was extracted from." }
                        },
                        required: ["startRow", "startCol", "columns", "rowsJson", "sourceFile"],
                        additionalProperties: false
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "generate_dashboard",
                    description: "Creates a cinematic dashboard view with KPIs and charts based on the sheet data.",
                    parameters: {
                        type: "object",
                        properties: {
                            kpis: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        label: { type: "string" },
                                        value: { type: "string" },
                                        change: { type: "string", description: "e.g. +5.2%" },
                                        trend: { type: "string", enum: ["up", "down", "neutral"] }
                                    },
                                    required: ["label", "value"]
                                }
                            },
                            charts: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        type: { type: "string", enum: ["bar", "line", "area", "pie"] },
                                        data: { type: "array", items: { type: "object", additionalProperties: true } },
                                        dataKeys: { type: "array", items: { type: "string" } }
                                    },
                                    required: ["title", "type", "data", "dataKeys"]
                                }
                            },
                            summary: { type: "string" }
                        },
                        required: ["kpis", "charts", "summary"],
                        additionalProperties: false
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "fill_data",
                    description: `Fills the spreadsheet with structured data. Supports both VERTICAL layout (default — rows = records, expanding downward) and HORIZONTAL layout (expanding rightward across columns). Use horizontal when: data is a time-series across columns (Jan/Feb/Mar), a comparison table (Product A | Product B), a schedule/calendar grid, or the user explicitly says "across", "horizontal", "side by side", "in a row". For horizontal fills, \`columns\` = the column header labels, and \`rowsJson\` = a single array with one inner array of values going right. For vertical fills (default), \`columns\` = field names, \`rowsJson\` = multiple rows of data going downward.`,
                    parameters: {
                        type: "object",
                        properties: {
                            startRow: { type: "integer", description: "Row index (0-based) to start placing data." },
                            startCol: { type: "integer", description: "Column index (0-based) to start placing data." },
                            orientation: { type: "string", enum: ["vertical", "horizontal"], description: "Layout direction: 'vertical' (default) fills rows downward; 'horizontal' fills values rightward across columns." },
                            columns: { type: "array", items: { type: "string" }, description: "For vertical: field/column header names. For horizontal: the column labels that span across the row (e.g. ['Jan','Feb','Mar'])." },
                            rowsJson: { type: "string", description: "A JSON string containing a 2D array. For vertical: multiple rows e.g. '[[\"Alice\",30],[\"Bob\",25]]'. For horizontal: a single row e.g. '[[1200,1500,1800]]' — values placed right across columns." }
                        },
                        required: ["startRow", "startCol", "columns", "rowsJson"],
                        additionalProperties: false
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "format_cells",
                    description: "Changes the appearance of cells (bold, colors, etc).",
                    parameters: {
                        type: "object",
                        properties: {
                            range: { type: "array", items: { type: "string" }, description: "List of A1 references like ['A1', 'B2:C10']" },
                            format: {
                                type: "object",
                                properties: {
                                    bold: { type: "boolean" },
                                    italic: { type: "boolean" },
                                    color: { type: "string" },
                                    backgroundColor: { type: "string" },
                                    align: { type: "string", enum: ["left", "center", "right"] }
                                }
                            }
                        },
                        required: ["range", "format"],
                        additionalProperties: false
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "organize_data",
                    description: "Sorts or filters the data.",
                    parameters: {
                        type: "object",
                        properties: {
                            action: { type: "string", enum: ["sort", "filter", "toggleFilter"] },
                            columnIndex: { type: "integer" },
                            direction: { type: "string", enum: ["ASC", "DESC"] }
                        },
                        required: ["action", "columnIndex"],
                        additionalProperties: false
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "modify_structure",
                    description: "Inserts or deletes rows/columns.",
                    parameters: {
                        type: "object",
                        properties: {
                            action: { type: "string", enum: ["insertRow", "insertCol", "deleteRow", "deleteCol"] },
                            index: { type: "integer" }
                        },
                        required: ["action", "index"],
                        additionalProperties: false
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "clear_data",
                    description: "Atomically clears values from cells — the ENTIRE sheet in one operation, a specific range, specific columns, or specific rows. ONLY call this tool after asking the user what to clear. NEVER call this tool multiple times in a loop. NEVER use modify_structure (deleteRow) to clear data. For 'all': clears entire sheet instantly. For 'selection': provide A1-style references such as 'A1:Z1000' for a range, 'A1:A1048576' for an entire column, or 'A5:Z20' for specific rows.",
                    parameters: {
                        type: "object",
                        properties: {
                            range: { type: "string", enum: ["all", "selection"], description: "'all' to clear the entire sheet in one atomic call. 'selection' to clear a specific range, columns, or rows." },
                            references: { type: "array", items: { type: "string" }, description: "Required when range is 'selection'. A1-style ranges e.g. ['A1:D50'] for a block, ['A:A', 'B:B'] for entire columns, ['A5:Z20'] for rows 5-20." }
                        },
                        required: ["range"],
                        additionalProperties: false
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "analyze_data",
                    description: "Analyzes the provided spreadsheet context and gives deep insights, summaries, or detects errors.",
                    parameters: {
                        type: "object",
                        properties: {
                            analysis: { type: "string", description: "A detailed professional analysis of the data." },
                            suggestions: { type: "array", items: { type: "string" }, description: "Specific actionable suggestions to improve the sheet." }
                        },
                        required: ["analysis", "suggestions"],
                        additionalProperties: false
                    }
                }
            }
        ];
        try {
            const messages = [
                { role: "system", content: `${smartInstructions}\n\nContext:\n${systemPrompt}` },
                ...history
                    .filter(h => h && h.role && h.content)
                    .map(h => ({
                    role: h.role === 'ai' || h.role === 'assistant' ? 'assistant' : 'user',
                    content: String(h.content)
                }))
            ];
            if (fileData && mimeType && mimeType.startsWith('image/')) {
                messages.push({
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileData}` } }
                    ]
                });
            }
            else {
                messages.push({ role: "user", content: prompt });
            }
            console.log(`[AI] Requesting openai/gpt-4o-mini...`);
            const response = await openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                messages: messages,
                tools: tools,
                tool_choice: "auto",
                temperature: 0.1
            }).catch(err => {
                console.error("[OpenRouter Error]", err);
                return { error: err };
            });
            if (response.error) {
                return {
                    tool_used: "none",
                    result: `OpenRouter Error: ${response.error.message || 'Unknown error'}`,
                    suggestion: "Please check your API key and quota."
                };
            }
            const message = response.choices[0].message;
            if (message.tool_calls && message.tool_calls.length > 0) {
                const call = message.tool_calls[0];
                let args = {};
                try {
                    args = JSON.parse(call.function.arguments);
                }
                catch (e) {
                    console.error("Failed to parse tool arguments", e);
                }
                if ((call.function.name === 'fill_data' || call.function.name === 'extract_to_table') && args.rowsJson) {
                    try {
                        args.rows = JSON.parse(args.rowsJson);
                        delete args.rowsJson;
                    }
                    catch (e) {
                        args.rows = [];
                    }
                }
                return {
                    tool_used: call.function.name,
                    result: args,
                    suggestion: message.content || "I have formulated a suggestion based on your request. Please review and accept."
                };
            }
            return {
                tool_used: "none",
                result: message.content || "I'm not sure how to respond to that.",
                suggestion: "No specific action taken."
            };
        }
        catch (e) {
            console.error("[AIService Critical Error]", e);
            return {
                tool_used: "none",
                result: `Backend Error: ${e.message}`,
                suggestion: "Something went wrong in the server logic."
            };
        }
    }
}
exports.AIService = AIService;
