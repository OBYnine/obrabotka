// colorUtils.js

// Преобразование RGB в XYZ
export function rgbToXyz(color) {
  let r = color.r / 255;
  let g = color.g / 255;
  let b = color.b / 255;

  // Гамма-коррекция
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Преобразование в XYZ
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

  return { x: x * 100, y: y * 100, z: z * 100 };
}

// Преобразование XYZ в Lab
export function xyzToLab(xyz) {
  // Нормализация под источник света D65
  let x = xyz.x / 95.047;
  let y = xyz.y / 100.0;
  let z = xyz.z / 108.883;

  // Нелинейное преобразование
  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

  const l = (116 * y) - 16;
  const a = 500 * (x - y);
  const b = 200 * (y - z);

  return { l, a, b };
}

// Преобразование RGB в Lab (комбинация двух предыдущих)
export function rgbToLab(color) {
  const xyz = rgbToXyz(color);
  return xyzToLab(xyz);
}

// Преобразование Lab в LCH
export function labToLch(lab) {
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  const h = Math.atan2(lab.b, lab.a) * (180 / Math.PI);
  return { l: lab.l, c, h: h >= 0 ? h : h + 360 };
}

// Преобразование RGB в OKLCH (упрощенная версия)
export function rgbToOklch(color) {
  // Сначала преобразуем в линейный RGB
  let r = Math.pow(color.r / 255, 2.2);
  let g = Math.pow(color.g / 255, 2.2);
  let b = Math.pow(color.b / 255, 2.2);

  // Преобразование в LMS
  let l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  let m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  let s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  // Нелинейное преобразование
  l = Math.pow(l, 1/3);
  m = Math.pow(m, 1/3);
  s = Math.pow(s, 1/3);

  // Преобразование в OKLab
  const lab_l = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const lab_a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const lab_b = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

  // Преобразование в OKLCH
  const c = Math.sqrt(lab_a * lab_a + lab_b * lab_b);
  const h = Math.atan2(lab_b, lab_a) * (180 / Math.PI);

  return { l: lab_l * 100, c, h: h >= 0 ? h : h + 360 };
}

// Расчет контраста по WCAG 2.1
export function calculateContrastRatio(color1, color2) {
  const luminance1 = getRelativeLuminance(color1);
  const luminance2 = getRelativeLuminance(color2);
  
  const l1 = Math.max(luminance1, luminance2);
  const l2 = Math.min(luminance1, luminance2);
  
  return (l1 + 0.05) / (l2 + 0.05);
}

// Расчет относительной яркости
function getRelativeLuminance(color) {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  
  const r_srgb = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const g_srgb = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const b_srgb = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  return 0.2126 * r_srgb + 0.7152 * g_srgb + 0.0722 * b_srgb;
}
