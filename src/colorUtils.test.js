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
  test('rgbToXyz converts white correctly', () => {
    const white = { r: 255, g: 255, b: 255 };
    const xyz = rgbToXyz(white);
    expect(xyz.x).toBeCloseTo(95.047, 1);
    expect(xyz.y).toBeCloseTo(100.0, 1);
    expect(xyz.z).toBeCloseTo(108.883, 1);
  });

  test('calculateContrastRatio calculates black-white contrast', () => {
    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 0, g: 0, b: 0 };
    const ratio = calculateContrastRatio(white, black);
    expect(ratio).toBeCloseTo(21.0, 1);
  });
});
