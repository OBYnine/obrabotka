// ImageProcessor.jsx
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
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Slider,
  Alert
} from '@mui/material';
import {
  FileUpload as FileUploadIcon,
  ZoomIn as ZoomInIcon,
  Crop as CropIcon,
  PanTool as PanToolIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Check as CheckIcon
} from '@mui/icons-material';

import ColorizeIcon from '@mui/icons-material/Colorize';
import {
  rgbToXyz,
  xyzToLab,
  rgbToLab,
  labToLch,
  rgbToOklch,
  calculateContrastRatio
} from './colorUtils';

import { interpolate } from './interpolation';
import { useImageWorker } from './useImageWorker';
import { useImageProcessing } from './useImageProcessing';
import { useCanvas } from './useCanvas';

const ColorSpaceInfo = ({ color }) => {
  const xyz = rgbToXyz(color);
  const lab = xyzToLab(xyz);
  const lch = labToLch(lab);
  const oklch = rgbToOklch(color);

  return (
    <Box>
      <Typography variant="caption">RGB: {color.r}, {color.g}, {color.b}</Typography>
      <Tooltip title="RGB (Red, Green, Blue) - диапазон 0-255 для каждого канала">
        <span>ℹ️</span>
      </Tooltip>
      
      <Typography variant="caption">XYZ: {xyz.x.toFixed(2)}, {xyz.y.toFixed(2)}, {xyz.z.toFixed(2)}</Typography>
      <Tooltip title="XYZ - цветовое пространство CIE 1931, где Y - яркость, X и Z - хроматические компоненты">
        <span>ℹ️</span>
      </Tooltip>
      
      <Typography variant="caption">Lab: {lab.l.toFixed(2)}, {lab.a.toFixed(2)}, {lab.b.toFixed(2)}</Typography>
      <Tooltip title="CIE Lab - L (светлота 0-100), a (зеленый-красный), b (синий-желтый)">
        <span>ℹ️</span>
      </Tooltip>
      
      <Typography variant="caption">LCH: {lch.l.toFixed(2)}, {lch.c.toFixed(2)}, {lch.h.toFixed(2)}</Typography>
      <Tooltip title="LCH (Lightness, Chroma, Hue) - полярное представление Lab">
        <span>ℹ️</span>
      </Tooltip>
      
      <Typography variant="caption">OKLCH: {oklch.l.toFixed(2)}, {oklch.c.toFixed(2)}, {oklch.h.toFixed(2)}</Typography>
      <Tooltip title="OKLCH - перцептивно равномерное пространство, улучшенная версия LCH">
        <span>ℹ️</span>
      </Tooltip>
    </Box>
  );
};

const ImageProcessor = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Состояния
  const [imageData, setImageData] = useState(null);
  const [originalImageData, setOriginalImageData] = useState(null);
  const [status, setStatus] = useState('Ready to upload image');
  const [activeTool, setActiveTool] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [resizeMethod, setResizeMethod] = useState('percent');
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [interpolationMethod, setInterpolationMethod] = useState('bilinear');
  const [scalePercent, setScalePercent] = useState(100);
  const [scalePercentY, setScalePercentY] = useState(100); // Новое состояние для вертикального масштаба
  const [targetWidth, setTargetWidth] = useState(0);
  const [targetHeight, setTargetHeight] = useState(0);
  const [scaleInput, setScaleInput] = useState(100);
  const [validationError, setValidationError] = useState('');

  const [firstColor, setFirstColor] = useState(null);
  const [secondColor, setSecondColor] = useState(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [validation, setValidation] = useState({
    isValid: true,
    error: '',
    isCritical: false
  });

  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Хуки
  const { workerRef } = useImageWorker(setImageData, setOriginalImageData, setStatus);
  const { 
    parseStandardImage,
    readFileAsArrayBuffer,
    validateDimensions,
    calculateInitialScale
  } = useImageProcessing(setImageData, setOriginalImageData, setStatus, isMobile);
  
  const { renderCanvas } = useCanvas(
    canvasRef, 
    imageData, 
    scalePercent,
    keepAspectRatio ? scalePercent : scalePercentY,
    interpolationMethod
  );

  const tools = [
    { id: 'move', name: 'Move Tool (H)', icon: <PanToolIcon />, hotkey: 'h' },
    { id: 'eyedropper', name: 'Eyedropper Tool (I)', icon: <ColorizeIcon />, hotkey: 'i' },
    { id: 'zoom', name: 'Zoom Tool (Z)', icon: <ZoomInIcon />, action: () => setScaleDialogOpen(true), hotkey: 'z' },
    { id: 'crop', name: 'Crop Tool (C)', icon: <CropIcon />, hotkey: 'c' }
  ];

  const interpolationMethods = [
    { 
      value: 'bilinear', 
      label: 'Bilinear', 
      description: 'Плавное масштабирование с использованием линейной интерполяции. Дает более качественный результат, но работает медленнее.' 
    },
    { 
      value: 'nearestNeighbor', 
      label: 'Nearest Neighbor', 
      description: 'Быстрое масштабирование без сглаживания. Сохраняет четкие границы, но может создавать ступенчатые артефакты.' 
    }
  ];

  // Обработчик клика по canvas для пипетки
  const handleCanvasClick = (e) => {
    if (!imageData || activeTool !== 'eyedropper') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Учитываем смещение и масштаб
    const imgX = Math.floor((x - imageOffset.x) / (scalePercent / 100));
    const imgY = Math.floor((y - imageOffset.y) / (scalePercent / 100));

    if (imgX < 0 || imgY < 0 || imgX >= imageData.width || imgY >= imageData.height) return;

    const ctx = canvas.getContext('2d');
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const color = {
      r: pixel[0],
      g: pixel[1],
      b: pixel[2],
      a: pixel[3],
      x: imgX,
      y: imgY
    };

    if (e.altKey || e.ctrlKey || e.shiftKey) {
      setSecondColor(color);
    } else {
      setFirstColor(color);
    }
  };

  // Обработчики для инструмента "рука"
  const handleMouseDown = (e) => {
    if (activeTool === 'move' && e.button === 0) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imageOffset.x,
        y: e.clientY - imageOffset.y
      });
      e.preventDefault(); // Предотвращаем выделение текста при перетаскивании
    }
  };
  
  const handleMouseMove = (e) => {
    setCursorPosition({ x: e.clientX, y: e.clientY });
  
    if (isDragging && activeTool === 'move') {
      const newOffset = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      
      // Ограничиваем перемещение, чтобы часть изображения всегда оставалась видимой
      const canvas = canvasRef.current;
      if (canvas) {
        const container = canvas.parentElement.parentElement;
        const maxX = Math.max(0, canvas.width - container.clientWidth);
        const maxY = Math.max(0, canvas.height - container.clientHeight);
        
        newOffset.x = Math.min(0, Math.max(-maxX, newOffset.x));
        newOffset.y = Math.min(0, Math.max(-maxY, newOffset.y));
      }
      
      setImageOffset(newOffset);
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Обработчик клавиатуры для горячих клавиш
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tool = tools.find(t => t.hotkey === e.key.toLowerCase());
      if (tool) {
        setActiveTool(tool.id);
        if (tool.action) tool.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Обработчик загрузки файла
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      setStatus('Loading image...');
      
      let imageInfo;
      if (file.name.endsWith('.gb7') || file.type === 'application/gb7') {
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
      setOriginalImageData(imageInfo);
      setStatus(`Loaded ${imageInfo.format.toUpperCase()} image`);
      setScalePercent(100);
      setScalePercentY(100);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error(error);
    }
  };

  // Изменение размера изображения
  const resizeImage = () => {
    if (!originalImageData) return;
    
    let newWidth, newHeight;
    
    if (resizeMethod === 'percent') {
      const scaleX = scaleInput / 100;
      const scaleY = keepAspectRatio ? scaleX : scalePercentY / 100;
      
      newWidth = Math.round(originalImageData.width * scaleX);
      newHeight = Math.round(originalImageData.height * scaleY);
    } else {
      newWidth = parseInt(targetWidth);
      newHeight = keepAspectRatio 
        ? Math.round(originalImageData.height * (targetWidth / originalImageData.width))
        : parseInt(targetHeight);
    }
  
    const validationResult = validateDimensions(newWidth, newHeight);
    setValidation(validationResult);
    
    if (validationResult.isCritical) {
      return;
    }
  
    // Применяем изменения
    const newScalePercent = Math.round((newWidth / originalImageData.width) * 100);
    setScalePercent(newScalePercent);
    setScaleInput(newScalePercent);
    
    if (!keepAspectRatio) {
      const newScalePercentY = Math.round((newHeight / originalImageData.height) * 100);
      setScalePercentY(newScalePercentY);
    }
  

    
    if (originalImageData.imageElement) {
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = originalImageData.width;
      tempCanvas.height = originalImageData.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(originalImageData.imageElement, 0, 0);
      
      const srcData = tempCtx.getImageData(0, 0, originalImageData.width, originalImageData.height).data;
      const dstData = interpolate[interpolationMethod](
        srcData,
        originalImageData.width,
        originalImageData.height,
        newWidth,
        newHeight
      );
      
      const imageData = new ImageData(new Uint8ClampedArray(dstData), newWidth, newHeight);
      ctx.putImageData(imageData, 0, 0);
      
      const img = new Image();
      img.onload = () => {
        setImageData({
          ...originalImageData,
          width: newWidth,
          height: newHeight,
          imageElement: img
        });
      };
      img.src = canvas.toDataURL();
    } else if (originalImageData.pixelData) {
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = originalImageData.width;
      srcCanvas.height = originalImageData.height;
      const srcCtx = srcCanvas.getContext('2d');
      
      const pixelData = new Uint8Array(originalImageData.pixelData);
      const imageData = srcCtx.createImageData(originalImageData.width, originalImageData.height);
      
      for (let y = 0; y < originalImageData.height; y++) {
        for (let x = 0; x < originalImageData.width; x++) {
          const srcPos = y * originalImageData.width + x;
          const dstPos = (y * originalImageData.width + x) * 4;
          const pixelByte = pixelData[srcPos];
          let grayValue = (pixelByte & 0x7F) << 1;
          
          if (originalImageData.hasMask && (pixelByte & 0x80) === 0) {
            imageData.data[dstPos] = 0;
            imageData.data[dstPos + 1] = 0;
            imageData.data[dstPos + 2] = 0;
            imageData.data[dstPos + 3] = 0;
          } else {
            imageData.data[dstPos] = grayValue;
            imageData.data[dstPos + 1] = grayValue;
            imageData.data[dstPos + 2] = grayValue;
            imageData.data[dstPos + 3] = 255;
          }
        }
      }
      
      srcCtx.putImageData(imageData, 0, 0);
      
      const dstCanvas = document.createElement('canvas');
      dstCanvas.width = newWidth;
      dstCanvas.height = newHeight;
      const dstCtx = dstCanvas.getContext('2d');
      
      const dstData = interpolate[interpolationMethod](
        imageData.data,
        originalImageData.width,
        originalImageData.height,
        newWidth,
        newHeight
      );
      
      const newImageData = new ImageData(new Uint8ClampedArray(dstData), newWidth, newHeight);
      dstCtx.putImageData(newImageData, 0, 0);
      
      const newPixelData = new Uint8Array(newWidth * newHeight);
      const tempImageData = dstCtx.getImageData(0, 0, newWidth, newHeight).data;
      
      for (let i = 0; i < newWidth * newHeight; i++) {
        const pos = i * 4;
        const grayValue = Math.round((tempImageData[pos] + tempImageData[pos + 1] + tempImageData[pos + 2]) / 3) >> 1;
        newPixelData[i] = grayValue & 0x7F;
        
        if (originalImageData.hasMask) {
          if (tempImageData[pos + 3] === 0) {
            newPixelData[i] &= 0x7F;
          } else {
            newPixelData[i] |= 0x80;
          }
        }
      }
      
      setImageData({
        ...originalImageData,
        width: newWidth,
        height: newHeight,
        pixelData: newPixelData.buffer
      });
    }
    
    setScaleDialogOpen(false);
  };

  // Отрисовка на canvas
  useEffect(() => {
    renderCanvas();
  }, [imageData, scalePercent, interpolationMethod, renderCanvas]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleScaleChange = (e, newValue) => {
    setScaleInput(newValue);
    setScalePercent(newValue);
    if (keepAspectRatio) {
      setScalePercentY(newValue);
    }
    
    // Центрируем изображение после изменения масштаба
    if (canvasRef.current && imageData) {
      const canvas = canvasRef.current;
      const container = canvas.parentElement.parentElement;
      const newWidth = imageData.width * (newValue / 100);
      const newHeight = imageData.height * (newValue / 100);
      
      // Если новое изображение меньше контейнера - центрируем
      if (newWidth < container.clientWidth && newHeight < container.clientHeight) {
        setImageOffset({
          x: (container.clientWidth - newWidth) / 2 - canvas.offsetLeft,
          y: (container.clientHeight - newHeight) / 2 - canvas.offsetTop
        });
      } else {
        // Иначе сбрасываем смещение
        setImageOffset({ x: 0, y: 0 });
      }
    }
  };

  const handleScaleChangeY = (e, newValue) => {
    setScalePercentY(newValue);
  };


  const handleWidthChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setTargetWidth(value);
    
    if (keepAspectRatio && originalImageData) {
      const newHeight = Math.round(originalImageData.height * (value / originalImageData.width));
      setTargetHeight(newHeight);
      // Валидируем оба размера
      setValidation(validateDimensions(value, newHeight));
    } else {
      setValidation(validateDimensions(value, targetHeight));
    }
  };
  

  const handleHeightChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setTargetHeight(value);
    
    if (keepAspectRatio && originalImageData) {
      const newWidth = Math.round(originalImageData.width * (value / originalImageData.height));
      setTargetWidth(newWidth);
      setValidation(validateDimensions(newWidth, value));
    } else {
      setValidation(validateDimensions(targetWidth, value));
    }
  };
  
  const handleScaleChangeX = (e, newValue) => {
    setScaleInput(newValue);
    
    if (originalImageData) {
      const newWidth = Math.round(originalImageData.width * (newValue / 100));
      const newHeight = keepAspectRatio 
        ? Math.round(originalImageData.height * (newValue / 100))
        : Math.round(originalImageData.height * (scalePercentY / 100));
      
      setValidation(validateDimensions(newWidth, newHeight));
    }
  };
  

  const handleResizeMethodChange = (e) => {
    setResizeMethod(e.target.value);
    setValidationError('');
    if (originalImageData) {
      if (e.target.value === 'percent') {
        setScaleInput(scalePercent);
      } else {
        setTargetWidth(originalImageData.width);
        setTargetHeight(originalImageData.height);
      }
    }
  };

  const openScaleDialog = () => {
    if (!originalImageData) return;
    
    if (resizeMethod === 'percent') {
      setScaleInput(scalePercent);
    } else {
      setTargetWidth(originalImageData.width);
      setTargetHeight(originalImageData.height);
    }
    
    setValidationError('');
    setScaleDialogOpen(true);
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
                  onClick={tool.action || (() => setActiveTool(tool.id))}
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
                      if (tool.action) tool.action();
                      else setActiveTool(tool.id);
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
          position: 'relative'
        }}>
          <Paper elevation={3} sx={{ 
            display: 'inline-block',
            maxWidth: '100%',
            maxHeight: '100%',
            overflow: 'auto',
            position: 'relative'
          }}>
            <Box sx={{
              position: 'relative',
              display: 'inline-block'
            }}>
            <canvas
              ref={canvasRef}
              style={{
                display: 'block',
                backgroundColor: '#e0e0e0',
                cursor: activeTool === 'move' ? 'grab' : 
                      activeTool === 'eyedropper' ? 'crosshair' : 
                      'default',
                transform: `translate(${imageOffset.x}px, ${imageOffset.y}px)`,
                minWidth: imageData ? imageData.width * (scalePercent / 100) : 'auto',
                minHeight: imageData ? imageData.height * (scalePercent / 100) : 'auto'
              }}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            </Box>
            {activeTool === 'eyedropper' && (
            <Paper elevation={3} sx={{ 
              position: 'fixed', 
              top: 100, 
              right: 9, 
              width: 350, 
              p: 2,
              zIndex: 1000
            }}>
              <Typography variant="h6" gutterBottom>Color Information</Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2">Primary Color</Typography>
                  {firstColor ? (
                    <>
                      <Box sx={{ 
                        width: 40, 
                        height: 40, 
                        backgroundColor: `rgba(${firstColor.r}, ${firstColor.g}, ${firstColor.b}, ${firstColor.a / 255})`,
                        border: '1px solid #ccc'
                      }} />
                      <Typography>Position: {firstColor.x}, {firstColor.y}</Typography>
                      <ColorSpaceInfo color={firstColor} />
                    </>
                  ) : (
                    <Typography variant="body2">Click to select primary color</Typography>
                  )}
                </Box>
                
                <Box>
                  <Typography variant="subtitle2">Secondary Color</Typography>
                  {secondColor ? (
                    <>
                      <Box sx={{ 
                        width: 40, 
                        height: 40, 
                        backgroundColor: `rgba(${secondColor.r}, ${secondColor.g}, ${secondColor.b}, ${secondColor.a / 255})`,
                        border: '1px solid #ccc'
                      }} />
                      <Typography>Position: {secondColor.x}, {secondColor.y}</Typography>
                      <ColorSpaceInfo color={secondColor} />
                    </>
                  ) : (
                    <Typography variant="body2">Alt+Click to select secondary color</Typography>
                  )}
                </Box>
              </Box>
              
              {firstColor && secondColor && (
                <Box>
                  <Typography variant="subtitle2">Contrast Ratio</Typography>
                  <Typography>
                    {calculateContrastRatio(firstColor, secondColor).toFixed(2)}:1
                  </Typography>
                </Box>
              )}
            </Paper>
          )}
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
              <Chip label={`${imageData.colorDepth || 8}bpp`} size="small" sx={{ m: isMobile ? '2px' : 0 }} />
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
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 2,
          ml: isMobile ? 'auto' : 0,
          mt: isMobile ? 1 : 0,
          width: isMobile ? '100%' : 'auto'
        }}>
          {imageData && (
            <>
              <Tooltip title="Change image scale">
                <IconButton size="small" onClick={openScaleDialog}>
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Slider
                value={scalePercent}
                onChange={handleScaleChange}
                min={12}
                max={300}
                step={1}
                sx={{ 
                  width: isMobile ? 100 : 150,
                  mx: 1
                }}
              />
              <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'center' }}>
                {scalePercent}%
              </Typography>
            </>
          )}
        </Box>
      </Paper>

      {/* Модальное окно изменения размера */}
      <Dialog open={scaleDialogOpen} onClose={() => setScaleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Resize Image
          <IconButton
            aria-label="close"
            onClick={() => setScaleDialogOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {originalImageData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Original size: {originalImageData.width}×{originalImageData.height}px</Typography>
                <Typography>Current size: {imageData?.width || 0}×{imageData?.height || 0}px</Typography>
              </Box>
              
              {!validation.isValid && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {validation.error}
              </Alert>
            )}
              
              <FormControl fullWidth>
                <InputLabel>Resize Method</InputLabel>
                <Select
                  value={resizeMethod}
                  label="Resize Method"
                  onChange={handleResizeMethodChange}
                >
                  <MenuItem value="percent">Percentage</MenuItem>
                  <MenuItem value="pixels">Pixels</MenuItem>
                </Select>
              </FormControl>
              
              {resizeMethod === 'percent' ? (
                <Box>
                  <Typography gutterBottom>Scale X: {scaleInput}%</Typography>
                  <Slider
                    value={scaleInput}
                    onChange={handleScaleChange}
                    min={12}
                    max={300}
                    step={1}
                  />
                  
                  {!keepAspectRatio && (
                    <>
                      <Typography gutterBottom sx={{ mt: 2 }}>Scale Y: {scalePercentY}%</Typography>
                      <Slider
                        value={scalePercentY}
                        onChange={handleScaleChangeY}
                        min={12}
                        max={300}
                        step={1}
                        disabled={keepAspectRatio}
                      />
                    </>
                )}
              </Box>
              ) : (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Width"
                    type="number"
                    value={targetWidth}
                    onChange={handleWidthChange}
                    fullWidth
                    inputProps={{ min: 1, max: 10000 }}
                    error={!!validationError}
                  />
                  <TextField
                    label="Height"
                    type="number"
                    value={targetHeight}
                    onChange={handleHeightChange}
                    fullWidth
                    inputProps={{ min: 1, max: 10000 }}
                    disabled={keepAspectRatio}
                    error={!!validationError}
                  />
                </Box>
              )}
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={keepAspectRatio}
                    onChange={(e) => {
                      setKeepAspectRatio(e.target.checked);
                      if (e.target.checked) {
                        setScalePercentY(scalePercent);
                      }
                    }}
                  />
                }
                label="Maintain aspect ratio"
              />
              
              <FormControl fullWidth>
                <InputLabel>Interpolation Method</InputLabel>
                <Select
                  value={interpolationMethod}
                  label="Interpolation Method"
                  onChange={(e) => setInterpolationMethod(e.target.value)}
                >
                  {interpolationMethods.map((method) => (
                    <MenuItem key={method.value} value={method.value}>
                      <Tooltip title={method.description} placement="right" arrow>
                        <Box sx={{ width: '100%' }}>{method.label}</Box>
                      </Tooltip>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScaleDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={resizeImage}
            variant="contained"
            disabled={!validation.isValid || !originalImageData}
            startIcon={<CheckIcon />}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImageProcessor;