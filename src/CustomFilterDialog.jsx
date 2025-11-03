// CustomFilterDialog.jsx

import React, { useState, useEffect } from 'react';
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Checkbox,
    FormControlLabel
} from '@mui/material';

const predefinedKernels = {
  identity: [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0]
  ],
  sharpen: [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0]
  ],
  gaussian: [
    [1 / 16, 2 / 16, 1 / 16],
    [2 / 16, 4 / 16, 2 / 16],
    [1 / 16, 2 / 16, 1 / 16]
  ],
  boxBlur: [
    [1 / 9, 1 / 9, 1 / 9],
    [1 / 9, 1 / 9, 1 / 9],
    [1 / 9, 1 / 9, 1 / 9]
  ],
    prewittX: [
    [-1, 0, 1],
    [-1, 0, 1],
    [-1, 0, 1]
    ],
    prewittY: [
    [-1, -1, -1],
    [0, 0, 0],
    [1, 1, 1]
    ]
};

export default function CustomFilterDialog({ open, onClose, onApply, activeLayer, activeLayerId, setLayers, layers }) {
    const [originalImage, setOriginalImage] = useState(null);
    const [previewEnabled, setPreviewEnabled] = useState(true);
    const [selectedPreset, setSelectedPreset] = useState('identity');
    

    const [kernelValues, setKernelValues] = useState([
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0]
    ]);

    const handleCellChange = (row, col, value) => {
        const newKernel = [...kernelValues];
        newKernel[row][col] = parseFloat(value) || 0;
        setKernelValues(newKernel);
    };

    const handlePresetChange = (e) => {
        const preset = e.target.value;
        setSelectedPreset(preset);

        if (preset === 'median' || preset === 'laplacian') {
            setKernelValues(null);
            if (previewEnabled) onApply(preset);
        } else {
            const kernel = predefinedKernels[preset];
            setKernelValues(kernel);
            if (previewEnabled) onApply(kernel);
        }
    };

    const resetToDefault = () => {
        setKernelValues(predefinedKernels[selectedPreset]);
    };
        
    const handleSubmit = () => {
        const valueToApply = selectedPreset === 'median' || selectedPreset === 'laplacian'
            ? selectedPreset
            : kernelValues;
        onApply(valueToApply);
    onClose();
    };

    const handleApply = () => {
        const valueToApply = selectedPreset === 'median' || selectedPreset === 'laplacian'
            ? selectedPreset
            : kernelValues;
        onApply(valueToApply);
    };

    useEffect(() => {
        if (!previewEnabled) return;
        if (selectedPreset === 'median' || selectedPreset === 'laplacian') {
            onApply(selectedPreset);
        } else {
            onApply(kernelValues);
        }
    }, [kernelValues, selectedPreset]);

    useEffect(() => {
    if (open && activeLayerId) {
        const layer = layers.find(l => l.id === activeLayerId);
        if (!layer || !layer.image) return;

        const img = new Image();
        const canvas = document.createElement('canvas');
        canvas.width = layer.image.width;
        canvas.height = layer.image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(layer.image, 0, 0);

        img.src = canvas.toDataURL();
        img.onload = () => setOriginalImage(img);
    }
    }, [open, activeLayerId]);;


    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            sx={{
  '& .MuiDialog-container': {
    justifyContent: 'flex-end', // ИЗМЕНЕНО: было flex-start
    alignItems: 'flex-start'
  },
  '& .MuiDialog-paper': {
    marginRight: '16px', // ИЗМЕНЕНО: было marginLeft
    marginTop: '64px',
    width: '360px',
    maxHeight: 'calc(100% - 80px)',
    overflowY: 'auto'
  }
}}
        >
            <DialogTitle>Custom Filter</DialogTitle>
            <DialogContent>
            <FormControl fullWidth margin="dense">
                <InputLabel>Preset</InputLabel>
                <Select value={selectedPreset} onChange={handlePresetChange}>
                <MenuItem value="identity">Тождественное отображение</MenuItem>
                <MenuItem value="sharpen">Резкость</MenuItem>
                <MenuItem value="gaussian">Фильтр Гаусса</MenuItem>
                <MenuItem value="boxBlur">Прямоугольное размытие</MenuItem>
                <MenuItem value="prewittX">Прюитт X</MenuItem>
                <MenuItem value="prewittY">Прюитт Y</MenuItem>
                <MenuItem value="median">Медианный фильтр</MenuItem>
                <MenuItem value="laplacian">Фильтр Лапласа</MenuItem>
                </Select>
            </FormControl>

            
                {kernelValues && (
                    <Box
                        sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 1,
                        mt: 1
                        }}
                    >
                        {kernelValues.map((row, r) =>
                        row.map((val, c) => (
                            <TextField
                            key={`${r}-${c}`}
                            type="number"
                            size="small"
                            value={val}
                            onChange={(e) => handleCellChange(r, c, e.target.value)}
                            inputProps={{ step: "0.01" }}
                            />
                        ))
                        )}
                    </Box>
                )}

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={previewEnabled}
                            onChange={(e) => {
                            const checked = e.target.checked;
                            setPreviewEnabled(checked);

                            if (checked) {
                                const value = selectedPreset === 'median' || selectedPreset === 'laplacian'
                                ? selectedPreset
                                : kernelValues;
                                onApply(value);
                            } else if (originalImage) {
                                setLayers(prev => prev.map(layer =>
                                layer.id === activeLayerId
                                    ? { ...layer, image: originalImage }
                                    : layer
                                ));
                            }
                            }}
                        />
                    }
                    label="Enable Preview"
                />

            </DialogContent>
            <DialogActions>
            <Button onClick={resetToDefault}>Reset</Button>
            <Button onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">Apply</Button>
            </DialogActions>
        </Dialog>
        );
}