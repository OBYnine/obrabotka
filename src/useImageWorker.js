// useImageWorker.js
import { useEffect, useRef } from 'react';

export const useImageWorker = (setImageData, setOriginalImageData, setStatus) => {
  const workerRef = useRef(null);
  
  useEffect(() => {
    workerRef.current = new Worker(new URL('./imageWorker.js', import.meta.url), {
      type: 'module'
    });
    
    workerRef.current.onmessage = (event) => {
      if (event.data.type === 'gb7Parsed') {
        const imageInfo = {
          ...event.data.payload,
          format: 'gb7'
        };
        setImageData(imageInfo);
        setOriginalImageData(imageInfo);
        setStatus(`Loaded GB7 image`);
      } else if (event.data.type === 'error') {
        setStatus(`Error: ${event.data.message}`);
      }
    };
    
    return () => {
      workerRef.current.terminate();
    };
  }, [setImageData, setOriginalImageData, setStatus]);

  return { workerRef };
};