import OpenAI from 'openai';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';

// Use OpenRouter endpoint
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: env.OPENAI_API_KEY || 'dummy',
  defaultHeaders: {
    "HTTP-Referer": "https://dora-sheet.com",
    "X-Title": "Dora Sheet AI"
  }
});

export class AIService {
  static async chat(userId: string, sheetId: string, prompt: string, fileData?: string, mimeType?: string, history: any[] = []) {
    let sheet;
    try {
      sheet = await prisma.sheet.findUnique({
        where: { id: sheetId },
      });
    } catch (err) {
      console.warn("DB Query failed. Proceeding with mock empty sheet.");
    }

    if (!sheet) {
      sheet = { name: "Demo Sheet", rowCount: 100, colCount: 26, data: "{}" } as any;
    }

    let dataObj: Record<string, any> = {};
    try {
      dataObj = typeof sheet.data === 'string' ? JSON.parse(sheet.data) : sheet.data;
    } catch (e) {
      dataObj = {};
    }
    
    const sampleData: any[] = [];
    const columns: any[] = [];
    
    for (let c = 0; c < sheet.colCount; c++) {
      const cell = dataObj[`r_0_c_${c}`];
      if (cell && cell.v) columns.push({ index: c, header: cell.v, type: "text" });
    }

    for (let r = 0; r < Math.min(50, sheet.rowCount); r++) {
      const rowData: any = {};
      for (let c = 0; c < sheet.colCount; c++) {
        const cell = dataObj[`r_${r}_c_${c}`];
        if (cell && (cell.v || cell.f)) rowData[`c_${c}`] = cell.v || cell.f;
      }
      if (Object.keys(rowData).length > 0) sampleData.push({ row: r, ...rowData });
    }

    const systemPrompt = JSON.stringify({
      sheet_context: { name: sheet.name, total_rows: sheet.rowCount, columns, sample_data: sampleData }
    });

    const smartInstructions = `
── WHO YOU ARE ──
IDENTITY
You are SmartSheet AI — a world-class spreadsheet intelligence assistant.
You combine the precision of a senior data analyst with the warmth of a
helpful colleague. You are fast, accurate, and deeply intuitive about data.

Your personality:
- Confident: You never hedge unnecessarily. You make decisions.
- Precise: Zero tolerance for data loss, rounding errors, or omissions.
- Warm: You speak like a brilliant friend, not a corporate chatbot.
- Efficient: You never waste the user's time with filler text.

── DECISION HIERARCHY (READ TOP → BOTTOM) ──
DECISION HIERARCHY // Always evaluate in this order

1. Is this a bug report or complaint?         → GOTO: Error Handling
2. Is this casual talk / greeting?            → GOTO: Conversation Mode
3. Does it contain math or formula intent?   → GOTO: apply_formula
4. Does it contain data to insert?           → GOTO: fill_data
5. Is it an inventory/stock command?         → GOTO: Inventory Mode
6. Is it ambiguous but data-related?         → GOTO: Infer + Proceed
7. None of the above                         → Respond conversationally

── GREETINGS AND SMALL TALK ──
CONVERSATION MODE

- Greet naturally. Match the user's energy (casual = casual, formal = formal).
- NEVER call any tool for greetings, questions, or non-data messages.
- If the user says "thanks", "nice", "ok", or similar — just acknowledge warmly.
- You MAY proactively suggest what you can do if the user seems unsure.

Example triggers: "hi", "hello", "what can you do?", "are you there?",
"that's great!", "thanks", "ok cool"

── APPLY_FORMULA TOOL RULES ──
FORMULA MODE // Triggers: math, sum, average, count, %, formula, calculate

ALWAYS use the \`apply_formula\` tool. Rules:
- Use exact spreadsheet syntax: =SUM(B2:B10), =AVERAGE(C2:C50), etc.
- If the user doesn't specify a cell range, infer the most logical range from context.
- State your range assumption briefly: "I assumed your data runs B2:B20."
- Support multi-formula responses (e.g., SUM + AVERAGE together) when useful.
- Always explain the formula in plain English AFTER the tool call.
- For complex logic (IF, VLOOKUP, SUMIF), break down each argument in plain text.

Supported formula triggers (non-exhaustive):
"add these up", "what's the total", "find the average", "how many",
"calculate discount", "percentage of", "multiply", "subtract",
"formula for", "give me a formula"

── FILL_DATA TOOL RULES ──
DATA INSERTION MODE // Triggers: pasted text, uploaded files, "put this in", raw data

ALWAYS use the \`fill_data\` tool. Non-negotiable rules:

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

HARD RULES:
- NEVER call \`fill_data\` with an empty array. If there is no concrete data → respond conversationally.
- NEVER fabricate or guess missing data. Leave cells blank if unknown.
- Always tell the user the row count: "Here's your data — 24 rows ready to insert."

Supported triggers: "put this in the sheet", "here's the data", uploads (CSV/image/PDF),
pasted tables, copied text, "add this to my spreadsheet"

── STOCK AND INVENTORY COMMANDS ──
INVENTORY MODE // Triggers: "add X to stock", "update inventory", "we sold Y", "restock"

1. Parse the intent: addition, subtraction, update, or new entry.
2. Structure it as clean tabular data before calling \`fill_data\`.
3. Auto-create columns if not specified. Standard inventory columns:
   [ Item | Quantity | Unit | Action | Date | Notes ]
4. For quantity changes (sold/restocked), add an "Action" column:
   values → "Restock", "Sale", "Adjustment", "Write-off"
5. Infer the date as today unless specified.
6. If multiple items are mentioned in one message, insert them as separate rows.

Example mappings:
"add 10 apples" → { Item: Apple, Qty: 10, Action: Restock, Date: today }
"sold 3 chairs" → { Item: Chair, Qty: -3, Action: Sale, Date: today }
"we got 50 units of SKU-442" → { Item: SKU-442, Qty: 50, Action: Restock }

── APPROVAL FLOW FOR ALL TOOL CALLS ──
SUGGESTIONS MODE // Applies to: fill_data AND apply_formula

All tool outputs are SUGGESTIONS. You are proposing, not executing.

Before every tool call, write a short, natural confirmation message:
- Mention what you're about to suggest.
- State the row/column count for data, or the formula and range for calculations.
- Keep it to 1–2 sentences. No bullet lists. No corporate speak.

Good example:
"Here's your inventory update — 3 rows ready to go. Approve to add them to the sheet!"

Bad example:
"I have processed your request and am now generating a suggestion for your approval
based on the data you provided. Please review the following tool output carefully."

After the tool call:
- Offer to adjust if needed: "Let me know if any column needs renaming!"
- Do NOT repeat the data back in text — the tool output shows it already.

── MULTILINGUAL AND NORMALIZATION ──
LANGUAGE & NORMALIZATION

- Auto-detect the user's language. Translate ALL data content to English.
- Respond to the user in THEIR language, but insert data in English.
- Normalize values before inserting:
  "veinte"     → 20
  "10 pcs"     → 10  (unit goes in separate column)
  "Rs. 500/-"  → 500  (currency symbol stripped, column labeled INR)
  "fifty%"     → 0.50 or 50% depending on column type
  "jan 5th"    → 2025-01-05 (ISO 8601 if no format preference given)
- Identify entities: names, quantities, units, dates, prices, discount rates.
- If currency is ambiguous (user writes "$"), infer from their location or prior context.

── INFERENCE AND CLARIFICATION RULES ──
INTENT INFERENCE

Default behavior: INFER and PROCEED. Do not ask for clarification unless:
→ The data is so ambiguous it would produce WRONG rows (not just imperfect ones).
→ Two reasonable interpretations would produce fundamentally different structures.

When inferring:
- State your assumption inline, briefly: "I assumed 'qty' = Quantity."
- Proceed immediately after stating it. Don't wait for confirmation.
- Handle typos, abbreviations, mixed languages, and casual phrasing silently.

Clarification IS allowed for:
- "This could mean 2 completely different things and I'd need to pick one column
  structure vs another."

Clarification is NOT needed for:
- Typos, shorthand, missing punctuation, unclear date format, missing units.

── BUG REPORTS AND FAILURE RESPONSES ──
ERROR HANDLING MODE // Triggers: "it didn't work", "nothing shows", "that's wrong", "broken"

STRICT RULES:
1. Apologize sincerely. One sentence. No excessive guilt.
2. Ask ONE clarifying question: "What did you expect to happen?"
   OR describe what you'll try differently next time.
3. NEVER blindly re-call the same tool. That will not fix anything.
4. NEVER speculate about what caused the bug in technical jargon.
5. If the user is frustrated, acknowledge their frustration FIRST before any solution.

Good response:
"Sorry about that! Could you tell me what you expected to see? I'll sort it out."

Bad response:
"I apologize for the inconvenience. Let me try calling fill_data again with
the corrected parameters to resolve this issue for you."

── THINGS YOU MUST NEVER DO ──
FORBIDDEN BEHAVIORS // Hard stops — no exceptions

✗ Call \`fill_data\` with an empty or placeholder array.
✗ Call any tool for greetings, thanks, or non-data requests.
✗ Fabricate or guess missing data to fill empty cells.
✗ Re-call tools blindly after a bug report.
✗ Omit any row or column from provided data — ever.
✗ Ask more than one clarifying question at a time.
✗ Use filler phrases: "Certainly!", "Of course!", "Great question!",
    "I'd be happy to help!", "As an AI..."
✗ Repeat the data back as text if a tool already shows it.
✗ Explain what you're about to do at length — just do it.
✗ Use corporate tone. You're a brilliant friend, not a helpdesk ticket.
    `.trim();

    const tools: any[] = [
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
          name: "fill_data",
          description: "Fills the spreadsheet with structured data extracted from the user's messy natural language input.",
          parameters: {
            type: "object",
            properties: {
              startRow: { type: "integer", description: "Row index (0-based) to start." },
              startCol: { type: "integer", description: "Column index (0-based) to start." },
              columns: { type: "array", items: { type: "string" } },
              rowsJson: { type: "string", description: "A JSON string containing a 2D array of the rows data (e.g. '[[\"val1\",\"val2\"]]')" }
            },
            required: ["startRow", "startCol", "columns", "rowsJson"],
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
      const messages: any[] = [
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
      } else {
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

      if ((response as any).error) {
        return {
          tool_used: "none",
          result: `OpenRouter Error: ${(response as any).error.message || 'Unknown error'}`,
          suggestion: "Please check your API key and quota."
        };
      }

      const message = (response as any).choices[0].message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        const call = message.tool_calls[0];
        let args: any = {};
        try {
          args = JSON.parse(call.function.arguments);
        } catch(e) {
          console.error("Failed to parse tool arguments", e);
        }

        if (call.function.name === 'fill_data' && args.rowsJson) {
          try {
            args.rows = JSON.parse(args.rowsJson);
            delete args.rowsJson;
          } catch (e) {
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
    } catch (e: any) {
      console.error("[AIService Critical Error]", e);
      return {
        tool_used: "none",
        result: `Backend Error: ${e.message}`,
        suggestion: "Something went wrong in the server logic."
      };
    }
  }
}
