// filterWorker.js

self.onmessage = async (event) => {
  const { type, imageData, width, height, kernel, filterName } = event.data;

  if (type === 'applyFilter') {
    let result;

    if (filterName === 'median') {
      result = applyMedianFilter(imageData, width, height);
    } else if (filterName === 'laplacian') {
      result = applyLaplacianFilter(imageData, width, height);
    } else if (kernel) {
      result = applyKernel(imageData, kernel, width, height);
    }
    else {result = imageData}

    self.postMessage({
      type: 'result',
      width,
      height,
      imageData: result
    });
  }
};

function applyMedianFilter(imageData, width, height) {
  const input = imageData.data;
  const output = new Uint8ClampedArray(input.length);

  const getIndex = (x, y) => (y * width + x) * 4;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = [], g = [], b = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const i = getIndex(x + dx, y + dy);
          r.push(input[i]);
          g.push(input[i + 1]);
          b.push(input[i + 2]);
        }
      }
      const o = getIndex(x, y);
      output[o] = median(r);
      output[o + 1] = median(g);
      output[o + 2] = median(b);
      output[o + 3] = input[o + 3]; // preserve alpha
    }
  }

  return new ImageData(output, width, height);
}

function applyLaplacianFilter(imageData, width, height) {
  const kernel = [
    [0, 1, 0],
    [1, -4, 1],
    [0, 1, 0]
  ];
  return applyKernel(imageData, kernel, width, height);
}

function median(arr) {
  const sorted = arr.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function applyKernel(imageData, kernel, width, height) {
  const input = imageData.data;
  const output = new Uint8ClampedArray(width * height * 4);
  const side = kernel.length;
  const half = Math.floor(side / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;

      for (let ky = 0; ky < side; ky++) {
        for (let kx = 0; kx < side; kx++) {
          const px = clamp(x + kx - half, 0, width - 1);
          const py = clamp(y + ky - half, 0, height - 1);
          const weight = kernel[ky][kx];

          const pos = (py * width + px) * 4;
          r += input[pos] * weight;
          g += input[pos + 1] * weight;
          b += input[pos + 2] * weight;
        }
      }

      const outPos = (y * width + x) * 4;
      output[outPos] = clamp(r);
      output[outPos + 1] = clamp(g);
      output[outPos + 2] = clamp(b);
      output[outPos + 3] = input[outPos + 3]; // Сохраняем альфу
    }
  }

  return new ImageData(output, width, height);
}

function clamp(value, min = 0, max = 255) {
  return Math.min(max, Math.max(min, Math.round(value)));
}