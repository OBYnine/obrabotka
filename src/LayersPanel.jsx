// LayersPanel.jsx

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Opacity as OpacityIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Restore as RestoreIcon
} from '@mui/icons-material';

const blendModeTooltips = {
  normal: 'Обычный режим: заменяет цвет нижележащих пикселей',
  multiply: 'Умножение: затемняет цвета, перемножая значения',
  screen: 'Экран: осветляет цвета, используя инвертированные значения',
  overlay: 'Наложение: комбинация Multiply и Screen для контраста'
};

const blendModeOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' }
];

export const LayersPanel = ({ 
  layers, 
  activeLayerId,
  setLayers,
  setActiveLayerId,
  handleAddLayer,
  handleLayerFileUpload
}) => {
  const handleDelete = (id) => {
    setLayers(layers.filter(layer => layer.id !== id));
    if (activeLayerId === id) setActiveLayerId(null);
  };

  const toggleVisibility = (id) => {
    setLayers(layers.map(layer => 
      layer.id === id ? {...layer, visible: !layer.visible} : layer
    ));
  };

  const changeOpacity = (id, value) => {
    setLayers(layers.map(layer => 
      layer.id === id ? {...layer, opacity: value} : layer
    ));
  };

  const changeBlendMode = (id, mode) => {
    setLayers(layers.map(layer => 
      layer.id === id ? {...layer, blendMode: mode} : layer
    ));
  };

  const moveLayer = (id, direction) => {
    const index = layers.findIndex(l => l.id === id);
    const newLayers = [...layers];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (swapIndex >= 0 && swapIndex < layers.length) {
      [newLayers[index], newLayers[swapIndex]] = [newLayers[swapIndex], newLayers[index]];
      setLayers(newLayers);
    }
  };

  const changeLayerProperty = (id, prop, value) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === id ? { ...layer, [prop]: value } : layer
      ).slice(0, 2) // Всегда обрезаем до 2 слоев
    );
  };

  return (
      <Paper sx={{ 
        width: 450,
        p: 2,
        height: '100%',
        display: 'flex',
        backgroundColor: '#26434eff',
        flexDirection: 'column',
        gap: 1
      }}>
        <Typography variant="h6">Слои</Typography>
        
        <Button 
          variant="contained" 
          onClick={handleAddLayer}
          disabled={layers.length >= 2}
          sx={{ mb: 2 }}
        >
          Добавить слой ({layers.length}/{2})
        </Button>

        <input
          type="file"
          id="layer-upload-input"
          style={{ display: 'none' }}
          accept="image/png, image/jpeg, .gb7, application/gb7"
          onChange={handleLayerFileUpload}
        />


        <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
          {layers.map(layer => (
            <Paper 
              key={layer.id}
              sx={{ 
                p: 1,
                mb: 1,
                border: activeLayerId === layer.id ? '2px solid #1976d2' : '1px solid #ddd',
                cursor: 'pointer'
              }}
              onClick={() => setActiveLayerId(layer.id)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{
                    width: 50,
                    height: 50,
                    bgcolor: layer.color || 'transparent',
                    backgroundImage: layer.showAlpha && layer.alphaThumbnail
                      ? `url(${layer.alphaThumbnail})`
                      : layer.image ? `url(${layer.thumbnail})` : null,
                    backgroundSize: 'cover',
                    border: '1px solid #ccc'
                  }}/>

                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2">
                    {layer.name}
                  </Typography>

                  <IconButton 
                    onClick={(e) => {
                      e.stopPropagation();
                      changeLayerProperty(layer.id, 'x', 0);
                      changeLayerProperty(layer.id, 'y', 0);
                    }}
                    title="Сбросить позицию"
                  >
                    <RestoreIcon fontSize="small" />
                  </IconButton>

                  <FormControl fullWidth size="small">
                    <InputLabel>Режим</InputLabel>
                    <Select
                      value={layer.blendMode}
                      label="Режим"
                      onChange={(e) => changeBlendMode(layer.id, e.target.value)}
                    >
                      {Object.keys(blendModeTooltips).map(mode => (
                        <MenuItem key={mode} value={mode}>
                          <Tooltip title={blendModeTooltips[mode]} arrow>
                            <span>{mode}</span>
                          </Tooltip>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Slider
                    value={layer.opacity}
                    onChange={(e, val) => changeLayerProperty(layer.id, 'opacity', val)}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  {/* <Select
                    value={layer.blendMode}
                    label="Режим"
                    onChange={(e) => changeBlendMode(layer.id, e.target.value)}
                  >
                    {blendModeOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        <Tooltip title={blendModeTooltips[option.value]} arrow>
                          <span>{option.label}</span>
                        </Tooltip>
                      </MenuItem>
                    ))}
                  </Select> */}
                </Box>

                <IconButton onClick={(e) => {
                  e.stopPropagation();
                  toggleVisibility(layer.id);
                }}>
                  {layer.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                </IconButton>

                <IconButton 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(layer.id);
                  }}
                >
                  <DeleteIcon />
                </IconButton>

                <Tooltip title={
                  layer.hasAlpha 
                    ? "Скрыть альфа-канал" 
                    : (layer.originalImage && layer.originalImage !== layer.image)
                      ? "Восстановить альфа-канал"
                      : "Альфа-канал был удалён"
                }>
                  <span>
                    <IconButton
                      disabled={!layer.hasAlpha && (!layer.originalImage || layer.originalImage === layer.image)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLayers(prev =>
                          prev.map(l => {
                            if (l.id !== layer.id) return l;

                            // Скрыть альфа-канал
                            if (l.hasAlpha) {
                              // Если есть imageWithoutAlpha (из GB7), используем его!
                              if (l.imageWithoutAlpha) {
                                return {
                                  ...l,
                                  image: l.imageWithoutAlpha,
                                  hasAlpha: false,
                                  showAlpha: false
                                };
                              }
                              
                              // Иначе создаём через canvas (для обычных изображений)
                              const canvas = document.createElement('canvas');
                              canvas.width = l.image.width;
                              canvas.height = l.image.height;
                              const ctx = canvas.getContext('2d');
                              ctx.drawImage(l.image, 0, 0);

                              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                              const data = imgData.data;
                              for (let i = 0; i < data.length; i += 4) {
                                data[i + 3] = 255; // полностью непрозрачный
                              }
                              ctx.putImageData(imgData, 0, 0);

                              const newImg = new Image();
                              newImg.src = canvas.toDataURL();

                              return {
                                ...l,
                                image: newImg,
                                hasAlpha: false,
                                showAlpha: false
                              };
                            } 
                            // Восстановить альфа-канал (только если можно)
                            else if (l.originalImage && l.originalImage !== l.image) {
                              return {
                                ...l,
                                image: l.originalImage,
                                hasAlpha: true,
                                showAlpha: false
                              };
                            }
                            return l;
                          })
                        );
                      }}
                    >
                      <OpacityIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>


                {layer.hasAlpha && (
                  <Tooltip title="Удалить альфа-канал навсегда">
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setLayers(prev => prev.map(l => {
                          if (l.id !== layer.id) return l;

                          // Используем imageWithoutAlpha если есть (из GB7)
                          if (l.imageWithoutAlpha) {
                            return {
                              ...l,
                              image: l.imageWithoutAlpha,
                              hasAlpha: false,
                              alphaThumbnail: null,
                              showAlpha: false,
                              // ВАЖНО: удаляем originalImage и imageWithoutAlpha,
                              // чтобы нельзя было восстановить альфа-канал
                              originalImage: l.imageWithoutAlpha,
                              imageWithoutAlpha: null
                            };
                          }

                          // Для обычных изображений создаём через canvas
                          const canvas = document.createElement('canvas');
                          canvas.width = l.image.width;
                          canvas.height = l.image.height;
                          const ctx = canvas.getContext('2d');
                          ctx.drawImage(l.image, 0, 0);

                          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                          const data = imgData.data;
                          for (let i = 0; i < data.length; i += 4) {
                            data[i + 3] = 255; // полная непрозрачность
                          }
                          ctx.putImageData(imgData, 0, 0);

                          const newImage = new Image();
                          newImage.src = canvas.toDataURL();

                          return {
                            ...l,
                            image: newImage,
                            hasAlpha: false,
                            alphaThumbnail: null,
                            showAlpha: false,
                            // Удаляем originalImage чтобы нельзя было восстановить
                            originalImage: newImage,
                            imageWithoutAlpha: null
                          };
                        }));
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}


                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(layer.id, 'up');
                    }}
                    disabled={layers.indexOf(layer) === 0}
                  >
                    <ArrowUpwardIcon />
                  </IconButton>
                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(layer.id, 'down');
                    }}
                    disabled={layers.indexOf(layer) === layers.length - 1}
                  >
                    <ArrowDownwardIcon />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      </Paper>
    );
  };