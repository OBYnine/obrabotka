// setup.js
import '@testing-library/jest-dom';

HTMLCanvasElement.prototype.getContext = () => ({
  drawImage: () => {},
  getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
  putImageData: () => {},
  clearRect: () => {},
  fillRect: () => {},
  createImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
  toDataURL: () => 'data:image/png;base64,mocked' // <- Добавь сюда
});

HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,mocked'; // <- И сюда

global.Image = class {
  constructor() {
    this.onload = null;
  }
  set src(_) {
    // Когда присваивается src, вызываем onload позже
    setTimeout(() => {
      this.width = 100;
      this.height = 100;
      if (this.onload) this.onload();
    }, 0);
  }
};
