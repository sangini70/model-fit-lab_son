function normalizeModel(model: string) {
  if (model.includes("FLASH-PREVIEW-IMAGE")) {
    return "gemini-2.0-flash-preview-image-generation";
  }

  if (model.includes("FLASH")) {
    return "gemini-2.0-flash";
  }

  if (model.includes("PRO-EXP")) {
    return "gemini-2.0-pro-exp";
  }

  return model.toLowerCase();
}