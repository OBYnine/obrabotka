import React, { useState, useRef, useEffect } from 'react';
import './ImageProcessor.css';

import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Button,
  Paper,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  FileUpload as FileUploadIcon,
  ZoomIn as ZoomInIcon,
  Crop as CropIcon,
  PanTool as PanToolIcon,
  Menu as MenuIcon
} from '@mui/icons-material';

const ImageProcessor = () => {
    const [imageData, setImageData] = useState(null);
    const [status, setStatus] = useState('Ready to upload image');
    const [viewportSize, setViewportSize] = useState({
      width: window.innerWidth,
      height: window.innerHeight
    });
    const [activeTool, setActiveTool] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const canvasRef = useRef(null);
    const workerRef = useRef(null);
    const fileInputRef = useRef(null);
    
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
    const tools = [
      { id: 'move', name: 'Move Tool', icon: <PanToolIcon /> },
      { id: 'zoom', name: 'Zoom Tool', icon: <ZoomInIcon /> },
      { id: 'crop', name: 'Crop Tool', icon: <CropIcon /> }
    ];
  
    // Инициализация Worker
    useEffect(() => {
      workerRef.current = new Worker(new URL('./imageWorker.js', import.meta.url), {
        type: 'module'
      });
      
      workerRef.current.onmessage = (event) => {
        if (event.data.type === 'gb7Parsed') {
          setImageData({
            ...event.data.payload,
            format: 'gb7'
          });
          setStatus(`Loaded GB7 image`);
        } else if (event.data.type === 'error') {
          setStatus(`Error: ${event.data.message}`);
        }
      };
      
      return () => {
        workerRef.current.terminate();
      };
    }, []);

  // Функция для расчета масштаба изображения
  const calculateScale = (imgWidth, imgHeight) => {
    const maxWidth = Math.min(viewportSize.width - (isMobile ? 20 : 40), isMobile ? viewportSize.width : 1200);
    const maxHeight = Math.min(viewportSize.height - (isMobile ? 150 : 200), isMobile ? viewportSize.height * 0.7 : 800);
    
    const widthScale = maxWidth / imgWidth;
    const heightScale = maxHeight / imgHeight;
    
    return Math.min(widthScale, heightScale, 1);
  };

  // Отслеживание изменения размера окна
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      // Закрываем панель инструментов на мобильных при изменении ориентации
      if (window.innerWidth >= theme.breakpoints.values.sm) {
        setMobileOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [theme.breakpoints.values.sm]);

  // Обработка стандартных изображений
  const parseStandardImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            width: img.width,
            height: img.height,
            colorDepth: 32,
            imageElement: img,
            format: file.type.split('/')[1] || 'unknown'
          });
        };
        img.src = event.target.result;
      };
      
      reader.readAsDataURL(file);
    });
  };

  // Обработчик загрузки файла
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      setStatus('Loading image...');
      
      let imageInfo;
      if (file.name.endsWith('.gb7') || file.type === 'application/gb7') {
        // Читаем файл перед отправкой в Worker
        const arrayBuffer = await readFileAsArrayBuffer(file);
        workerRef.current.postMessage({
          type: 'parseGB7',
          buffer: arrayBuffer
        }, [arrayBuffer]);
        return;
      } else if (file.type.match('image.*')) {
        imageInfo = await parseStandardImage(file);
      } else {
        throw new Error('Unsupported file format');
      }
      
      setImageData(imageInfo);
      setStatus(`Loaded ${imageInfo.format.toUpperCase()} image`);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error(error);
    }
  };
  
  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('File reading failed'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Отрисовка изображения на canvas
  useEffect(() => {
    if (!imageData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Очистка canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (imageData.imageElement) {
      // Стандартные форматы изображений
      const scale = calculateScale(imageData.width, imageData.height);
      canvas.width = imageData.width * scale;
      canvas.height = imageData.height * scale;
      ctx.drawImage(imageData.imageElement, 0, 0, canvas.width, canvas.height);
    } else if (imageData.pixelData) {
      renderGB7Image(canvas, ctx, imageData);
    }
  }, [imageData, viewportSize, isMobile]);

  // Отрисовка GB7 изображения с учетом маски
  const renderGB7Image = (canvas, ctx, imageData) => {
    const pixelData = new Uint8Array(imageData.pixelData);
  
    const scale = calculateScale(imageData.width, imageData.height);
    const displayWidth = Math.floor(imageData.width * scale);
    const displayHeight = Math.floor(imageData.height * scale);
    
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    const tileSize = 512;
    const tilesX = Math.ceil(imageData.width / tileSize);
    const tilesY = Math.ceil(imageData.height / tileSize);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const x = tx * tileSize;
        const y = ty * tileSize;
        const tileWidth = Math.min(tileSize, imageData.width - x);
        const tileHeight = Math.min(tileSize, imageData.height - y);
        
        const tileData = tempCtx.createImageData(tileWidth, tileHeight);
        
        for (let py = 0; py < tileHeight; py++) {
          for (let px = 0; px < tileWidth; px++) {
            const srcPos = (y + py) * imageData.width + (x + px);
            const dstPos = (py * tileWidth + px) * 4;
            const pixelByte = imageData.pixelData[srcPos];
            
            let grayValue = (pixelByte & 0x7F) << 1;
            
            if (imageData.hasMask) {
              const isMasked = (pixelByte & 0x80) === 0;
              if (isMasked) {
                tileData.data[dstPos] = 0;
                tileData.data[dstPos + 1] = 0;
                tileData.data[dstPos + 2] = 0;
                tileData.data[dstPos + 3] = 0;
                continue;
              }
            }
            
            tileData.data[dstPos] = grayValue;
            tileData.data[dstPos + 1] = grayValue;
            tileData.data[dstPos + 2] = grayValue;
            tileData.data[dstPos + 3] = 255;
          }
        }
        
        tempCtx.putImageData(tileData, x, y);
      }
    }
    
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tempCanvas, 0, 0, displayWidth, displayHeight);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Верхняя панель */}
        <AppBar
      position="static"
      elevation={1}
      sx={{
        backgroundColor: '#87CEEB',
        color: '#333'               
  }}
>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            GrayBit-7 Image Processor
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={!isMobile && <FileUploadIcon />}
            onClick={() => fileInputRef.current.click()}
            size={isMobile ? "small" : "medium"}
          >
            {isMobile ? <FileUploadIcon /> : 'Open Image'}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/png, image/jpeg, .gb7, application/gb7"
            onChange={handleImageUpload}
          />
           {/* Панель инструментов - для десктопа */}
        {!isMobile && (
          <Paper 
            sx={{ 
              width: 'auto', 
              display: 'flex', 
              flexDirection: 'raw', 
              alignItems: 'center',
              padding: 0.5,
              gap: 1,
              zIndex: 1,
              ml: 2, 
              backgroundColor: '#f0f0f0'
            }}
            elevation={2}
          >
            {tools.map((tool) => (
              <Tooltip key={tool.id} title={tool.name} placement="right">
                <IconButton
                  color={activeTool === tool.id ? 'primary' : 'default'}
                  onClick={() => setActiveTool(tool.id)}
                  size={isMobile ? "small" : "medium"}
                >
                  {tool.icon}
                </IconButton>
              </Tooltip>
            ))}
          </Paper>
        )}

        {/* Панель инструментов - для мобильных */}
        {isMobile && (
          <Box
            sx={{
              left: 0,
              position: 'fixed',
              top: mobileOpen ? 70 : -80,
              width: '100%',
              height: 50,
              transition: 'top 0.3s',
              zIndex: 1200,
              backgroundColor: theme.palette.background.paper,
              boxShadow: 3,        
              boxSizing: 'border-box'
            }}
          >
            <Paper 
              sx={{ 
                width: 'auto', 
                height: '100%',
                display: 'flex', 
                flexDirection: 'raw', 
                alignItems: 'center',
                padding: 1,
                gap: 1
              }}
              elevation={0}
            >
              {tools.map((tool) => (
                <Tooltip key={tool.id} title={tool.name} placement="right">
                  <IconButton
                    color={activeTool === tool.id ? 'primary' : 'default'}
                    onClick={() => {
                      setActiveTool(tool.id);
                      setMobileOpen(false);
                    }}
                    size="small"
                  >
                    {tool.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </Paper>
          </Box>
        )}
        </Toolbar>
      </AppBar>

      {/* Основная область */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>

        {/* Рабочая область */}
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#617881ff',
          overflow: 'auto',
          p: isMobile ? 1 : 2,
        }}>
          <Paper elevation={3} sx={{ 
            display: 'inline-block',
            maxWidth: '100%',
            maxHeight: '100%'
          }}>
            <canvas
              ref={canvasRef}
              style={{
                display: 'block',
                backgroundColor: '#e0e0e0',
                maxWidth: '100%',
                maxHeight: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 120px)',
                width: 'auto',
                height: 'auto'
              }}
            />
          </Paper>
        </Box>
      </Box>

      {/* Статус бар */}
      <Paper 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: isMobile ? '4px 8px' : '4px 16px',
          backgroundColor: 'background.paper',
          flexWrap: 'wrap'
        }}
        elevation={2}
      >
        <Box sx={{ 
          display: 'flex', 
          gap: isMobile ? 0.5 : 2,
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {imageData ? (
            <>
              <Chip label={`${imageData.format.toUpperCase()}`} size="small" sx={{ m: isMobile ? '2px' : 0 }} />
              <Chip label={`${imageData.width}×${imageData.height}px`} size="small" sx={{ m: isMobile ? '2px' : 0 }} />
              {imageData.format === 'gb7' && (
                <>
                  <Chip label={`v${imageData.version}`} size="small" sx={{ m: isMobile ? '2px' : 0 }} />
                  <Chip 
                    label={`Mask: ${imageData.hasMask ? 'Yes' : 'No'}`} 
                    size="small" 
                    color={imageData.hasMask ? 'primary' : 'default'}
                    sx={{ m: isMobile ? '2px' : 0 }}
                  />
                </>
              )}
            </>
          ) : (
            <Typography variant="body2" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
              {status}
            </Typography>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ 
          fontSize: isMobile ? '0.75rem' : '0.875rem',
          ml: isMobile ? 'auto' : 0,
          mt: isMobile ? 1 : 0,
          width: isMobile ? '100%' : 'auto',
          textAlign: isMobile ? 'right' : 'left'
        }}>
          Viewport: {viewportSize.width}×{viewportSize.height}px
        </Typography>
      </Paper>
    </Box>
  );
};

export default ImageProcessor;