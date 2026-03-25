/**
 * MODEL FIT LAB – HAND API (Image Generation Engine)
 * Full-Stack Proxy Implementation
 */

export interface ModelInfo {
  name: string;
  displayName: string;
}

async function fetchWithTimeout(url: string, options: RequestInit, ms = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function fetchAvailableModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const baseUrl = window.location.origin;
    const response = await fetchWithTimeout(`${baseUrl}/api/mfl-models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.models || [];
  } catch (e) {
    console.error("Failed to fetch models", e);
    return [];
  }
}

// Module-level gate to prevent duplicate calls
let testInFlight = false;

export async function testConnection(apiKey: string, selectedModel: string): Promise<{ ok: boolean; status: number; message?: string }> {
  if (testInFlight) {
      console.warn("[Gemini] Test already in flight, skipping.");
      return { ok: false, status: 0, message: "Request already in progress" };
  }
  
  testInFlight = true;
  
  try {
    const baseUrl = window.location.origin;
    console.log(`requestUrl = ${baseUrl}/api/mfl-check`);

    const res = await fetchWithTimeout(`${baseUrl}/api/mfl-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, model: selectedModel }),
    }, 20000);

    console.log("status =", res.status);

    const text = await res.text();
    console.log("rawText =", text);

    let data: any = null;
    try { data = JSON.parse(text); } catch {}
    console.log("json =", data);

    if (!res.ok) {
      // Return the actual HTTP status code from the server (e.g., 429)
      return { ok: false, status: res.status, message: data?.error || `HTTP ${res.status}` };
    }

    if (data?.success && data?.image) {
        return { ok: true, status: 200, message: "OK (Image Returned)" };
    } else {
        return { ok: false, status: 200, message: "200 OK but No Image" };
    }

  } catch (err: any) {
    console.error("testConnection error:", err);
    const msg = err.name === "AbortError" ? "Timeout (20s)" : (err.message || "Unknown Network Error");
    return { ok: false, status: 0, message: msg };
  } finally {
    testInFlight = false;
  }
}

export async function generateImageRaw(promptText: string, referenceImageBase64: string | null, config: { apiKey: string, model: string }): Promise<{ data: any, status: number }> {
  console.log("[Gemini Proxy] selectedModel =", config.model);
  const baseUrl = window.location.origin;
  console.log(`[Gemini Proxy] requestUrl = ${baseUrl}/api/mfl-generate`);

  let response = await fetchWithTimeout(`${baseUrl}/api/mfl-generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      promptText,
      referenceImageBase64,
      apiKey: config.apiKey,
      model: config.model
    })
  }, 30000); // Increased timeout for actual generation

  let rawText = "";
  let data: any = null;

  try {
    rawText = await response.text();
    try { data = JSON.parse(rawText); } 
    catch { console.warn("JSON parse failed. rawText:", rawText); }
  } catch (e) {
    console.error("read body failed:", e);
  }

  console.log("status =", response.status);
  console.log("rawText =", rawText);
  console.log("json =", data);

  return { data, status: response.status };
}

export function extractImagesFromGemini(data: any): string[] {
  // The proxy server now returns { success: true, image: "data:image/png;base64,..." }
  if (data && data.image) {
      return [data.image];
  }
  return [];
}



