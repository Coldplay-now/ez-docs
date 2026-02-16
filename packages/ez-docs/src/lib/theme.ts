/**
 * 主题工具：hex 颜色 → OKLch CSS 变量注入。
 *
 * 纯数学实现，不引入额外依赖。
 * 转换链：hex → sRGB → linear RGB → OKLab → OKLch
 */

import type { ResolvedEzdocConfig } from "./config";

// ─── 颜色转换 ────────────────────────────────────────────────

/** 解析 hex 为 [r, g, b]，每个分量 0-1 */
function hexToSrgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  let r: number, g: number, b: number;

  if (h.length === 3 || h.length === 4) {
    r = parseInt(h[0] + h[0], 16) / 255;
    g = parseInt(h[1] + h[1], 16) / 255;
    b = parseInt(h[2] + h[2], 16) / 255;
  } else {
    r = parseInt(h.slice(0, 2), 16) / 255;
    g = parseInt(h.slice(2, 4), 16) / 255;
    b = parseInt(h.slice(4, 6), 16) / 255;
  }

  return [r, g, b];
}

/** sRGB 分量转 linear（逆 gamma 校正） */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** linear RGB → OKLab [L, a, b] */
function linearRgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l_ = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m_ = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s_ = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l = Math.cbrt(l_);
  const m = Math.cbrt(m_);
  const s = Math.cbrt(s_);

  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

/** OKLab → OKLch [L, C, H] */
function oklabToOklch(L: number, a: number, b: number): [number, number, number] {
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

/** hex 颜色字符串 → OKLch CSS 值字符串 */
export function hexToOklch(hex: string): string {
  const [r, g, b] = hexToSrgb(hex);
  const [lr, lg, lb] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  const [L, a, bVal] = linearRgbToOklab(lr, lg, lb);
  const [lch_L, lch_C, lch_H] = oklabToOklch(L, a, bVal);

  // 保留 3 位小数，与 globals.css 中的精度一致
  const lStr = lch_L.toFixed(3);
  const cStr = lch_C.toFixed(3);
  const hStr = lch_H.toFixed(1);

  return `oklch(${lStr} ${cStr} ${hStr})`;
}

/** 调整 OKLch 亮度 */
function adjustLightness(oklchStr: string, delta: number): string {
  const match = oklchStr.match(/oklch\(([.\d]+)\s+([.\d]+)\s+([.\d]+)\)/);
  if (!match) return oklchStr;

  const L = Math.min(1, Math.max(0, parseFloat(match[1]) + delta));
  return `oklch(${L.toFixed(3)} ${match[2]} ${match[3]})`;
}

// ─── 主题 CSS 生成 ────────────────────────────────────────────

/**
 * 根据配置生成主题 CSS 变量覆盖。
 * 返回可直接注入 <style> 标签的 CSS 字符串。
 */
export function generateThemeCSS(config: ResolvedEzdocConfig): string {
  const overrides: string[] = [];

  if (config.theme.primaryColor) {
    const oklch = hexToOklch(config.theme.primaryColor);

    // 浅色模式
    overrides.push(`:root { --primary: ${oklch}; --sidebar-primary: ${oklch}; --ring: ${oklch}; }`);

    // 深色模式：亮度 +0.1
    const darkOklch = adjustLightness(oklch, 0.1);
    overrides.push(`.dark { --primary: ${darkOklch}; --sidebar-primary: ${darkOklch}; --ring: ${darkOklch}; }`);
  }

  if (config.theme.accentColor) {
    const oklch = hexToOklch(config.theme.accentColor);
    overrides.push(`:root { --accent: ${oklch}; --sidebar-accent: ${oklch}; }`);

    const darkOklch = adjustLightness(oklch, -0.7);
    overrides.push(`.dark { --accent: ${darkOklch}; --sidebar-accent: ${darkOklch}; }`);
  }

  return overrides.join("\n");
}
