import { AppState } from './types';

export const generateIndividualPrompts = (state: AppState): string[] => {
  const profileDir = state.shot1Select === 'LEFT' ? 'side profile facing left' : 'side profile facing right';
  const poseType = state.shot2Select === 'FLOOR' ? 'standing or floor-level composition' : 'seated composition on a chair';
  const detailType = {
    EYES: "macro focus on eyes",
    HANDS: "macro focus on hands",
    LOGO: "macro focus on brand logo",
    TEXTURE: "macro focus on fabric texture"
  }[state.shot7Select];

  const sharedContext = `
[OUTFIT & TRANSFORM]
${state.outfitAndTransform}

[ENVIRONMENT]
${state.environment}

[STYLE KEYWORDS]
${state.styleKeywords}

Vertical 9:16, premium fashion editorial, clean, high detail.
`;

  return [
    `${sharedContext} Shot 01: Full Body Front (Subtle push-in, low-angle hero framing).`,
    `${sharedContext} Shot 02: Full Body (${profileDir}) - 45-degree profile, natural walk capture.`,
    `${sharedContext} Shot 03: Full Body Back (Architectural framing, reflection/glass depth).`,
    `${sharedContext} Shot 04: Mid Shot Front (${poseType}) - Candid seating, over-the-shoulder feel.`,
    `${sharedContext} Shot 05: Mid Shot 45° (${poseType}) - Eye-level, depth-of-field layered framing.`,
    `${sharedContext} Shot 06: Mid Shot Side (${poseType}) - Mid-step movement, luxury context.`,
    `${sharedContext} Shot 07: Macro Face - Beauty shot, natural skin texture, micro-contrast.`,
    `${sharedContext} Shot 08: ${detailType} - Accessory focus, high texture detail, luxury signal.`,
    `${sharedContext} Shot 09: Macro Texture - Extreme fabric weave detail, material weight.`
  ];
};

export const createCollage = async (images: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (images.length !== 9) {
      reject(new Error("Need exactly 9 images for collage."));
      return;
    }

    const canvas = document.createElement('canvas');
    const firstImg = new Image();
    firstImg.onload = () => {
      const tileW = firstImg.width;
      const tileH = firstImg.height;
      canvas.width = tileW * 3;
      canvas.height = tileH * 3;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("Canvas context error"));

      let loadedCount = 0;
      images.forEach((src, i) => {
        const img = new Image();
        img.onload = () => {
          const x = (i % 3) * tileW;
          const y = Math.floor(i / 3) * tileH;
          ctx.drawImage(img, x, y, tileW, tileH);
          
          const num = (i + 1).toString().padStart(2, '0');
          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.font = `600 ${Math.floor(tileW * 0.04)}px "Inter", sans-serif`;
          ctx.fillText(num, x + 15, y + tileW * 0.04 + 15);
          ctx.restore();

          loadedCount++;
          if (loadedCount === 9) resolve(canvas.toDataURL('image/png'));
        };
        img.src = src;
      });
    };
    firstImg.src = images[0];
  });
};

export const generatePromptData = (state: AppState) => {
  const prompts = generateIndividualPrompts(state);
  const markdown = `
[MODEL FIT LAB — EXECUTION BRIEF v2.5]
AESTHETIC: KR High-End SS Luxury

[SHOT MATRIX]
${prompts.map((p, i) => `${(i+1).toString().padStart(2,'0')}: ${p.split('Shot ')[1] || p}`).join('\n')}
`;
  return { prompts, markdown };
};

export const generateSingleShotPrompt = (state: AppState, index: number): string => {
  const prompts = generateIndividualPrompts(state);
  return prompts[index];
};
