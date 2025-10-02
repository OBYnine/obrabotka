// colorUtils.test.js
import {
  rgbToXyz,
  xyzToLab,
  rgbToLab,
  labToLch,
  rgbToOklch,
  calculateContrastRatio
} from './colorUtils';

describe('Color conversion utilities', () => {
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  const red = { r: 255, g: 0, b: 0 };
  const green = { r: 0, g: 255, b: 0 };
  const blue = { r: 0, g: 0, b: 255 };

  // Проверяем преобразование белого цвета из RGB в XYZ
  test('rgbToXyz converts white correctly', () => {
    const xyz = rgbToXyz(white);
    expect(xyz.x).toBeCloseTo(95.047, 2);
    expect(xyz.y).toBeCloseTo(100.0, 2);
    expect(xyz.z).toBeCloseTo(108.883, 2);
  });

  // Проверяем преобразование черного цвета из RGB в XYZ
  test('rgbToXyz converts black correctly', () => {
    const xyz = rgbToXyz(black);
    expect(xyz.x).toBeCloseTo(0, 2);
    expect(xyz.y).toBeCloseTo(0, 2);
    expect(xyz.z).toBeCloseTo(0, 2);
  });

  // Проверяем преобразование из XYZ в Lab на примере D65 белого
  test('xyzToLab converts D65 white correctly', () => {
    const xyz = { x: 95.047, y: 100.0, z: 108.883 };
    const lab = xyzToLab(xyz);
    expect(lab.l).toBeCloseTo(100, 2);
    expect(lab.a).toBeCloseTo(0, 2);
    expect(lab.b).toBeCloseTo(0, 2);
  });

  // Проверяем преобразование RGB в Lab для белого и черного
  test('rgbToLab converts white and black correctly', () => {
    const labWhite = rgbToLab(white);
    expect(labWhite.l).toBeCloseTo(100, 2);
    expect(labWhite.a).toBeCloseTo(0, 2);
    expect(labWhite.b).toBeCloseTo(0, 2);

    const labBlack = rgbToLab(black);
    expect(labBlack.l).toBeCloseTo(0, 2);
    expect(labBlack.a).toBeCloseTo(0, 2);
    expect(labBlack.b).toBeCloseTo(0, 2);
  });

  // Проверяем преобразование Lab в LCH
  test('labToLch converts Lab to LCH correctly', () => {
    // Белый цвет
    const lab = { l: 100, a: 0, b: 0 };
    const lch = labToLch(lab);
    expect(lch.l).toBeCloseTo(100, 2);
    expect(lch.c).toBeCloseTo(0, 2); // Хроматичность = 0
    expect(lch.h).toBeCloseTo(0, 2); // Оттенок = 0

    // Красный цвет
    const labRed = { l: 53.24, a: 80.09, b: 67.20 };
    const lchRed = labToLch(labRed);
    expect(lchRed.l).toBeCloseTo(53.24, 2);
    expect(lchRed.c).toBeCloseTo(Math.sqrt(80.09**2 + 67.20**2), 2); // Хроматичность = sqrt(a^2 + b^2)
    expect(lchRed.h).toBeCloseTo(Math.atan2(67.20, 80.09) * (180/Math.PI), 2); // Оттенок в градусах
  });

  // Проверяем преобразование RGB в OKLCH
  test('rgbToOklch converts white, black, red correctly', () => {
    const oklchWhite = rgbToOklch(white);
    expect(oklchWhite.l).toBeCloseTo(1 * 100, 2); // OKLab L ∈ [0,1], масштабируем на 100
    expect(oklchWhite.c).toBeCloseTo(0, 2); // Хроматичность = 0

    const oklchBlack = rgbToOklch(black);
    expect(oklchBlack.l).toBeCloseTo(0, 2);
    expect(oklchBlack.c).toBeCloseTo(0, 2);

    const oklchRed = rgbToOklch(red);
    // Проверяем, что красный имеет ненулевую яркость, хроматичность и оттенок
    expect(oklchRed.l).toBeGreaterThan(0);
    expect(oklchRed.c).toBeGreaterThan(0);
    expect(oklchRed.h).toBeGreaterThan(0);
  });

  // Проверяем расчет контраста белый-чёрный по WCAG 2.1
  test('calculateContrastRatio calculates black-white contrast', () => {
    const ratio = calculateContrastRatio(white, black);
    expect(ratio).toBeCloseTo(21.0, 1); // Максимальный контраст
  });

  // Проверяем, что одинаковый цвет имеет контраст 1
  test('calculateContrastRatio calculates same color contrast as 1', () => {
    const ratio = calculateContrastRatio(red, red);
    expect(ratio).toBeCloseTo(1.0, 2);
  });
});