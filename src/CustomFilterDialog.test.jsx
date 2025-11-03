// CustomFilterDialog.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CustomFilterDialog from './CustomFilterDialog';
import { vi } from 'vitest';
import React from 'react';

const mockLayer = {
  id: 'layer1',
  image: {
    width: 100,
    height: 100
  }
};

const renderComponent = (props = {}) => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onApply: vi.fn(),
    activeLayer: mockLayer,
    activeLayerId: 'layer1',
    setLayers: vi.fn(),
    layers: [mockLayer],
    ...props
  };
  return render(<CustomFilterDialog {...defaultProps} />);
};

describe('CustomFilterDialog', () => {
  it('renders dialog with default preset', () => {
    renderComponent();
    expect(screen.getByText('Custom Filter')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // center of identity kernel
  });

  it('changes kernel when preset is selected', () => {
    renderComponent();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText(/Резкость/));
    expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // center of sharpen kernel
  });

  it('allows manual kernel cell value update', () => {
    renderComponent();
    const cell = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(cell, { target: { value: '42' } });
    expect(cell.value).toBe('42');
  });

  it('resets kernel to selected preset values', () => {
    renderComponent();
    const cell = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(cell, { target: { value: '42' } });
    fireEvent.click(screen.getAllByText(/Reset/i).find(btn => btn.tagName === 'BUTTON'));
    expect(cell.value).toBe('0'); // back to identity
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    renderComponent({ onClose });
    fireEvent.click(screen.getByText(/Cancel/i));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onApply when Apply is clicked', () => {
    const onApply = vi.fn();
    renderComponent({ onApply });
    fireEvent.click(screen.getByText(/Apply/i));
    expect(onApply).toHaveBeenCalled();
  });

  it('calls onApply when preview is enabled and kernel changes', async () => {
    const onApply = vi.fn();
    renderComponent({ onApply });

    // Обновим значение в матрице фильтра
    const cell = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(cell, { target: { value: '2' } });

    await waitFor(() => {
      expect(onApply).toHaveBeenCalled();
    });
  });

it('restores original image when preview is disabled', async () => {
  const setLayers = vi.fn();

  // "Мокаем" изображение
  const image = new Image();
  Object.defineProperty(image, 'width', { value: 100 });
  Object.defineProperty(image, 'height', { value: 100 });

  renderComponent({
    setLayers,
    layers: [{ id: 'layer1', image }],
  });

  // Ждём пока всё смонтируется
  await waitFor(() =>
    expect(screen.getByLabelText(/Enable Preview/i)).toBeInTheDocument()
  );

  // Вручную симулируем изменение kernel, чтобы originalImage был создан
  fireEvent.change(screen.getAllByRole('spinbutton')[0], {
    target: { value: '5' },
  });

  // Включить и затем выключить preview
  const checkbox = screen.getByLabelText(/Enable Preview/i);
  fireEvent.click(checkbox); // отключаем preview

  await waitFor(() => {
    expect(setLayers).toHaveBeenCalled();
  });
});


});
