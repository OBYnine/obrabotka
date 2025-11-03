// imageWorker.js

self.onmessage = async (event) => {
  if (event.data.type === 'parseGB7') {
    try {
      const buffer = event.data.buffer;
      const fileName = event.data.fileName || 'Unnamed.gb7';
      const imageData = parseGB7File(buffer);
      self.postMessage({
        type: 'gb7Parsed',
        payload: {
          ...imageData,
          pixelData: Array.from(imageData.pixelData),
          fileName
        }
      });
    } catch (error) {
      self.postMessage({ type: 'error', message: error.message });
    }
  }
};


function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('File reading failed'));
    reader.readAsArrayBuffer(file);
  });
}

function parseGB7File(buffer) {
  const header = new DataView(buffer, 0, 12);

  // Проверка сигнатуры
  const signature = [
    header.getUint8(0),
    header.getUint8(1),
    header.getUint8(2),
    header.getUint8(3)
  ];
  if (
    signature[0] !== 0x47 ||
    signature[1] !== 0x42 ||
    signature[2] !== 0x37 ||
    signature[3] !== 0x1D
  ) {
    throw new Error('Invalid GB7 file signature');
  }

  const version = header.getUint8(4);
  const flags = header.getUint8(5);
  const width = header.getUint16(6, false); // big-endian
  const height = header.getUint16(8, false);
  const reserved = header.getUint16(10, false);

  const hasMask = (flags & 0x01) === 0x01;

  // Проверка размера
  const maxPixels = 4096 * 4096;
  if (width * height > maxPixels) {
    throw new Error(`Image too large (${width}x${height}). Max supported: 4096x4096`);
  }

  // Чтение данных изображения
  const pixelData = new Uint8Array(buffer, 12, width * height);

  return {
    width,
    height,
    version,
    hasMask,
    pixelData,
    format: 'gb7'
  };
}