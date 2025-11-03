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
  Tooltip,
  useTheme,
  useMediaQuery
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

export const LayersPanel = ({ 
  layers, 
  activeLayerId,
  setLayers,
  setActiveLayerId,
  handleAddLayer,
  handleLayerFileUpload
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
      ).slice(0, 2)
    );
  };

  return (
    <Paper sx={{ 
      width: isMobile ? '100%' : 450,
      p: isMobile ? 1 : 2,
      height: isMobile ? 'auto' : '100%',
      maxHeight: isMobile ? '40vh' : '100%',
      display: 'flex',
      backgroundColor: '#454e52ff',
      flexDirection: 'column',
      gap: 1,
      position: isMobile ? 'fixed' : 'relative',
      bottom: isMobile ? 0 : 'auto',
      left: isMobile ? 0 : 'auto',
      right: isMobile ? 0 : 'auto',
      zIndex: isMobile ? 1100 : 'auto',
      borderRadius: isMobile ? '16px 16px 0 0' : '4px'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant={isMobile ? "subtitle1" : "h6"}>Слои</Typography>
        
        <Button 
          variant="contained" 
          onClick={handleAddLayer}
          disabled={layers.length >= 2}
          size={isMobile ? "small" : "medium"}
        >
          {isMobile ? `+ (${layers.length}/2)` : `Добавить слой (${layers.length}/2)`}
        </Button>
      </Box>

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
              p: isMobile ? 0.5 : 1,
              mb: 1,
              border: activeLayerId === layer.id ? '2px solid #1976d2' : '1px solid #ddd',
              cursor: 'pointer'
            }}
            onClick={() => setActiveLayerId(layer.id)}
          >
            {isMobile ? (
              // Мобильная версия - компактная
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Box sx={{
                    width: 40,
                    height: 40,
                    bgcolor: layer.color || 'transparent',
                    backgroundImage: layer.showAlpha && layer.alphaThumbnail
                      ? `url(${layer.alphaThumbnail})`
                      : layer.image ? `url(${layer.thumbnail})` : null,
                    backgroundSize: 'cover',
                    border: '1px solid #ccc',
                    flexShrink: 0
                  }}/>

                  <Typography variant="caption" sx={{ flexGrow: 1, fontSize: '0.75rem' }}>
                    {layer.name}
                  </Typography>

                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVisibility(layer.id);
                    }}
                  >
                    {layer.visible ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                  </IconButton>

                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(layer.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Box sx={{ px: 1 }}>
                  <Slider
                    value={layer.opacity}
                    onChange={(e, val) => changeLayerProperty(layer.id, 'opacity', val)}
                    min={0}
                    max={1}
                    step={0.1}
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'space-between', px: 0.5 }}>
                  <FormControl size="small" sx={{ minWidth: 100, flex: 1 }}>
                    <Select
                      value={layer.blendMode}
                      onChange={(e) => changeBlendMode(layer.id, e.target.value)}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      {Object.keys(blendModeTooltips).map(mode => (
                        <MenuItem key={mode} value={mode} sx={{ fontSize: '0.75rem' }}>
                          {mode}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeLayerProperty(layer.id, 'x', 0);
                      changeLayerProperty(layer.id, 'y', 0);
                    }}
                  >
                    <RestoreIcon fontSize="small" />
                  </IconButton>

                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(layer.id, 'up');
                    }}
                    disabled={layers.indexOf(layer) === 0}
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>

                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(layer.id, 'down');
                    }}
                    disabled={layers.indexOf(layer) === layers.length - 1}
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ) : (
              // Десктопная версия - полная
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

                            if (l.hasAlpha) {
                              if (l.imageWithoutAlpha) {
                                return {
                                  ...l,
                                  image: l.imageWithoutAlpha,
                                  hasAlpha: false,
                                  showAlpha: false
                                };
                              }
                              
                              const canvas = document.createElement('canvas');
                              canvas.width = l.image.width;
                              canvas.height = l.image.height;
                              const ctx = canvas.getContext('2d');
                              ctx.drawImage(l.image, 0, 0);

                              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                              const data = imgData.data;
                              for (let i = 0; i < data.length; i += 4) {
                                data[i + 3] = 255;
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

                          if (l.imageWithoutAlpha) {
                            return {
                              ...l,
                              image: l.imageWithoutAlpha,
                              hasAlpha: false,
                              alphaThumbnail: null,
                              showAlpha: false,
                              originalImage: l.imageWithoutAlpha,
                              imageWithoutAlpha: null
                            };
                          }

                          const canvas = document.createElement('canvas');
                          canvas.width = l.image.width;
                          canvas.height = l.image.height;
                          const ctx = canvas.getContext('2d');
                          ctx.drawImage(l.image, 0, 0);

                          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                          const data = imgData.data;
                          for (let i = 0; i < data.length; i += 4) {
                            data[i + 3] = 255;
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
            )}
          </Paper>
        ))}
      </Box>
    </Paper>
  );
};