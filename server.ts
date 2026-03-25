import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Helper to get API key (Server env takes precedence over client key)
const getApiKey = (clientKey?: string) => process.env.GEMINI_API_KEY || clientKey;

// Helper to normalize model
function normalizeModel(rawModel?: string): string {
  if (!rawModel) return "gemini-2.5-flash-image";

  const key = rawModel.trim().toLowerCase();

  const modelMap: Record<string, string> = {
    "gemini-2.5-flash-image": "gemini-2.5-flash-image",
    "gemini-2.5-flash-image-preview": "gemini-2.5-flash-image",
    "gemini image": "gemini-2.5-flash-image",
    "image generation": "gemini-2.5-flash-image",
    "gemini-3-pro-image-preview": "gemini-2.5-flash-image",
    "gemini-2.0-flash-exp": "gemini-2.5-flash-image",
    "gemini-pro-vision": "gemini-2.5-flash-image"
  };

  return modelMap[key] || "gemini-2.5-flash-image";
}

// Helper to extract image
function extractImageBase64(data: any): string | null {
  const candidate = data?.candidates?.[0];
  if (candidate) {
    const parts = candidate?.content?.parts || [];
    for (const p of parts) {
      if (p?.inlineData?.data) {
        return `data:${p.inlineData.mimeType || 'image/png'};base64,${p.inlineData.data}`;
      }
    }
  }
  if (data?.images && Array.isArray(data.images)) {
    for (const img of data.images) {
      if (img.imageBytes) {
        return `data:image/png;base64,${img.imageBytes}`;
      }
    }
  }
  return null;
}

// 1. Fetch Models Proxy
app.post('/api/mfl-models', async (req, res) => {
  try {
    const apiKey = getApiKey(req.body.apiKey);
    if (!apiKey) return res.status(400).json({ error: "API Key is missing" });

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return res.status(response.status).json({ error: "Failed to fetch models" });
    
    const data = await response.json();
    const models = (data.models || [])
      .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: any) => ({
        name: m.name.replace('models/', ''),
        displayName: m.displayName || m.name
      }));
    res.json({ models });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Generate Image Proxy
app.post('/api/mfl-generate', async (req, res) => {
  try {
    const { promptText, referenceImageBase64, model, apiKey: clientKey } = req.body;
    const apiKey = getApiKey(clientKey);
    if (!apiKey) return res.status(400).json({ error: "API Key is missing" });

    const finalModel = normalizeModel(model);
    
    console.log("[Express /mfl-generate] requestedModel:", model);
    console.log("[Express /mfl-generate] finalModelUsed:", finalModel);

    const isImageModel = /-image\b/.test(finalModel) || finalModel.includes("image");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${apiKey}`;
    console.log("[Express /mfl-generate] endpointUsed:", url.replace(apiKey, "HIDDEN_KEY"));

    const parts: any[] = [{ text: promptText }];
    if (referenceImageBase64) {
      const base64Data = referenceImageBase64.split(',')[1] || referenceImageBase64;
      let mimeType = 'image/png';
      if (referenceImageBase64.startsWith('data:image/jpeg')) mimeType = 'image/jpeg';
      if (referenceImageBase64.startsWith('data:image/webp')) mimeType = 'image/webp';
      parts.unshift({ inlineData: { mimeType, data: base64Data } });
    }

    const bodyPayload: any = { contents: [{ parts }] };
    if (isImageModel) {
      bodyPayload.generationConfig = { responseModalities: ["IMAGE"] };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload)
    });

    const rawText = await response.text();
    let data: any = null;
    try { data = JSON.parse(rawText); } catch { /* ignore */ }

    if (!response.ok) {
      console.error(`[Gemini API Error] Model: ${finalModel}, Status: ${response.status} ${response.statusText}, Body:`, rawText);
      return res.status(response.status).json({ 
        error: data?.error?.message || `HTTP ${response.status} ${response.statusText}: ${rawText.slice(0, 200)}`,
        status: response.status,
        statusText: response.statusText,
        body: rawText
      });
    }

    const imageBase64 = extractImageBase64(data);
    if (!imageBase64) {
      console.error(`[Gemini API Error] Model: ${finalModel}, Status: 200, Body: No image data found`);
      return res.status(500).json({ 
        error: "Image data not found in response",
        body: rawText
      });
    }

    res.json({ success: true, image: imageBase64 });
  } catch (error: any) {
    console.error("[Server Error] /api/mfl-generate:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Test Connection Proxy (Legacy / Vercel compatibility)
app.get('/api/test-image', (req, res) => {
  res.json({ message: "API 정상 작동 (AI Studio Fallback)" });
});

// 4. Test Connection Proxy (Original)
app.post('/api/mfl-check', async (req, res) => {
  try {
    const { model, apiKey: clientKey } = req.body;
    const apiKey = getApiKey(clientKey);
    if (!apiKey) return res.status(400).json({ error: "API Key is missing" });

    const finalModel = normalizeModel(model);
    
    console.log("[Express /mfl-check] requestedModel:", model);
    console.log("[Express /mfl-check] finalModelUsed:", finalModel);

    const isImageModel = /-image\b/.test(finalModel) || finalModel.includes("image");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${apiKey}`;
    console.log("[Express /mfl-check] endpointUsed:", url.replace(apiKey, "HIDDEN_KEY"));

    const bodyPayload: any = { contents: [{ parts: [{ text: "test" }] }] };
    if (isImageModel) {
      bodyPayload.generationConfig = { responseModalities: ["IMAGE"] };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload)
    });

    const rawText = await response.text();
    let data: any = null;
    try { data = JSON.parse(rawText); } catch {}

    if (!response.ok) {
      console.error(`[Gemini API Error] Model: ${finalModel}, Status: ${response.status} ${response.statusText}, Body:`, rawText);
      return res.status(response.status).json({ 
        error: data?.error?.message || `HTTP ${response.status} ${response.statusText}: ${rawText.slice(0, 200)}`,
        status: response.status,
        statusText: response.statusText,
        body: rawText
      });
    }

    const imageBase64 = extractImageBase64(data);
    if (!imageBase64) {
      console.error(`[Gemini API Error] Model: ${finalModel}, Status: 200, Body: No image data found`);
      return res.status(500).json({ 
        error: "200 OK but No Image",
        body: rawText
      });
    }

    res.json({ success: true, image: imageBase64 });
  } catch (error: any) {
    console.error("[Server Error] /api/mfl-check:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
