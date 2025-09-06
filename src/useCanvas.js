// useCanvas.js
import { useEffect } from 'react';

export const useCanvas = (canvasRef, imageData, scaleX, scaleY, interpolationMethod) => {
  const renderCanvas = () => {
    if (!imageData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Рассчитываем новые размеры с учетом масштаба
    const displayWidth = Math.round(imageData.width * (scaleX / 100));
    const displayHeight = Math.round(imageData.height * (scaleY / 100));
    
    // Устанавливаем размеры canvas
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imageData.imageElement) {
      // Для обычных изображений
      ctx.imageSmoothingEnabled = interpolationMethod === 'bilinear';
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
      // Для GB7 изображений
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
      ctx.imageSmoothingEnabled = interpolationMethod === 'bilinear';
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

  useEffect(() => {
    renderCanvas();
  }, [imageData, scaleX, scaleY, interpolationMethod]);

  return { renderCanvas };
};