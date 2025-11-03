// useCanvas.js

import { useEffect, useCallback } from 'react';

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

const drawBaseImage = (ctx, imageData, scaleX, scaleY, interpolationMethod) => {
  if (!imageData) return;

  const displayWidth = Math.round(imageData.width * (scaleX / 100));
  const displayHeight = Math.round(imageData.height * (scaleY / 100));

  ctx.imageSmoothingEnabled = interpolationMethod === 'bilinear';
  ctx.imageSmoothingQuality = 'high';

  if (imageData.imageElement) {
    ctx.drawImage(
      imageData.imageElement,
      0, 0, imageData.width, imageData.height,
      0, 0, displayWidth, displayHeight
    );
  }
};

export const createGB7Image = (width, height, pixelData, hasMask) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  const imageDataNoAlpha = ctx.createImageData(width, height);
  const dataNoAlpha = imageDataNoAlpha.data;
  
  for (let i = 0; i < pixelData.length; i++) {
    const byte = pixelData[i];
    const gray = ((byte & 0x7F) << 1);
    
    dataNoAlpha[i * 4] = gray;
    dataNoAlpha[i * 4 + 1] = gray;
    dataNoAlpha[i * 4 + 2] = gray;
    dataNoAlpha[i * 4 + 3] = 255;
  }
  
  ctx.putImageData(imageDataNoAlpha, 0, 0);
  const imgWithoutAlphaDataUrl = canvas.toDataURL();
  
  const imageDataWithAlpha = ctx.createImageData(width, height);
  const dataWithAlpha = imageDataWithAlpha.data;

  for (let i = 0; i < pixelData.length; i++) {
    const byte = pixelData[i];
    const gray = ((byte & 0x7F) << 1);
    const alpha = hasMask ? ((byte & 0x80) ? 255 : 0) : 255;

    dataWithAlpha[i * 4] = gray;
    dataWithAlpha[i * 4 + 1] = gray;
    dataWithAlpha[i * 4 + 2] = gray;
    dataWithAlpha[i * 4 + 3] = alpha;
  }

  ctx.putImageData(imageDataWithAlpha, 0, 0);
  const imgWithAlphaDataUrl = canvas.toDataURL();

  // Создаём Image объекты
  const imgWithAlpha = new Image();
  const imgWithoutAlpha = new Image();
  
  imgWithAlpha.src = imgWithAlphaDataUrl;
  imgWithoutAlpha.src = imgWithoutAlphaDataUrl;

  return Promise.all([
    new Promise(resolve => { imgWithAlpha.onload = () => resolve(imgWithAlpha); }),
    new Promise(resolve => { imgWithoutAlpha.onload = () => resolve(imgWithoutAlpha); })
  ]).then(([withAlpha, withoutAlpha]) => ({
    imageWithAlpha: withAlpha,
    imageWithoutAlpha: withoutAlpha
  }));
};

const applyLayer = (ctx, layer, scaleX, scaleY) => {
  if (!layer.visible) return;

  ctx.save();
  try {
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode;

    if (layer.image) {
      const layerWidth = layer.image.width * (scaleX / 100);
      const layerHeight = layer.image.height * (scaleY / 100);
      
      if (layer.showAlpha) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = layer.image.width;
        tempCanvas.height = layer.image.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(layer.image, 0, 0);

        const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          data[i] = data[i + 1] = data[i + 2] = a;
          data[i + 3] = 255;
        }
        tempCtx.putImageData(imgData, 0, 0);

        ctx.drawImage(tempCanvas, layer.x, layer.y, layerWidth, layerHeight);
      } else {
        ctx.drawImage(
          layer.image,
          0, 0, layer.image.width, layer.image.height,
          layer.x, layer.y,
          layerWidth, layerHeight
        );
      }

    } else if (layer.isColorLayer && layer.color) {
      // Альтернативная обработка для цветных слоев
      ctx.fillStyle = layer.color;
      const width = layer?.image?.width || 800;
      const height = layer?.image?.height || 600;
      ctx.fillRect(
        layer.x, 
        layer.y, 
        width * (scaleX / 100), 
        height * (scaleY / 100)
      );
    }
  } finally {
    ctx.restore();
  }
};

// useCanvas.js
export const useCanvas = (
  canvasRef,
  layers,
  scaleX,
  scaleY,
  interpolationMethod,
  imageOffset
) => {
const renderCanvas = useCallback(() => {
  if (!canvasRef.current || !layers.length) return;
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');

  const maxWidth = Math.max(...layers.map(l => l.image?.width || 0));
  const maxHeight = Math.max(...layers.map(l => l.image?.height || 0));

  canvas.width = maxWidth * (scaleX / 100);
  canvas.height = maxHeight * (scaleY / 100);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  [...layers].reverse().forEach(layer => {
    if (!layer.visible) return;

    // Если showAlpha=true и есть imageWithoutAlpha, используем его
    const imageToDraw = (layer.showAlpha && layer.imageWithoutAlpha) 
      ? layer.imageWithoutAlpha 
      : layer.image;
    
    if (!imageToDraw) return;

    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    ctx.globalCompositeOperation = layer.blendMode ?? 'normal';

    const scaledWidth = imageToDraw.width * (scaleX / 100);
    const scaledHeight = imageToDraw.height * (scaleY / 100);

    ctx.drawImage(
      imageToDraw,
      0, 0, imageToDraw.width, imageToDraw.height,
      layer.x, layer.y,
      scaledWidth,
      scaledHeight
    );

    ctx.restore();
  });
}, [layers, scaleX, scaleY]);


  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, layers]);

  return { renderCanvas };
};