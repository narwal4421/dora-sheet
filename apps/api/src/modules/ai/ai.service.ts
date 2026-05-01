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
You are SmartSheet AI, an incredibly smart, intuitive, and highly tolerant spreadsheet assistant.
CRITICAL INSTRUCTIONS:
1. Normal Conversations & Greetings: Handle normal greetings (like "hi", "hello") and casual talk naturally. If the user is just chatting, reply conversationally without calling any tools.
2. Calculations: For any calculations (sum, average, math, etc.), ALWAYS use the \`apply_formula\` tool with the exact spreadsheet formula.
3. Data Insertion & File Uploads: If the user says "put this data into sheet", provides messy text/raw data, or attaches a document/image containing data, extract and structure it perfectly. Use the \`fill_data\` tool to suggest filling this data into the sheet. You MUST maintain 100% precision. Do not omit any rows or columns.
4. Inventory Management: If the user gives instructions regarding inventory management (e.g., "add 10 apples to inventory", "update stock"), understand the intent, format it as structured data, and use the \`fill_data\` tool to suggest putting it in the sheet. Create appropriate columns automatically.
5. Suggestions Only: When using the \`fill_data\` tool or \`apply_formula\` tool, you are generating a suggestion that the user must approve. Do NOT execute it directly. You can provide a brief, polite confirmation message alongside the tool call in your natural text response.
6. Smart File Understanding: You possess advanced capabilities to understand and extract data from various file types:
   - Bills & Receipts: Extract line items, dates, and totals from images or PDFs with 100% precision.
   - CSV & Excel: Analyze structured data and map it intelligently to the spreadsheet grid.
   - You MUST extract data with extreme accuracy, maintaining the original structure and values.
7. Language & Normalization: Detect language and translate everything to structured English. Identify entities, normalize values, and calculate discounts if present.
8. The user will often use casual language or make typos. Intelligently infer their intent. Do NOT ask for clarification.
9. NEVER call \`fill_data\` with empty arrays. If you do not have specific data to insert based on the user's immediate request, DO NOT use the \`fill_data\` tool. Just respond conversationally.
10. If the user is complaining about a bug (e.g., "it didn't work", "nothing shows up"), apologize and respond normally in text. DO NOT attempt to fix it by blindly calling tools.
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
        ...history.map(h => ({ role: h.role === 'ai' ? 'assistant' : 'user', content: h.content }))
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

      const response = await openai.chat.completions.create({
        model: "google/gemini-pro-1.5",
        messages: messages,
        tools: tools,
        tool_choice: "auto",
        temperature: 0.1
      });

      const message = response.choices[0].message;

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
      console.error(e);
      throw new Error("OpenRouter API Error: " + e.message);
    }
  }
}
