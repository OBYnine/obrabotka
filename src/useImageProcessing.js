// useImageProcessing.js
export const useImageProcessing = (setImageData, setOriginalImageData, setStatus, isMobile) => {
    const parseStandardImage = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            resolve({
              width: img.width,
              height: img.height,
              colorDepth: 32,
              imageElement: img,
              imageData: ctx.getImageData(0, 0, img.width, img.height).data,
              format: file.type.split('/')[1] || 'unknown'
            });
          };
          img.src = event.target.result;
        };
        
        reader.readAsDataURL(file);
      });
    };
  
    const readFileAsArrayBuffer = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('File reading failed'));
        reader.readAsArrayBuffer(file);
      });
    };
  
    const validateDimensions = (width, height) => {
        const result = {
            isValid: true,
            error: '',
            isCritical: false
        };
        
        if (width <= 0 || height <= 0) {
        result.isValid = false;
        result.error = 'Dimensions must be positive numbers';
        result.isCritical = true;
        return result;
        }
    
        if (width > 2000 || height > 2000) {
        result.isValid = false;
        result.error = 'Maximum allowed dimension is 2000px';
        result.isCritical = true;
        return result;
        }
    
        if (width * height > 4000000) {
        result.error = 'Large image size may affect performance';
        result.isCritical = false;
        // Не блокируем, только предупреждаем
        }
    
        return result;
    };
      
      
      
  
    const calculateInitialScale = (imgWidth, imgHeight) => {
      const maxWidth = Math.min(window.innerWidth - (isMobile ? 20 : 100), isMobile ? window.innerWidth : 1200);
      const maxHeight = Math.min(window.innerHeight - (isMobile ? 150 : 200), isMobile ? window.innerHeight * 0.7 : 800);
      
      const widthScale = (maxWidth / imgWidth) * 100;
      const heightScale = (maxHeight / imgHeight) * 100;
      
      const initialScale = Math.min(widthScale, heightScale, 100);
      setImageData(prev => ({ ...prev, scalePercent: initialScale }));
    };
  
    return {
      parseStandardImage,
      readFileAsArrayBuffer,
      validateDimensions,
      calculateInitialScale
    };
  };