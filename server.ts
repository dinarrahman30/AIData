import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json({ limit: "50mb" }));

  // API route for Gemini text generation
  app.post("/api/generate-report", async (req, res) => {
    try {
      const { dataSample, dataContext, strategyFocus } = req.body;
      
      const prompt = `
        You are an expert Data Analyst and Business Strategist.
        Generate a professional report and strategy based on the following data sample.
        
        Data Context:
        Lines of data: ${dataContext?.rows}
        Columns: ${dataContext?.columns}
        
        Strategy Focus: ${strategyFocus}
        
        Here is a sample of the data (first few rows):
        ${JSON.stringify(dataSample, null, 2)}
        
        Please format the output exactly in Markdown with these two sections:
        
        ### Executive Summary
        [Write the executive summary here, highlighting key patterns and an overview aligned with the strategy focus]
        
        ### Actionable Next Steps
        [Provide 3-5 clear, actionable business or operational steps as bullet points based on the data and focus area]
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ result: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server correctly listening on port ${port} and binding to 0.0.0.0`);
  });
}

startServer();
