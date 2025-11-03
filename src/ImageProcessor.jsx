// ImageProcessor.jsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  PanTool as PanToolIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Check as CheckIcon
} from '@mui/icons-material';

import FilterAltIcon from '@mui/icons-material/FilterAlt';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import ColorizeIcon from '@mui/icons-material/Colorize';

import {
  rgbToXyz,
  xyzToLab,
  rgbToLab,
  labToLch,
  rgbToOklch,
  calculateContrastRatio
} from './colorUtils';

import { useFilterWorker } from './useFilterWorker';
import { useImageWorker } from './useImageWorker';
import { useImageProcessing } from './useImageProcessing';

import { saveAsPNG, saveAsJPG, saveAsGB7 } from './imageExport';
import { createGB7Image, useCanvas } from './useCanvas';

import { LayersPanel } from './LayersPanel';
import CustomFilterDialog from './CustomFilterDialog';
import GradationCorrectionDialog from './GradationCorrectionDialog';


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

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const handleExportDialogOpen = () => setExportDialogOpen(true);
  const handleExportDialogClose = () => setExportDialogOpen(false);

  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [newLayerDialogOpen, setNewLayerDialogOpen] = useState(false);
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [gradationDialogOpen, setGradationDialogOpen] = useState(false);

  const [history, setHistory] = useState([]);

  const [draggedLayer, setDraggedLayer] = useState(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  
  const [layers, setLayers] = useState([]);
  const [activeLayerId, setActiveLayerId] = useState(null);

  const [selectedColor, setSelectedColor] = useState('#ffffff');

  const [imageData, setImageData] = useState(null);
  const [originalImageData, setOriginalImageData] = useState(null);
  const [status, setStatus] = useState('Ready to upload image');
  const [activeTool, setActiveTool] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
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
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });

  const [validation, setValidation] = useState({
    isValid: true,
    error: '',
    isCritical: false
  });

  const canvasRef = useRef(null);
  
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
    layers,
    scalePercent,
    keepAspectRatio ? scalePercent : scalePercentY,
    interpolationMethod,
    imageOffset
  );

  const { applyConvolutionFilter, applyMedianFilter, applyLaplacianFilter } = useFilterWorker();

  const tools = [
    { id: 'move', name: 'Move Tool (H)', icon: <PanToolIcon />, hotkey: ['h', 'р'] },
    { id: 'eyedropper', name: 'Eyedropper Tool (I)', icon: <ColorizeIcon />, hotkey: ['i', 'ш'] },
    { id: 'zoom', name: 'Zoom Tool (Z)', icon: <ZoomInIcon />, action: () => setScaleDialogOpen(true), hotkey: ['z', 'я'] },
    { 
      id: 'gradation', 
      name: 'Gradation Correction (G)', 
      icon: <TuneIcon />, 
      action: () => {
        if (!activeLayerId) {
          setStatus('Please select a layer first');
          return;
        }
        setGradationDialogOpen(true);
      },
      hotkey: ['g', 'п'] 
    },
    { 
      id: 'filter', 
      name: 'Filter (F)', 
      icon: <FilterAltIcon />, 
      action: () => {
        if (!activeLayerId) {
          setStatus('Please select a layer first');
          return;
        }
        setFilterDialogOpen(true);
      },
      hotkey: ['f', 'а'] 
    }
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

  const createAlphaImage = (image) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        data[i] = data[i + 1] = data[i + 2] = alpha;
        data[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);

      const alphaImg = new Image();
      alphaImg.onload = () => resolve(alphaImg);
      alphaImg.src = canvas.toDataURL();
    });
  };


  const handleApplyMedian = async () => {
    const activeLayer = layers.find(layer => layer.id === activeLayerId);
    if (!activeLayer?.image) return;

    const result = await applyMedianFilter(activeLayer.image);
    setLayers(prev =>
      prev.map(layer =>
        layer.id === activeLayerId ? { ...layer, image: result } : layer
      )
    );
  };

const handleApplyLaplacian = async () => {
  const activeLayer = layers.find(layer => layer.id === activeLayerId);
  if (!activeLayer?.image) return;

  const result = await applyLaplacianFilter(activeLayer.image);
  setLayers(prev =>
    prev.map(layer =>
      layer.id === activeLayerId ? { ...layer, image: result } : layer
    )
  );
};


  const applyLUTToLayer = (layer, lut) => {
    if (!layer.image) return layer;
    
    const canvas = document.createElement('canvas');
    canvas.width = layer.image.width;
    canvas.height = layer.image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(layer.image, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = lut[data[i]];     // R
      data[i + 1] = lut[data[i + 1]]; // G
      data[i + 2] = lut[data[i + 2]]; // B
      // Alpha channel (data[i+3]) не изменяем
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const correctedImage = new Image();
    correctedImage.onload = () => {
      // Обновляем состояние после загрузки изображения
      setLayers(prev => prev.map(l => 
        l.id === layer.id ? {...l, image: correctedImage} : l
      ));
    };
    correctedImage.src = canvas.toDataURL();
    
    return {
      ...layer,
      image: correctedImage
    };
  };

  const handleGradationCorrection = (layerId, lut, channel = 'rgb') => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    setHistory([...history, {
      layers: [...layers],
      timestamp: Date.now()
    }]);

    const canvas = document.createElement('canvas');
    canvas.width = layer.image.width;
    canvas.height = layer.image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(layer.image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (channel === 'red') {
        data[i] = lut[data[i]];
      } else if (channel === 'green') {
        data[i + 1] = lut[data[i + 1]];
      } else if (channel === 'blue') {
        data[i + 2] = lut[data[i + 2]];
      } else if (channel === 'alpha') {
        data[i + 3] = lut[data[i + 3]];
      } else {
        data[i] = lut[data[i]];
        data[i + 1] = lut[data[i + 1]];
        data[i + 2] = lut[data[i + 2]];
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const correctedImage = new Image();
    correctedImage.onload = () => {
      setLayers(prev => prev.map(l =>
        l.id === layerId ? { ...l, image: correctedImage } : l
      ));
    };
    correctedImage.src = canvas.toDataURL();
  };



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

  const handleAddLayer = async () => {
    if (layers.length >= 2) {
      setStatus('Maximum 2 layers allowed');
      return;
    }
    setNewLayerDialogOpen(true);
  };

  const handleLayerFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setStatus('');
            setNewLayerDialogOpen(false);
      if (file.name.endsWith('.gb7')) {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        // Всегда добавляем новый GB7-слой
        workerRef.current.postMessage(
          { type: 'parseGB7', buffer: arrayBuffer, fileName: file.name },
          [arrayBuffer]
        );

        return;
      }
      else if (file.type.match('image.*')) {
        const imageInfo = await parseStandardImage(file);
        const alphaImage = await createAlphaImage(imageInfo.imageElement);
        
        const newLayer = {
          id: Date.now(),
          name: file.name,
          image: imageInfo.imageElement,
          originalImage: imageInfo.imageElement,
          alphaImage,
          thumbnail: createThumbnail(imageInfo.imageElement),
          opacity: 1,
          blendMode: 'normal',
          visible: true,
          x: 0,
          y: 0,
          showAlpha: false,            
          hasAlpha: true,              
        };

        setLayers(prev => [...prev, newLayer].slice(0, MAX_LAYERS));
        setActiveLayerId(newLayer.id);
      } else {
        throw new Error('Unsupported file format');
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  function createAlphaThumbnail(image, size = 50) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const ratio = Math.min(size / image.width, size / image.height);
    const w = image.width * ratio;
    const h = image.height * ratio;
    ctx.drawImage(image, (size - w)/2, (size - h)/2, w, h);
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i+3];
      d[i] = d[i+1] = d[i+2] = a;
      d[i+3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
  }

  // Обработчик сообщений от worker
  useEffect(() => {
    workerRef.current.onmessage = async (event) => {
      if (event.data.type === 'gb7Parsed') {
        const { width, height, pixelData, hasMask, fileName } = event.data.payload;
        const images = await createGB7Image(width, height, pixelData, hasMask);
        
        // Создаём миниатюру альфа-канала
        const alphaThumbnail = createAlphaThumbnail(images.imageWithAlpha);

        // Создаём и добавляем новый слой
        const newLayer = {
          id: Date.now(),
          name: fileName,
          image: images.imageWithAlpha,           // Изображение С альфой
          imageWithoutAlpha: images.imageWithoutAlpha, // Изображение БЕЗ альфы
          originalImage: images.imageWithAlpha,
          thumbnail: createThumbnail(images.imageWithAlpha),
          alphaThumbnail,
          opacity: 1,
          blendMode: 'normal',
          visible: true,
          x: 0,
          y: 0,
          showAlpha: false,
          hasAlpha: true,
        };
        setLayers(prev => [...prev, newLayer]);
        setActiveLayerId(newLayer.id);
        setStatus('');
        setNewLayerDialogOpen(false);
      }
      else if (event.data.type === 'error') {
        setStatus(`Error: ${event.data.message}`);
      }
    };
  }, [layers]);


  const handleCreateColorLayer = () => {
    // Определяем размеры нового слоя
    let width, height;
    
    if (layers.length === 0) {
      // Если это первый слой, создаем с базовым размером
      width = 800;
      height = 600;
    } else {
      // Если уже есть слои, берем размер первого слоя
      width = layers[0].image?.width || 800;
      height = layers[0].image?.height || 600;
    }

    // Создаем canvas с нужным цветом
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Заполняем canvas выбранным цветом
    ctx.fillStyle = selectedColor;
    ctx.fillRect(0, 0, width, height);

    // Создаем изображение из canvas
    const image = new Image();
    image.src = canvas.toDataURL();

    const newLayer = {
      id: Date.now(),
      name: `Color Layer (${selectedColor})`,
      image: image,
      thumbnail: createThumbnail(image),
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      x: 0,
      y: 0,
      isColorLayer: true,
      color: selectedColor,
      showAlpha: false,
      hasAlpha: true,
    };

    setLayers([...layers, newLayer]);
    setActiveLayerId(newLayer.id);
    setNewLayerDialogOpen(false);
  };

  // Обработчик клика по canvas для пипетки
  const handleCanvasClick = (e) => {
    if (!imageData && layers.length === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - imageOffset.x;
    const y = e.clientY - rect.top - imageOffset.y;

    // Учитываем масштаб
    const imgX = Math.floor(x / (scalePercent / 100));
    const imgY = Math.floor(y / (scalePercent / 100));

    let pixel = null;
    const ctx = canvas.getContext('2d');
    
    // Проверяем основной imageData
    if (imageData) {
      if (imgX >= 0 && imgY >= 0 && imgX < imageData.width && imgY < imageData.height) {
        pixel = ctx.getImageData(x, y, 1, 1).data;
      }
    }

    // Если не найден в основном изображении, проверяем слои
    if (!pixel) {
      layers.some(layer => {
        if (layer.image && layer.visible) {
          const layerX = imgX - (layer.x || 0);
          const layerY = imgY - (layer.y || 0);
          if (layerX >= 0 && layerY >= 0 && layerX < layer.image.width && layerY < layer.image.height) {
            pixel = ctx.getImageData(x, y, 1, 1).data;
            return true;
          }
        }
        return false;
      });
    }

    if (!pixel) return;

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

  // Для инструмента "Рука"
  const handleMouseDown = (e) => {
    if (activeTool !== 'move') return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - imageOffset.x;
    const mouseY = e.clientY - rect.top - imageOffset.y;

    // Проверяем все слои
    const clickedLayer = layers.find(layer => {
      if (!layer.visible || !layer.image) return false;
      
      const layerWidth = layer.image.width * (scalePercent / 100);
      const layerHeight = layer.image.height * (scalePercent / 100);
      
      return (
        mouseX >= layer.x && 
        mouseX <= layer.x + layerWidth &&
        mouseY >= layer.y && 
        mouseY <= layer.y + layerHeight
      );
    });

    if (clickedLayer) {
      setDraggedLayer(clickedLayer.id);
      setDragStartPos({ 
        x: mouseX - clickedLayer.x, 
        y: mouseY - clickedLayer.y 
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (!draggedLayer || activeTool !== 'move') return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setLayers(layers.map(layer => {
      if (layer.id === draggedLayer) {
        return {
          ...layer,
          x: mouseX - dragStartPos.x,
          y: mouseY - dragStartPos.y
        };
      }
      return layer;
    }));

    e.preventDefault();
  };

  const handleMouseUp = () => {
    setDraggedLayer(null);
  };

  // Обработчик клавиатуры для горячих клавиш
  useEffect(() => {
    const handleKeyDown = (e) => {
      // игнорируем, если фокус в input/textarea/select
      const tag = document.activeElement.tagName.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;

      // Горячие клавиши инструментов
      const tool = tools.find(t => t.hotkey.includes(e.key.toLowerCase()));
      if (tool) {
        setActiveTool(tool.id);
        if (tool.action) tool.action();
        return;
      }

      // Перемещение активного слоя стрелками
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) &&
        activeLayerId !== null
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;

        setLayers(prevLayers => {
          const updated = prevLayers.map(layer => {
            if (layer.id !== activeLayerId) return layer;

            let newX = layer.x ?? 0;
            let newY = layer.y ?? 0;

            if (e.key === 'ArrowUp') newY -= step;
            if (e.key === 'ArrowDown') newY += step;
            if (e.key === 'ArrowLeft') newX -= step;
            if (e.key === 'ArrowRight') newX += step;

            return { ...layer, x: newX, y: newY };
          });

          return updated;
        });
      }

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLayerId]);


  const MAX_LAYERS = 2; // Константа для максимального числа слоев
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setStatus('');
      let imageInfo;

      if (file.name.endsWith('.gb7')) {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        workerRef.current.postMessage(
          { type: 'parseGB7', buffer: arrayBuffer, fileName: file.name },
          [arrayBuffer]
        );
        return;
      } else if (file.type.match('image.*')) {
        imageInfo = await parseStandardImage(file);
      } else {
        throw new Error('Unsupported file format');
      }

      const newLayer = {
        id: Date.now(),
        name: file.name,
        image: imageInfo.imageElement,
        thumbnail: createThumbnail(imageInfo.imageElement),
        opacity: 1,
        blendMode: 'normal',
        visible: true,
        x: 0,
        y: 0,
        showAlpha: false,
        hasAlpha: true,
      };

      setLayers((prev) => [...prev, newLayer]);
      setActiveLayerId(newLayer.id);

    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  const resizeImage = () => {
    const activeLayer = layers.find(layer => layer.id === activeLayerId);
    const targetImage = activeLayer?.image || originalImageData?.imageElement;
    if (!targetImage) return;

    let newWidth, newHeight;

    if (resizeMethod === 'percent') {
      const scaleX = scaleInput / 100;
      const scaleY = keepAspectRatio ? scaleX : scalePercentY / 100;
      newWidth = Math.round(targetImage.width * scaleX);
      newHeight = Math.round(targetImage.height * scaleY);
    } else {
      newWidth = parseInt(targetWidth);
      newHeight = keepAspectRatio 
        ? Math.round(targetImage.height * (targetWidth / targetImage.width))
        : parseInt(targetHeight);
    }

    // Создаем новое изображение через canvas
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = interpolationMethod === 'bilinear';
    ctx.drawImage(targetImage, 0, 0, newWidth, newHeight);

    const resizedImage = new Image();
    resizedImage.src = canvas.toDataURL();
    resizedImage.onload = () => {
      // Обновляем активный слой с новым изображением
      setLayers(prev =>
        prev.map(layer =>
          layer.id === activeLayerId
            ? {
                ...layer,
                image: resizedImage,
                width: newWidth,
                height: newHeight
              }
            : layer
        )
      );
      setScaleDialogOpen(false);
    };
  };

  // Отрисовка на canvas
  useEffect(() => {
    renderCanvas();
  }, [imageData, scalePercent, interpolationMethod, renderCanvas]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleScaleChange = (e, newValue) => {
    const newScale = Math.min(Math.max(newValue, 12), 300);
  
    setScaleInput(newScale);
    setScalePercent(newScale);
    
    // Обновляем масштаб для всех слоёв
    setLayers(layers.map(layer => ({
      ...layer,
      scale: newScale / 100
    })));
    
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
      const result = validateDimensions(value, newHeight);
      setValidation(result);
    } else {
      const result = validateDimensions(value, targetHeight);
      setValidation(result);
    }
  };

  const handleHeightChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setTargetHeight(value);
    if (keepAspectRatio && originalImageData) {
      const newWidth = Math.round(originalImageData.width * (value / originalImageData.height));
      setTargetWidth(newWidth);
      const result = validateDimensions(newWidth, value);
      setValidation(result);
    } else {
      const result = validateDimensions(targetWidth, value);
      setValidation(result);
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
    const method = e.target.value;
    setResizeMethod(method);

    const activeLayer = layers.find(l => l.id === activeLayerId);
    const targetImage = activeLayer?.image || originalImageData?.imageElement;

    if (!targetImage) return;

    const width = targetImage.width;
    const height = targetImage.height;

    if (method === 'percent') {
      setScaleInput(scalePercent); // восстанавливаем текущий scale
      const result = validateDimensions(width * (scaleInput / 100), height * (scaleInput / 100));
      setValidation(result);
    } else {
      setTargetWidth(width);
      setTargetHeight(height);
      const result = validateDimensions(width, height);
      setValidation(result);
    }
  };

  const openScaleDialog = () => {
    const activeLayer = layers.find(layer => layer.id === activeLayerId);
    const targetImage = activeLayer?.image || originalImageData?.imageElement;
    if (!targetImage) {
      setStatus('Please load an image or select a layer');
      return;
    }

    // Установка начальных значений на основе изображения
    const initialWidth = targetImage.width;
    const initialHeight = targetImage.height;

    if (resizeMethod === 'percent') {
      setScaleInput(scalePercent);
    } else {
      setTargetWidth(initialWidth);
      setTargetHeight(initialHeight);
      // Валидируем сразу
      const result = validateDimensions(initialWidth, initialHeight);
      setValidation(result);
    }

    setValidationError('');
    setScaleDialogOpen(true);
  };

  const CustomDialog = ({ open, onClose, children }) => {
    if (!open) return null;
    
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1300
      }}>
        <Paper sx={{ 
          padding: 3,
          minWidth: 300,
          outline: 'none' // Убираем outline чтобы не было двойного фокуса
        }}>
          {children}
        </Paper>
      </div>
    );
  };

const handleApplyFilter = async (kernelOrName) => {
  const activeLayer = layers.find(layer => layer.id === activeLayerId);
  if (!activeLayer?.image) return;

  let resultImage = null;

  if (kernelOrName === 'median') {
    resultImage = await applyMedianFilter(activeLayer.image);
  } else if (kernelOrName === 'laplacian') {
    resultImage = await applyLaplacianFilter(activeLayer.image);
  } else {
    resultImage = await applyConvolutionFilter(activeLayer.image, kernelOrName);
  }

  setLayers(prev =>
    prev.map(layer =>
      layer.id === activeLayerId ? { ...layer, image: resultImage } : layer
    )
  );
};


  const renderAllLayersToCanvas = () => {
    if (!layers.length) return null;

    // Вычисляем максимальные габариты для всех слоёв
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    layers.forEach(layer => {
      if (!layer.image || !layer.visible) return;
      const x = layer.x || 0;
      const y = layer.y || 0;
      const w = layer.image.width;
      const h = layer.image.height;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    const canvasWidth = maxX - minX;
    const canvasHeight = maxY - minY;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Отрисовка всех слоёв с учетом смещения (minX/minY)
    [...layers].reverse().forEach(layer => {
      if (!layer.visible || !layer.image) return;

      const x = (layer.x || 0) - minX;
      const y = (layer.y || 0) - minY;

      ctx.save();
      ctx.globalAlpha = layer.opacity ?? 1.0;
      ctx.globalCompositeOperation = layer.blendMode ?? 'normal';
      ctx.drawImage(layer.image, x, y);
      ctx.restore();
    });

    return canvas;
  };

  const handleExportPNG = () => {
    const canvas = renderAllLayersToCanvas();
    if (canvas) saveAsPNG(canvas);
  };

  const handleExportJPG = () => {
    const canvas = renderAllLayersToCanvas();
    if (canvas) saveAsJPG(canvas);
  };


  const handleExportGB7 = () => {
    const canvas = renderAllLayersToCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    const pixelData = new Uint8Array(canvas.width * canvas.height);

    for (let i = 0; i < pixelData.length; i++) {
      const offset = i * 4;
      const r = imageData[offset];
      const g = imageData[offset + 1];
      const b = imageData[offset + 2];
      const a = imageData[offset + 3];

      const gray = Math.round((r + g + b) / 3);
      const maskBit = a < 128 ? 0x00 : 0x80; // если альфа < 50%, считаем пиксель прозрачным
      const byte = maskBit | (gray >> 1); // 7 бит: 1 бит маски + 6 бит яркости

      pixelData[i] = byte;
    }

    saveAsGB7(pixelData, canvas.width, canvas.height, true);
  };


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '97vh' }}>
      {/* Верхняя панель */}
      <AppBar
      position="static"
      elevation={1}
      sx={{
        backgroundColor: '#6c7b81ff',
        color: '#000000ff'               
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
            Photoshop
          </Typography>

         <Button
          variant="contained"
          onClick={handleExportDialogOpen}
          sx={{
            backgroundColor: '#fff',
            color: '#333',
            '&:hover': {
              backgroundColor: '#f0f0f0'
            }
          }}
        >
          Сохранить фото
        </Button>

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
              <Tooltip title={tool.name} key={tool.id} placement="right">
                <IconButton
                  color={activeTool === tool.id ? 'primary' : 'default'}
                  onClick={() => {
                    if (tool.id === 'gradation' && !activeLayerId) {
                      setStatus('Select a layer to apply gradation correction');
                      return;
                    }
                    tool.action?.() || setActiveTool(tool.id);
                  }}
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
      <GradationCorrectionDialog
        open={gradationDialogOpen}
        onClose={() => setGradationDialogOpen(false)}
        layers={layers}
        activeLayerId={activeLayerId}
        onApplyCorrection={handleGradationCorrection}
        setLayers={setLayers}
        
      />
      <CustomFilterDialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        onApply={handleApplyFilter}
        activeLayer={layers.find(l => l.id === activeLayerId)}
        setLayers={setLayers}
        activeLayerId={activeLayerId}
        layers={layers}
      />
      <LayersPanel
        layers={layers}
        activeLayerId={activeLayerId}
        setLayers={setLayers}
        setActiveLayerId={setActiveLayerId}
        handleAddLayer={handleAddLayer}
        handleLayerFileUpload={handleLayerFileUpload}
      />
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#ffffffff',
          overflow: 'auto',
          p: isMobile ? 1 : 2,
          ml: isMobile ? 0 : '0px',
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
            {layers.length > 0 && (
              <canvas
                ref={canvasRef}
                style={{
                  display: 'block',
                  backgroundColor: '#e0e0e0ff',
                  cursor: activeTool === 'move' 
                    ? (draggedLayer ? 'grabbing' : 'grab') 
                    : activeTool === 'eyedropper' ? 'crosshair' : 'default',
                  transform: `translate(${imageOffset.x}px, ${imageOffset.y}px)`
                }}
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            )}
            </Box>
            {activeTool === 'eyedropper' && (
            <Paper elevation={3} sx={{ 
              position: 'fixed', 
              bottom: 16, 
              right: 16, 
              width: 320, 
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
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {layers[0] && (
          <>
            <Chip label={layers[0].name} size="small" />
            <Chip 
              label={`${layers[0].image.width}×${layers[0].image.height}px`} 
              size="small" 
            />
          </>
        )}
        <Typography variant="body2" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
          {status}
        </Typography>
      </Box>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 2,
          ml: isMobile ? 'auto' : 0,
          mt: isMobile ? 1 : 0,
          width: isMobile ? '100%' : 'auto'
        }}>
          {layers.length > 0 && (
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

      <Dialog open={exportDialogOpen} onClose={handleExportDialogClose}>
      <DialogTitle>Экспорт изображения</DialogTitle>
      <DialogContent dividers>
        <Typography>Выберите формат:</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Button variant="contained" onClick={handleExportPNG}>PNG</Button>
          <Button variant="contained" onClick={handleExportJPG}>JPG</Button>
          <Button variant="contained" onClick={handleExportGB7}>GB7</Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleExportDialogClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>


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
          {(() => {
              const activeLayer = layers.find(l => l.id === activeLayerId);
              const currentImage = activeLayer?.image || originalImageData?.imageElement;
              return currentImage ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Original size: {currentImage.width}×{currentImage.height}px</Typography>
                    <Typography>Current size: {currentImage.width * (scalePercent/100)}×{currentImage.height * (scalePercent/100)}px</Typography>
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
                    ) : null;
            })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScaleDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={resizeImage}
            variant="contained"
            disabled={!validation.isValid}
            startIcon={<CheckIcon />}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <CustomDialog 
        open={newLayerDialogOpen} 
        onClose={() => setNewLayerDialogOpen(false)}
        role="dialog"
        aria-labelledby="layer-dialog-title"
        aria-modal="true"
      >
        <DialogTitle id="layer-dialog-title">Создать новый слой</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            component="label"
            startIcon={<DescriptionIcon />}
          >
            Загрузить изображение
            <input
              type="file"
              id="layer-upload-input"
              style={{ display: 'none' }}
              accept="image/*, .gb7"
              onChange={handleLayerFileUpload}
            />
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateColorLayer}
            >
              Создать цветной слой
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewLayerDialogOpen(false)}>Отмена</Button>
        </DialogActions>
      </CustomDialog>
    </Box>
  );
};

export default ImageProcessor;