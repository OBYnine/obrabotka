import { useCallback } from 'react';

export function useFilterWorker() {
  const filterWorkerPromise = import('./filterWorker.js')
    .then(() => new Worker(new URL('./filterWorker.js', import.meta.url), { type: 'module' }));

  const applyConvolutionFilter = useCallback(async (image, kernel) => {
    const worker = await filterWorkerPromise;

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      worker.postMessage({
        type: 'applyFilter',
        imageData,
        width: imageData.width,
        height: imageData.height,
        kernel
      });

      worker.onmessage = (e) => {
        if (e.data.type === 'result') {
          const resultCanvas = document.createElement('canvas');
          const resultCtx = resultCanvas.getContext('2d');
          resultCanvas.width = e.data.width;
          resultCanvas.height = e.data.height;
          resultCtx.putImageData(e.data.imageData, 0, 0);

          const resultImage = new Image();
          resultImage.onload = () => resolve(resultImage);
          resultImage.src = resultCanvas.toDataURL();
        }
      };
    });
  }, []);

  const applyMedianFilter = useCallback(async (image) => {
    const worker = await filterWorkerPromise;
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      worker.postMessage({
        type: 'applyFilter',
        imageData,
        width: imageData.width,
        height: imageData.height,
        filterName: 'median'
      });

      worker.onmessage = (e) => {
        if (e.data.type === 'result') {
          const resultCanvas = document.createElement('canvas');
          const resultCtx = resultCanvas.getContext('2d');
          resultCanvas.width = e.data.width;
          resultCanvas.height = e.data.height;
          resultCtx.putImageData(e.data.imageData, 0, 0);

          const resultImage = new Image();
          resultImage.onload = () => resolve(resultImage);
          resultImage.src = resultCanvas.toDataURL();
        }
      };
    });
  }, []);

  const applyLaplacianFilter = useCallback(async (image) => {
    const worker = await filterWorkerPromise;
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      worker.postMessage({
        type: 'applyFilter',
        imageData,
        width: imageData.width,
        height: imageData.height,
        filterName: 'laplacian'
      });

      worker.onmessage = (e) => {
        if (e.data.type === 'result') {
          const resultCanvas = document.createElement('canvas');
          const resultCtx = resultCanvas.getContext('2d');
          resultCanvas.width = e.data.width;
          resultCanvas.height = e.data.height;
          resultCtx.putImageData(e.data.imageData, 0, 0);

          const resultImage = new Image();
          resultImage.onload = () => resolve(resultImage);
          resultImage.src = resultCanvas.toDataURL();
        }
      };
    });
  }, []);

  return { 
    applyConvolutionFilter,
    applyMedianFilter,
    applyLaplacianFilter
  };
}
