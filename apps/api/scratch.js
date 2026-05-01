const OpenAI = require('openai');

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENAI_API_KEY || 'YOUR_API_KEY_HERE',
  defaultHeaders: {
    "HTTP-Referer": "https://dora-sheet.com",
    "X-Title": "Dora Sheet AI"
  }
});

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

async function test() {
  try {
    console.log("Sending request to OpenRouter...");
    const response = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [{ role: "user", content: "hi" }],
      tools: tools,
      tool_choice: "auto",
      temperature: 0.0
    });
    console.log("Success!");
    console.log(response.choices[0].message);
  } catch (err) {
    console.error("OpenRouter API Error:", err.message);
    if (err.response) {
      console.error(err.response.data);
    }
  }
}

test();
