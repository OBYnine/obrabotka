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
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
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

  return (
    <Paper sx={{ 
      width: 300,
      p: 2,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 1
    }}>
      <Typography variant="h6">Слои</Typography>
      
      <Button 
        variant="contained" 
        onClick={handleAddLayer}
        disabled={layers.length >= 2}
      >
        Добавить слой
      </Button>

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
                backgroundImage: layer.image ? `url(${layer.thumbnail})` : null,
                backgroundSize: 'cover',
                border: '1px solid #ccc'
              }}/>

              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2">
                  {layer.name}
                </Typography>

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
                  onChange={(e, val) => changeOpacity(layer.id, val)}
                  min={0}
                  max={1}
                  step={0.1}
                  size="small"
                  sx={{ mt: 1 }}
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