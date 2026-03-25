export type SideProfileOption = 'LEFT' | 'RIGHT';
export type SittingOption = 'FLOOR' | 'CHAIR';
export type DetailOption = 'EYES' | 'HANDS' | 'LOGO' | 'TEXTURE';

export type GenerationMode = 'GRID_3X3' | 'CHAR_SHEET';

export interface ModelInfo {
  name: string;
  displayName: string;
}

export interface AppState {
  referenceImage: string | null; // Base64
  outfitAndTransform: string; // BRAIN A
  environment: string;        // BRAIN B
  styleKeywords: string;      // BRAIN C
  shot1Select: SideProfileOption;
  shot2Select: SittingOption;
  shot7Select: DetailOption;
  generatedImage: string | null; 
  numberedCollage: string | null; 
  isGenerating: boolean;
  loadingMessage: string;
  extractedImages: string[]; 
  hasApiKey: boolean;
  apiKey: string;
  isLocalEngineMode: boolean;
  generationMode: GenerationMode;
  generatedPromptText: string | null;
  connectionStatus: 'idle' | 'testing' | 'ok' | 'error';
  testStatusCode: number | null;
  debugInfo: any | null;
  textResult: string | null;
  selectedModel: string;
  availableModels: ModelInfo[];
}

export const DEFAULT_STYLE_KEYWORDS = "KR high-end SS luxury campaign, cinematic realism, captured stillness, dimensional midtones, luxury restraint";
export const DEFAULT_ENVIRONMENT = "Modern café window light, minimal lifestyle interior, hotel lobby corner";
export const DEFAULT_MODEL = "gemini-2.5-flash-image"; // Fallback default

export const LOADING_MESSAGES = [
  "SCULPTING DIMENSIONAL LIGHT...",
  "RENDERING FABRIC TEXTURES...",
  "INTEGRATING LUXURY SIGNALS...",
  "CALIBRATING SKIN TONE INTEGRITY...",
  "COMPOSING ARCHITECTURAL DEPTH...",
  "CAPTURING EDITORIAL STILLNESS..."
];
