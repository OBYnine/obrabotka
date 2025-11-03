// GradationCorrectionDialog.jsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Alert
} from '@mui/material';

const GradationCorrectionDialog = ({ 
  open, 
  onClose, 
  layers,
  activeLayerId,
  onApplyCorrection,
  setLayers
}) => {
  const [input1, setInput1] = useState(0);
  const [output1, setOutput1] = useState(0);
  const [input2, setInput2] = useState(255);
  const [output2, setOutput2] = useState(255);
  const [validationError, setValidationError] = useState('');
  const [preview, setPreview] = useState(false);
  const [histogram, setHistogram] = useState({ red: [], green: [], blue: [], alpha: [] });
  const [activeChannel, setActiveChannel] = useState('rgb');
  
  const originalLayerData = useRef(null);
  const previewCanvasRef = useRef(null);

  const [originalLayer, setOriginalLayer] = useState(null);
  const previewLayerRef = useRef(null);


  const activeLayer = layers.find(layer => layer.id === activeLayerId);

  // Функция для расчета гистограммы
  const calculateHistogram = useCallback((image) => {
    if (!image) return { red: [], green: [], blue: [], alpha: [] };

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const data = imageData.data;

    const hist = {
      red: new Array(256).fill(0),
      green: new Array(256).fill(0),
      blue: new Array(256).fill(0),
      alpha: new Array(256).fill(0)
    };

    for (let i = 0; i < data.length; i += 4) {
      hist.red[data[i]]++;
      hist.green[data[i + 1]]++;
      hist.blue[data[i + 2]]++;
      hist.alpha[data[i + 3]]++;
    }

    return hist;
  }, []);

  const getImageData = (image) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  // Применение LUT к canvas
  const applyLUTToCanvas = (canvas, lut, channel) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
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
      } else if (channel === 'rgb') {
        data[i] = lut[data[i]];
        data[i + 1] = lut[data[i + 1]];
        data[i + 2] = lut[data[i + 2]];
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };
  
  // Обновляем гистограмму при открытии диалога или изменении слоя
  useEffect(() => {
    if (open && activeLayer?.image) {
      const hist = calculateHistogram(activeLayer.image);
      setHistogram(hist);
    }
  }, [open, activeLayer, calculateHistogram]);

  // Инициализация при открытии
  useEffect(() => {
    if (open && activeLayerId) {
      const layer = layers.find(l => l.id === activeLayerId);
      if (!layer) return;

      // Создаем временный canvas для предпросмотра
      const canvas = document.createElement('canvas');
      canvas.width = layer.image.width;
      canvas.height = layer.image.height;
      previewCanvasRef.current = canvas;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(layer.image, 0, 0);

      originalLayerData.current = {
        imageSrc: canvas.toDataURL(), // всегда корректный base64
        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height)
      };
    }
  }, [open, activeLayerId]);


  // Валидация точек
  const validatePoints = (newInput1, newOutput1, newInput2, newOutput2) => {
    if (newInput1 > newInput2) {
      return {
        isValid: false,
        message: 'X первой точки не может быть больше X второй'
      };
    }
    
    if (newInput1 < 0 || newInput1 > 255 || 
        newInput2 < 0 || newInput2 > 255 ||
        newOutput1 < 0 || newOutput1 > 255 ||
        newOutput2 < 0 || newOutput2 > 255) {
      return {
        isValid: false,
        message: 'Значения должны быть в диапазоне 0-255'
      };
    }

    return { isValid: true };
  };
  //   const numValue = Math.min(255, Math.max(0, parseInt(value) || 0));
    
  //   setValidationError('');
  //   switch(type) {
  //     case 'input1': 
  //       if(numValue > input2) {
  //         // Swap points
  //         setInput1(input2);
  //         setInput2(numValue);
  //         setOutput1(output2);
  //         setOutput2(output1);
  //       } else {
  //         setInput1(numValue);
  //       }
  //       break;
  //     case 'input2':
  //       if(numValue < input1) {
  //         setInput2(input1);
  //         setInput1(numValue);
  //       } else {
  //         setInput2(numValue);
  //       }
  //       break;
  //     case 'output1': setOutput1(numValue); break;
  //     case 'output2': setOutput2(numValue); break;
  //   }
    
  //   // Принудительная перерисовка
  //   if(preview) {
  //     setLayers(prev => [...prev]);
  //   }
  // };

  const throttledSetInput1 = useCallback(throttle((value) => setInput1(value), 30), []);
  const throttledSetInput2 = useCallback(throttle((value) => setInput2(value), 30), []);
  const throttledSetOutput1 = useCallback(throttle((value) => setOutput1(value), 30), []);
  const throttledSetOutput2 = useCallback(throttle((value) => setOutput2(value), 30), []);

  // Обработчики изменения значений
  const handleInput1Change = (e) => {
    const newValue = parseInt(e.target.value);
    if (isNaN(newValue)) return;
    const validation = validatePoints(newValue, output1, input2, output2);
    if (!validation.isValid) {
      setValidationError(validation.message);
      return;
    }
    setValidationError('');
    throttledSetInput1(newValue);
  };

  const handleInput2Change = (e) => {
    const newValue = parseInt(e.target.value);
    if (isNaN(newValue)) return;

    const validation = validatePoints(input1, output1, newValue, output2);
    if (!validation.isValid) {
      setValidationError(validation.message);
      return;
    }

    setValidationError('');
    throttledSetInput2(newValue);
  };

  const handleOutput1Change = (e) => {
    const newValue = parseInt(e.target.value);
    if (isNaN(newValue)) return;

    const validation = validatePoints(input1, newValue, input2, output2);
    if (!validation.isValid) {
      setValidationError(validation.message);
      return;
    }

    setValidationError('');
    throttledSetOutput1(newValue);
  };

  const handleOutput2Change = (e) => {
    const newValue = parseInt(e.target.value);
    if (isNaN(newValue)) return;

    const validation = validatePoints(input1, output1, input2, newValue);
    if (!validation.isValid) {
      setValidationError(validation.message);
      return;
    }

    setValidationError('');
    throttledSetOutput2(newValue);
  };

  // Создание LUT (Look Up Table)
  const createLUT = useCallback(() => {
    const lut = new Array(256);
    for (let i = 0; i < 256; i++) {
      if (i <= input1) lut[i] = output1;
      else if (i >= input2) lut[i] = output2;
      else {
        const t = (i - input1) / (input2 - input1);
        lut[i] = Math.round(output1 + t * (output2 - output1));
      }
    }
    return lut;
  }, [input1, input2, output1, output2]);


  // Применение коррекции
  const handleApply = () => {
    if (!activeLayer) return;
    
    const lut = createLUT();
    onApplyCorrection(activeLayerId, lut, activeChannel);
    onClose();
  };

  // Сброс значений
  const handleReset = () => {
    setInput1(0);
    setOutput1(0);
    setInput2(255);
    setOutput2(255);
    setPreview(false);
    setValidationError('');
  };

  // Переключение каналов гистограммы
  const handleChannelChange = (channel) => {
    setActiveChannel(channel);
  };

  const applyLUTToLayer = useCallback((layer, lut) => {
    if (!layer?.image) return layer;
    
    const canvas = document.createElement('canvas');
    canvas.width = layer.image.width;
    canvas.height = layer.image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(layer.image, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = lut[data[i]];     // R
      data[i + 1] = lut[data[i + 1]]; // G
      data[i + 2] = lut[data[i + 2]]; // B
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    return {
      ...layer,
      previewImage: canvas.toDataURL() // Сохраняем как Data URL
    };
  }, []);


    // При открытии диалога сохраняем оригинальный слой
  useEffect(() => {
    if (open && activeLayer) {
      setOriginalLayer(activeLayer);
      previewLayerRef.current = { ...activeLayer };
    }
  }, [open, activeLayer]);

  const lut = useMemo(() => {
    const table = new Array(256);
    for (let i = 0; i < 256; i++) {
      if (i <= input1) table[i] = output1;
      else if (i >= input2) table[i] = output2;
      else {
        const t = (i - input1) / (input2 - input1);
        table[i] = Math.round(output1 + t * (output2 - output1));
      }
    }
    return table;
  }, [input1, input2, output1, output2]);

  // Применение предпросмотра — обёрнуто в debounce
  const applyPreview = useCallback(
    debounce(() => {
      if (!preview || !originalLayerData.current) return;

      const ctx = previewCanvasRef.current.getContext('2d', { willReadFrequently: true });
      ctx.putImageData(originalLayerData.current.imageData, 0, 0);

      applyLUTToCanvas(previewCanvasRef.current, lut, activeChannel);

      const tempImg = new Image();
      tempImg.onload = () => {
        setLayers(prev => prev.map(l =>
          l.id === activeLayerId ? { ...l, image: tempImg, isPreview: true } : l
        ));
      };
      tempImg.src = previewCanvasRef.current.toDataURL();
    }, 100), [lut, activeChannel, preview, activeLayerId, setLayers]);

    useEffect(() => {
      applyPreview();
    }, [lut, activeChannel, preview]);

  useEffect(() => {
    if (preview || !originalLayerData.current?.imageSrc) return;

    const originalImage = new Image();
    originalImage.onload = () => {
      setLayers(prev => prev.map(l =>
        l.id === activeLayerId ? { ...l, image: originalImage, isPreview: false } : l
      ));
    };
    originalImage.src = originalLayerData.current.imageSrc;
  }, [preview]);



  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm"
      fullWidth
      sx={{
  '& .MuiDialog-container': {
    alignItems: 'flex-start',
    justifyContent: 'flex-end', // ИЗМЕНЕНО: было flex-start
  },
  '& .MuiDialog-paper': {
    margin: '16px 16px 16px 0', // ИЗМЕНЕНО: было '16px 0 16px 16px'
    maxHeight: 'calc(100% - 32px)',
    width: '400px',
  }
}}

    >
      <DialogTitle sx={{ pb: 1, fontSize: '1rem' }}>Градационная коррекция</DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        {validationError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {validationError}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Выбор канала гистограммы */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant={activeChannel === 'rgb' ? 'contained' : 'outlined'} 
              size="small"
              onClick={() => handleChannelChange('rgb')}
            >
              RGB
            </Button>
            <Button 
              variant={activeChannel === 'red' ? 'contained' : 'outlined'} 
              size="small"
              onClick={() => handleChannelChange('red')}
              color="error"
            >
              Red
            </Button>
            <Button 
              variant={activeChannel === 'green' ? 'contained' : 'outlined'} 
              size="small"
              onClick={() => handleChannelChange('green')}
              color="success"
            >
              Green
            </Button>
            <Button 
              variant={activeChannel === 'blue' ? 'contained' : 'outlined'} 
              size="small"
              onClick={() => handleChannelChange('blue')}
              color="primary"
            >
              Blue
            </Button>
            <Button 
              variant={activeChannel === 'alpha' ? 'contained' : 'outlined'} 
              size="small"
              onClick={() => handleChannelChange('alpha')}
            >
              Alpha
            </Button>
          </Box>
          
          {/* Гистограмма */}
          <Box sx={{ 
            width: '100%', 
            height: '300px', 
            border: '1px solid #ccc',
            position: 'relative',
            backgroundColor: '#f5f5f5'
          }}>
            <HistogramChart 
              histogram={histogram} 
              input1={input1} 
              output1={output1} 
              input2={input2} 
              output2={output2} 
              activeChannel={activeChannel}
            />
          </Box>
          
          {/* Поля ввода */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Вход 1"
              size="small"
              type="number"
              value={input1}
              onChange={handleInput1Change}
              inputProps={{ min: 0, max: 255 }}
              error={!!validationError}
            />
            <TextField
              label="Выход 1"
              size="small"
              type="number"
              value={output1}
              onChange={handleOutput1Change}
              inputProps={{ min: 0, max: 255 }}
            />
            <TextField
              label="Вход 2"
              size="small"
              type="number"
              value={input2}
              onChange={handleInput2Change}
              inputProps={{ min: 0, max: 255 }}
              error={!!validationError}
            />
            <TextField
              label="Выход 2"
              size="small"
              type="number"
              value={output2}
              onChange={handleOutput2Change}
              inputProps={{ min: 0, max: 255 }}
            />
          </Box>
          
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={preview}
                onChange={(e) => setPreview(e.target.checked)}
              />
            }
            label="Предпросмотр"
            sx={{ mt: 1 }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button size="small" onClick={handleReset}>Сбросить</Button>
        <Button size="small" onClick={onClose}>Отмена</Button>
        <Button 
          size="small" 
          onClick={handleApply} 
          variant="contained"
          disabled={!activeLayer}
        >
          Применить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Компонент гистограммы
const HistogramChart = ({ 
  histogram, 
  input1, 
  output1, 
  input2, 
  output2, 
  activeChannel 
}) => {
  // Добавляем key для принудительной перерисовки
  const chartKey = `${input1}-${output1}-${input2}-${output2}-${activeChannel}`;

  const width = 360;
  const height = 360;
  const margin = 30;
  
  // Масштабирование значений
  const scaleY = (value) => height - margin - (value / 255) * (height - 2 * margin);
  const scaleX = (value) => margin + (value / 255) * (width - 2 * margin);

  // Нормализация гистограммы для отображения
  const normalizeHistogram = (values) => {
    const max = Math.max(...values, 1);
    return values.map(v => (v / max) * 255 * 0.7); // Уменьшаем высоту для видимости
  };

  // Создание пути для гистограммы
  const createHistogramPath = (values) => {
    const normalized = normalizeHistogram(values);
    let path = '';
    for (let i = 0; i < normalized.length; i++) {
      const x = scaleX(i);
      const y = scaleY(normalized[i]);
      if (i === 0) path += `M ${x} ${y} `;
      else path += `L ${x} ${y} `;
    }
    return path;
  };

  // Пути для разных каналов
  const redPath = createHistogramPath(histogram.red);
  const greenPath = createHistogramPath(histogram.green);
  const bluePath = createHistogramPath(histogram.blue);
  const alphaPath = createHistogramPath(histogram.alpha);

  // Линия коррекции
  const correctionLine = `M ${scaleX(0)} ${scaleY(output1)} 
                         L ${scaleX(input1)} ${scaleY(output1)} 
                         L ${scaleX(input2)} ${scaleY(output2)} 
                         L ${scaleX(255)} ${scaleY(output2)}`;

  // Сетка
  const gridLines = [];
  for (let i = 0; i <= 255; i += 25) {
    gridLines.push(
      <line
        key={`h${i}`}
        x1={scaleX(0)}
        y1={scaleY(i)}
        x2={scaleX(255)}
        y2={scaleY(i)}
        stroke="#eee"
        strokeWidth="0.5"
      />
    );
    gridLines.push(
      <line
        key={`v${i}`}
        x1={scaleX(i)}
        y1={scaleY(0)}
        x2={scaleX(i)}
        y2={scaleY(255)}
        stroke="#eee"
        strokeWidth="0.5"
      />
    );
  }

  // Определяем какие каналы отображать
  const showRed = activeChannel === 'rgb' || activeChannel === 'red';
  const showGreen = activeChannel === 'rgb' || activeChannel === 'green';
  const showBlue = activeChannel === 'rgb' || activeChannel === 'blue';
  const showAlpha = activeChannel === 'alpha';

  return (
    <svg 
      key={chartKey}
      width="100%" 
      height="100%" 
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ backgroundColor: '#fff' }}
    >
      {/* Сетка */}
      {gridLines}

      {/* Оси */}
      <line x1={margin} y1={height - margin} x2={width - margin} y2={height - margin} stroke="#333" strokeWidth="1" />
      <line x1={margin} y1={margin} x2={margin} y2={height - margin} stroke="#333" strokeWidth="1" />

      {/* Подписи осей */}
      <text x={width / 2} y={height - 10} textAnchor="middle" fontSize="10">Input (0-255)</text>
      <text x={10} y={height / 2} textAnchor="middle" fontSize="10" transform={`rotate(-90, 10, ${height / 2})`}>Output (0-255)</text>

      {/* Гистограммы */}
      {showAlpha && (
        <path 
          d={alphaPath} 
          fill="none" 
          stroke="rgba(128, 128, 128, 0.8)" 
          strokeWidth="1.5" 
        />
      )}
      {showBlue && (
        <path 
          d={bluePath} 
          fill="none" 
          stroke="rgba(0, 0, 255, 0.8)" 
          strokeWidth="1.5" 
        />
      )}
      {showGreen && (
        <path 
          d={greenPath} 
          fill="none" 
          stroke="rgba(0, 255, 0, 0.8)" 
          strokeWidth="1.5" 
        />
      )}
      {showRed && (
        <path 
          d={redPath} 
          fill="none" 
          stroke="rgba(255, 0, 0, 0.8)" 
          strokeWidth="1.5" 
        />
      )}

      {/* Линия коррекции */}
      <path 
        d={correctionLine} 
        stroke="#000" 
        strokeWidth="2" 
        fill="none" 
      />

      {/* Точки коррекции */}
      <circle 
        cx={scaleX(input1)} 
        cy={scaleY(output1)} 
        r="5" 
        fill="#fff" 
        stroke="#000" 
        strokeWidth="1.5" 
      />
      <circle 
        cx={scaleX(input2)} 
        cy={scaleY(output2)} 
        r="5" 
        fill="#fff" 
        stroke="#000" 
        strokeWidth="1.5" 
      />

      {/* Вспомогательные линии от точек */}
      <line 
        x1={scaleX(0)} 
        y1={scaleY(output1)} 
        x2={scaleX(input1)} 
        y2={scaleY(output1)} 
        stroke="#000" 
        strokeWidth="1" 
        strokeDasharray="3,2" 
      />
      <line 
        x1={scaleX(input1)} 
        y1={scaleY(output1)} 
        x2={scaleX(input1)} 
        y2={scaleY(0)} 
        stroke="#000" 
        strokeWidth="1" 
        strokeDasharray="3,2" 
      />
      <line 
        x1={scaleX(input2)} 
        y1={scaleY(output2)} 
        x2={scaleX(255)} 
        y2={scaleY(output2)} 
        stroke="#000" 
        strokeWidth="1" 
        strokeDasharray="3,2" 
      />
      <line 
        x1={scaleX(input2)} 
        y1={scaleY(output2)} 
        x2={scaleX(input2)} 
        y2={scaleY(0)} 
        stroke="#000" 
        strokeWidth="1" 
        strokeDasharray="3,2" 
      />
    </svg>
  );
};

export default GradationCorrectionDialog;