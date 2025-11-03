// imageUtils.js

// Расчет гистограммы изображения
export const calculateHistogram = (imageData) => {
  const histogram = {
    red: new Array(256).fill(0),
    green: new Array(256).fill(0),
    blue: new Array(256).fill(0)
  };

  if (imageData.imageElement) {
    // Для стандартных изображений
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageData.imageElement, 0, 0);
    const data = ctx.getImageData(0, 0, imageData.width, imageData.height).data;

    for (let i = 0; i < data.length; i += 4) {
      histogram.red[data[i]]++;
      histogram.green[data[i + 1]]++;
      histogram.blue[data[i + 2]]++;
    }
  } else if (imageData.pixelData) {
    // Для GB7 изображений (градации серого)
    const pixelData = new Uint8Array(imageData.pixelData);
    for (let i = 0; i < pixelData.length; i++) {
      const grayValue = (pixelData[i] & 0x7F) << 1;
      histogram.red[grayValue]++;
      histogram.green[grayValue]++;
      histogram.blue[grayValue]++;
    }
  }

  return histogram;
};

// Применение LUT к изображению
export const applyLUT = (imageData, lut) => {
  if (imageData.imageElement) {
    // Для стандартных изображений
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageData.imageElement, 0, 0);
    const imgData = ctx.getImageData(0, 0, imageData.width, imageData.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = lut[data[i]];     // R
      data[i + 1] = lut[data[i + 1]]; // G
      data[i + 2] = lut[data[i + 2]]; // B
    }

    ctx.putImageData(imgData, 0, 0);

    const newImage = new Image();
    newImage.src = canvas.toDataURL();
    return {
      ...imageData,
      imageElement: newImage
    };
  } else if (imageData.pixelData) {
    // Для GB7 изображений (градации серого)
    const pixelData = new Uint8Array(imageData.pixelData);
    const newPixelData = new Uint8Array(pixelData.length);

    for (let i = 0; i < pixelData.length; i++) {
      const grayValue = (pixelData[i] & 0x7F) << 1;
      const correctedValue = lut[grayValue] >> 1;
      newPixelData[i] = (pixelData[i] & 0x80) | (correctedValue & 0x7F);
    }

    return {
      ...imageData,
      pixelData: newPixelData.buffer
    };
  }

  return imageData;
};