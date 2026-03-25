import { VercelRequest, VercelResponse } from '@vercel/node';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 처리
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { promptText, referenceImageBase64, model, apiKey: clientKey } = req.body;
    const apiKey = getApiKey(clientKey);
    if (!apiKey) return res.status(400).json({ error: "API Key is missing" });

    const finalModel = normalizeModel(model);
    
    console.log("[Vercel /mfl-generate] requestedModel:", model);
    console.log("[Vercel /mfl-generate] finalModelUsed:", finalModel);

    const isImageModel = /-image\b/.test(finalModel) || finalModel.includes("image");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${apiKey}`;
    console.log("[Vercel /mfl-generate] endpointUsed:", url.replace(apiKey, "HIDDEN_KEY"));

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

    res.status(200).json({ success: true, image: imageBase64 });
  } catch (error: any) {
    console.error("[Server Error] /api/mfl-generate:", error);
    res.status(500).json({ error: error.message });
  }
}
