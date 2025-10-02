export function applyBlendMode(basePixel, topPixel, blendMode, opacity) {
    if (!topPixel) return basePixel;
    if (topPixel.a === 0) return basePixel;
  
    const normalizedOpacity = opacity / 100;
    const topAlpha = (topPixel.a / 255) * normalizedOpacity;
  
    if (topAlpha === 0) return basePixel;
  
    const baseAlpha = basePixel.a / 255;
    const blendAlpha = topAlpha + baseAlpha * (1 - topAlpha);
  
    if (blendAlpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  
    const blend = (base, top, mode) => {
      const b = base / 255;
      const t = top / 255;
  
      switch (mode) {
        case 'multiply':
          return b * t * 255;
        case 'screen':
          return (1 - (1 - b) * (1 - t)) * 255;
        case 'overlay':
          return b < 0.5 
            ? 2 * b * t * 255 
            : (1 - 2 * (1 - b) * (1 - t)) * 255;
        default: // normal
          return top;
      }
    };
  
    const r = blend(basePixel.r, topPixel.r, blendMode);
    const g = blend(basePixel.g, topPixel.g, blendMode);
    const b = blend(basePixel.b, topPixel.b, blendMode);
  
    return {
      r: Math.round(r),
      g: Math.round(g),
      b: Math.round(b),
      a: Math.round(blendAlpha * 255)
    };
  }