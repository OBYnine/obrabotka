// useCanvas.js
import { useEffect } from 'react';

const createThumbnail = (image, size = 50) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const ratio = Math.min(size / image.width, size / image.height);
  const width = image.width * ratio;
  const height = image.height * ratio;
  
  ctx.drawImage(image, (size - width)/2, (size - height)/2, width, height);
  return canvas.toDataURL();
};

const applyLayer = (ctx, layer, canvasWidth, canvasHeight) => {
  if (!layer.visible) return;

  ctx.save();
  try {
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode;

    if (layer.image) {
      ctx.drawImage(
        layer.image,
        0,
        0,
        layer.image.width,
        layer.image.height,
        0,
        0,
        canvasWidth,
        canvasHeight
      );
    } else if (layer.color) {
      ctx.fillStyle = layer.color;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  } finally {
    ctx.restore();
  }
};

const drawBaseImage = (ctx, imageData, scaleX, scaleY, interpolationMethod) => {
  if (!imageData) return;

  const displayWidth = Math.round(imageData.width * (scaleX / 100));
  const displayHeight = Math.round(imageData.height * (scaleY / 100));

  ctx.imageSmoothingEnabled = interpolationMethod === 'bilinear';
  ctx.imageSmoothingQuality = 'high';

  if (imageData.imageElement) {
    ctx.drawImage(
      imageData.imageElement,
      0,
      0,
      imageData.width,
      imageData.height,
      0,
      0,
      displayWidth,
      displayHeight
    );
  } else if (imageData.pixelData) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    const pixelData = new Uint8Array(imageData.pixelData);
    const imageDataObj = tempCtx.createImageData(imageData.width, imageData.height);
    
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const srcPos = y * imageData.width + x;
        const dstPos = (y * imageData.width + x) * 4;
        const pixelByte = pixelData[srcPos];
        let grayValue = (pixelByte & 0x7F) << 1;
        
        if (imageData.hasMask && (pixelByte & 0x80) === 0) {
          imageDataObj.data[dstPos] = 0;
          imageDataObj.data[dstPos + 1] = 0;
          imageDataObj.data[dstPos + 2] = 0;
          imageDataObj.data[dstPos + 3] = 0;
        } else {
          imageDataObj.data[dstPos] = grayValue;
          imageDataObj.data[dstPos + 1] = grayValue;
          imageDataObj.data[dstPos + 2] = grayValue;
          imageDataObj.data[dstPos + 3] = 255;
        }
      }
    }
    
    tempCtx.putImageData(imageDataObj, 0, 0);
    ctx.drawImage(
      tempCanvas,
      0,
      0,
      imageData.width,
      imageData.height,
      0,
      0,
      displayWidth,
      displayHeight
    );
  }
};

export const useCanvas = (
  canvasRef,
  imageData,
  scaleX,
  scaleY,
  interpolationMethod,
  layers
) => {
  const renderCanvas = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Рассчитываем размеры canvas
    const displayWidth = imageData 
      ? Math.round(imageData.width * (scaleX / 100))
      : canvas.width;
    const displayHeight = imageData 
      ? Math.round(imageData.height * (scaleY / 100))
      : canvas.height;

    // Устанавливаем размеры canvas
    if (imageData) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    
    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Рендерим базовое изображение
    drawBaseImage(ctx, imageData, scaleX, scaleY, interpolationMethod);

    // Рендерим слои поверх изображения
    layers.forEach(layer => {
      applyLayer(ctx, layer, displayWidth, displayHeight);
    });
  };

  useEffect(() => {
    renderCanvas();
  }, [imageData, scaleX, scaleY, interpolationMethod, layers]);

  return { renderCanvas, createThumbnail };
};