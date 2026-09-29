/**
 * Parsing, conversion, and contrast math for CSS color values.
 */

export interface IRgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const HEX_PATTERN = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/;
const RGB_PATTERN = /^rgba?\(\s*([^)]+)\)$/;

let probeContext: CanvasRenderingContext2D | null | undefined;

function canvasContext(): CanvasRenderingContext2D | null {
  if (probeContext === undefined) {
    try {
      probeContext = document.createElement('canvas').getContext('2d');
    } catch {
      probeContext = null;
    }
  }
  return probeContext;
}

function parseHex(hex: string): IRgba {
  let digits = hex.slice(1);
  if (digits.length <= 4) {
    digits = digits
      .split('')
      .map(ch => ch + ch)
      .join('');
  }
  const channel = (index: number): number =>
    parseInt(digits.slice(index * 2, index * 2 + 2), 16);
  return {
    r: channel(0),
    g: channel(1),
    b: channel(2),
    a: digits.length === 8 ? channel(3) / 255 : 1
  };
}

function parseRgb(body: string): IRgba | null {
  const parts = body
    .replace('/', ' ')
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length < 3) {
    return null;
  }
  const channel = (part: string): number =>
    part.endsWith('%') ? (parseFloat(part) / 100) * 255 : parseFloat(part);
  const alpha =
    parts.length > 3
      ? parts[3].endsWith('%')
        ? parseFloat(parts[3]) / 100
        : parseFloat(parts[3])
      : 1;
  const rgba = {
    r: channel(parts[0]),
    g: channel(parts[1]),
    b: channel(parts[2]),
    a: alpha
  };
  return Object.values(rgba).every(Number.isFinite) ? rgba : null;
}

/**
 * Parses any CSS color the browser understands into RGBA. Hex, `rgb()`,
 * and a few keywords are parsed directly; anything else (named colors,
 * `hsl()`, ...) is normalized through a canvas context when one exists.
 */
export function parseColor(value: string): IRgba | null {
  const text = value.trim().toLowerCase();
  if (HEX_PATTERN.test(text)) {
    return parseHex(text);
  }
  const rgb = RGB_PATTERN.exec(text);
  if (rgb) {
    return parseRgb(rgb[1]);
  }
  if (text === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  if (text === 'white') {
    return { r: 255, g: 255, b: 255, a: 1 };
  }
  if (text === 'black') {
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  if (!text) {
    return null;
  }
  const ctx = canvasContext();
  if (!ctx) {
    return null;
  }
  // A sentinel detects values the canvas rejects (it keeps the old value).
  ctx.fillStyle = '#010203';
  ctx.fillStyle = text;
  const normalized = String(ctx.fillStyle).toLowerCase();
  if (normalized === '#010203') {
    return null;
  }
  if (HEX_PATTERN.test(normalized)) {
    return parseHex(normalized);
  }
  const normalizedRgb = RGB_PATTERN.exec(normalized);
  return normalizedRgb ? parseRgb(normalizedRgb[1]) : null;
}

function toByteHex(value: number): string {
  return Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, '0');
}

/** Formats as `#rrggbb`, dropping alpha. */
export function toHex(color: IRgba): string {
  return `#${toByteHex(color.r)}${toByteHex(color.g)}${toByteHex(color.b)}`;
}

/** Converts any CSS color to `#rrggbb`, or returns the fallback. */
export function cssColorToHex(value: string, fallback = '#000000'): string {
  const parsed = parseColor(value);
  return parsed ? toHex(parsed) : fallback;
}

export interface IHsl {
  /** Hue, 0–360. */
  h: number;
  /** Saturation, 0–100. */
  s: number;
  /** Lightness, 0–100. */
  l: number;
}

export function rgbToHsl(color: IRgba): IHsl {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  return { h: h * 60, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = (((h % 360) + 360) % 360) / 360;
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const light = Math.min(100, Math.max(0, l)) / 100;
  if (sat === 0) {
    const grey = light * 255;
    return toHex({ r: grey, g: grey, b: grey, a: 1 });
  }
  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  const channel = (t: number): number => {
    let x = t;
    if (x < 0) {
      x += 1;
    }
    if (x > 1) {
      x -= 1;
    }
    if (x < 1 / 6) {
      return p + (q - p) * 6 * x;
    }
    if (x < 1 / 2) {
      return q;
    }
    if (x < 2 / 3) {
      return p + (q - p) * (2 / 3 - x) * 6;
    }
    return p;
  };
  return toHex({
    r: channel(hue + 1 / 3) * 255,
    g: channel(hue) * 255,
    b: channel(hue - 1 / 3) * 255,
    a: 1
  });
}

/** Linear interpolation between two colors, `t` in 0–1. */
export function mixColors(from: string, to: string, t: number): string {
  const a = parseColor(from) ?? { r: 0, g: 0, b: 0, a: 1 };
  const b = parseColor(to) ?? { r: 0, g: 0, b: 0, a: 1 };
  return toHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: 1
  });
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(color: IRgba): number {
  const linear = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * linear(color.r) +
    0.7152 * linear(color.g) +
    0.0722 * linear(color.b)
  );
}

/** WCAG contrast ratio between two colors, 1 to 21, or null if either
 * can't be parsed. */
export function contrastRatio(a: string, b: string): number | null {
  const first = parseColor(a);
  const second = parseColor(b);
  if (!first || !second) {
    return null;
  }
  const l1 = relativeLuminance(first);
  const l2 = relativeLuminance(second);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
