// interpolation.js
export const interpolate = {
    nearestNeighbor: (src, srcWidth, srcHeight, dstWidth, dstHeight) => {
      const dst = new Uint8Array(dstWidth * dstHeight * 4);
      const xRatio = srcWidth / dstWidth;
      const yRatio = srcHeight / dstHeight;
      
      for (let y = 0; y < dstHeight; y++) {
        for (let x = 0; x < dstWidth; x++) {
          const srcX = Math.floor(x * xRatio);
          const srcY = Math.floor(y * yRatio);
          const srcPos = (srcY * srcWidth + srcX) * 4;
          const dstPos = (y * dstWidth + x) * 4;
          
          dst[dstPos] = src[srcPos];
          dst[dstPos + 1] = src[srcPos + 1];
          dst[dstPos + 2] = src[srcPos + 2];
          dst[dstPos + 3] = src[srcPos + 3];
        }
      }
      
      return dst;
    },
    
    bilinear: (src, srcWidth, srcHeight, dstWidth, dstHeight) => {
      const dst = new Uint8Array(dstWidth * dstHeight * 4);
      const xRatio = (srcWidth - 1) / dstWidth;
      const yRatio = (srcHeight - 1) / dstHeight;
      
      for (let y = 0; y < dstHeight; y++) {
        for (let x = 0; x < dstWidth; x++) {
          const xSrc = x * xRatio;
          const ySrc = y * yRatio;
          
          const x1 = Math.floor(xSrc);
          const y1 = Math.floor(ySrc);
          const x2 = Math.min(x1 + 1, srcWidth - 1);
          const y2 = Math.min(y1 + 1, srcHeight - 1);
          
          const pos11 = (y1 * srcWidth + x1) * 4;
          const pos12 = (y1 * srcWidth + x2) * 4;
          const pos21 = (y2 * srcWidth + x1) * 4;
          const pos22 = (y2 * srcWidth + x2) * 4;
          
          const xFrac = xSrc - x1;
          const yFrac = ySrc - y1;
          const xFracInv = 1 - xFrac;
          const yFracInv = 1 - yFrac;
          
          const dstPos = (y * dstWidth + x) * 4;
          
          for (let c = 0; c < 4; c++) {
            const val = (
              src[pos11 + c] * xFracInv * yFracInv +
              src[pos12 + c] * xFrac * yFracInv +
              src[pos21 + c] * xFracInv * yFrac +
              src[pos22 + c] * xFrac * yFrac
            );
            dst[dstPos + c] = Math.round(val);
          }
        }
      }
      
      return dst;
    }
  };