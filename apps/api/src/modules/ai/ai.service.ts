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
  static async chat(userId: string, sheetId: string, prompt: string, fileData?: string, mimeType?: string) {
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

    for (let r = 0; r < Math.min(10, sheet.rowCount); r++) {
      const rowData: any = {};
      for (let c = 0; c < sheet.colCount; c++) {
        const cell = dataObj[`r_${r}_c_${c}`];
        if (cell && cell.v) rowData[`c_${c}`] = cell.v;
      }
      if (Object.keys(rowData).length > 0) sampleData.push(rowData);
    }

    const systemPrompt = JSON.stringify({
      sheet_context: { name: sheet.name, total_rows: sheet.rowCount, columns, sample_data: sampleData }
    });

    const smartInstructions = `
You are SmartSheet AI, an incredibly smart, intuitive, and highly tolerant spreadsheet assistant.
CRITICAL INSTRUCTIONS:
1. The user will often use casual language, slang, or make typos. YOU MUST intelligently infer their intent. Do NOT ask for clarification.
2. Provide the exact formula, chart, or action they need without fuss.
3. If they ask to "calculate", "sum", "average" or perform math, ALWAYS output the \`apply_formula\` tool with the correct formula.
4. If the user provides messy, natural language input or raw data, use the \`fill_data\` tool to convert it into a clean, structured table format following these rules:
   - Detect language (English, Hindi, Hinglish) and internally translate everything to structured English.
   - Identify entities and translate them to English (e.g., "जूते" -> "Shoes").
   - Identify numerical values.
   - Detect relationships (e.g., discount belongs to price).
   - Automatically create appropriate column headers in English.
   - Normalize values.
   - If needed, add computed columns (e.g., Final Price after discount).
   - Support multiple entries in a single input.
   - Clean and standardize text.
   - If discount is present, calculate Final Price = Price - (Price * Discount / 100).
5. If a document or image is attached, thoroughly analyze it, extract all relevant tables or structured data, and output it using the \`fill_data\` tool. You MUST maintain 100% precision. Do not omit any rows or columns. Do not hallucinate.
6. You are perfect and make no mistakes.
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
      }
    ];

    try {
      const messages: any[] = [
        { role: "system", content: `${smartInstructions}\n\nContext:\n${systemPrompt}` }
      ];

      if (fileData && mimeType && mimeType.startsWith('image/')) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: fileData } }
          ]
        });
      } else {
        messages.push({ role: "user", content: prompt });
      }

      let toolChoice: any = "auto";
      if (fileData) {
        toolChoice = { type: "function", function: { name: "fill_data" } };
      }

      const response = await openai.chat.completions.create({
        model: "meta-llama/llama-3.3-70b-instruct",
        messages: messages,
        tools: tools,
        tool_choice: toolChoice,
        temperature: 0.0
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
          suggestion: "I have suggested an action based on your request. Please accept or reject."
        };
      }

      return {
        tool_used: "none",
        result: message.content || "",
        suggestion: "No specific action taken."
      };
    } catch (e: any) {
      console.error(e);
      throw new Error("OpenRouter API Error: " + e.message);
    }
  }
}
