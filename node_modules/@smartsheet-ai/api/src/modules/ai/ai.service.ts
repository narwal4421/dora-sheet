import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';

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
5. If a PDF or document is attached, thoroughly analyze it, extract all relevant tables or structured data, and output it using the \`fill_data\` tool. You MUST maintain 100% precision. Do not omit any rows or columns. Do not hallucinate.
6. You are perfect and make no mistakes.
    `.trim();

    const functionDeclarations = [
      { 
        name: "apply_formula", 
        description: "Generate a spreadsheet formula", 
        parameters: { 
          type: SchemaType.OBJECT, 
          properties: { 
            formula: { type: SchemaType.STRING }, 
            targetCell: { type: SchemaType.STRING } 
          }, 
          required: ["formula", "targetCell"] 
        } 
      },
      { 
        name: "fill_data", 
        description: "Fills the spreadsheet with structured data extracted from the user's messy natural language input.", 
        parameters: { 
          type: SchemaType.OBJECT, 
          properties: { 
            startRow: { type: SchemaType.INTEGER, description: "Row index (0-based) to start." }, 
            startCol: { type: SchemaType.INTEGER, description: "Column index (0-based) to start." }, 
            columns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, 
            rows: { type: SchemaType.ARRAY, items: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } } 
          }, 
          required: ["startRow", "startCol", "columns", "rows"]  
        } 
      }
    ];

    try {
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || 'dummy');
      const modelConfig: any = {
        model: "gemini-2.5-flash",
        systemInstruction: { role: "system", parts: [{ text: `${smartInstructions}\n\nContext:\n${systemPrompt}` }] },
        tools: [{ functionDeclarations: functionDeclarations as any }],
        generationConfig: { temperature: 0.0 }
      };

      // If a file is attached, FORCE the model to extract data.
      // This skips the model's "decision phase", speeding up response time and guaranteeing structured JSON output.
      if (fileData) {
        modelConfig.toolConfig = {
          functionCallingConfig: {
            mode: "ANY",
            allowedFunctionNames: ["fill_data"]
          }
        };
      }

      const model = genAI.getGenerativeModel(modelConfig);

      const promptParts: any[] = [{ text: prompt }];
      
      if (fileData && mimeType) {
        // Strip the data URL prefix if present (e.g., "data:application/pdf;base64,")
        const base64Content = fileData.includes(',') ? fileData.split(',')[1] : fileData;
        promptParts.push({
          inlineData: {
            data: base64Content,
            mimeType: mimeType
          }
        });
      }

      const result = await model.generateContent(promptParts);
      const response = result.response;
      const call = response.functionCalls()?.[0];

      if (call) {
        return {
          tool_used: call.name,
          result: call.args,
          suggestion: "I have suggested an action based on your request. Please accept or reject."
        };
      }

      return {
        tool_used: "none",
        result: response.text(),
        suggestion: "No specific action taken."
      };
    } catch (e: any) {
      console.error(e);
      throw new Error("Generative API Error: " + e.message);
    }
  }
}
