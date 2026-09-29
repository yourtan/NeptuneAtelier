/**
 * Generates a complete, coordinated color override set from a single
 * accent color, or from an image's dominant color and brightness.
 */

import {
  hslToHex,
  parseColor,
  relativeLuminance,
  rgbToHsl,
  toHex
} from './color-values';
import { IColorOverrides } from './types';

export type PaletteMode = 'light' | 'dark';

/** How the secondary accent's hue relates to the primary accent's. */
export type PaletteHarmony = 'complementary' | 'triadic' | 'analogous';

const HARMONY_OFFSETS: Record<PaletteHarmony, number> = {
  complementary: 180,
  triadic: 120,
  analogous: 30
};

/** Hue offsets (degrees from the accent) for syntax token colors, chosen to
 * stay distinguishable from each other. */
const SYNTAX_HUES: Record<string, number> = {
  '--jp-mirror-editor-keyword-color': 40,
  '--jp-mirror-editor-string-color': 140,
  '--jp-mirror-editor-number-color': 200,
  '--jp-mirror-editor-def-color': 260,
  '--jp-mirror-editor-builtin-color': 90,
  '--jp-mirror-editor-operator-color': 320,
  '--jp-mirror-editor-property-color': 180,
  '--jp-mirror-editor-atom-color': 20,
  '--jp-mirror-editor-meta-color': 60,
  '--jp-mirror-editor-string-2-color': 155,
  '--jp-mirror-editor-variable-2-color': 220,
  '--jp-mirror-editor-variable-3-color': 100,
  '--jp-mirror-editor-qualifier-color': 70,
  '--jp-mirror-editor-tag-color': 340,
  '--jp-mirror-editor-attribute-color': 120
};

/**
 * Builds overrides for surfaces, text, borders, accents, editor, status, and
 * syntax colors, all tinted toward the accent's hue.
 * @param accent - any CSS color
 * @param mode - whether to build a light or dark palette
 * @param harmony - how the secondary accent's hue relates to the primary's;
 * defaults to complementary (opposite hue), the previous fixed behavior
 */
export function generatePalette(
  accent: string,
  mode: PaletteMode,
  harmony: PaletteHarmony = 'complementary'
): IColorOverrides {
  const parsed = parseColor(accent) ?? { r: 33, g: 150, b: 243, a: 1 };
  const { h, s } = rgbToHsl(parsed);
  const dark = mode === 'dark';
  // Keep the accent readable against the generated surfaces.
  const accentL = dark
    ? Math.max(55, rgbToHsl(parsed).l)
    : Math.min(48, rgbToHsl(parsed).l);
  const accentS = Math.max(45, s);
  const tint = (sat: number, light: number): string => hslToHex(h, sat, light);

  const palette: IColorOverrides = dark
    ? {
        '--jp-layout-color0': tint(14, 10),
        '--jp-layout-color1': tint(14, 13),
        '--jp-layout-color2': tint(14, 17),
        '--jp-layout-color3': tint(14, 7),
        '--jp-cell-editor-background': tint(14, 15),
        '--jp-ui-font-color0': tint(10, 97),
        '--jp-ui-font-color1': tint(10, 90),
        '--jp-ui-font-color2': tint(10, 72),
        '--jp-ui-font-color3': tint(10, 52),
        '--jp-content-font-color1': tint(10, 92),
        '--jp-content-link-color': hslToHex(h, accentS, 72),
        '--jp-border-color0': tint(12, 28),
        '--jp-border-color1': tint(12, 24),
        '--jp-border-color2': tint(12, 20),
        '--jp-editor-selected-background': hslToHex(h, 40, 26),
        '--jp-editor-selected-focused-background': hslToHex(h, 50, 32),
        '--jp-success-color1': hslToHex(140, 55, 55),
        '--jp-warn-color1': hslToHex(38, 90, 58),
        '--jp-error-color1': hslToHex(0, 75, 62),
        '--jp-info-color1': hslToHex(205, 75, 60),
        '--jp-mirror-editor-comment-color': tint(10, 50),
        '--jp-mirror-editor-variable-color': tint(10, 90),
        '--jp-mirror-editor-punctuation-color': tint(10, 72)
      }
    : {
        '--jp-layout-color0': tint(20, 99),
        '--jp-layout-color1': tint(18, 97),
        '--jp-layout-color2': tint(16, 93),
        '--jp-layout-color3': tint(14, 86),
        '--jp-cell-editor-background': tint(20, 96),
        '--jp-ui-font-color0': tint(12, 8),
        '--jp-ui-font-color1': tint(12, 16),
        '--jp-ui-font-color2': tint(12, 38),
        '--jp-ui-font-color3': tint(12, 58),
        '--jp-content-font-color1': tint(12, 14),
        '--jp-content-link-color': hslToHex(h, accentS, 40),
        '--jp-border-color0': tint(12, 70),
        '--jp-border-color1': tint(12, 80),
        '--jp-border-color2': tint(12, 88),
        '--jp-editor-selected-background': hslToHex(h, 70, 88),
        '--jp-editor-selected-focused-background': hslToHex(h, 70, 82),
        '--jp-success-color1': hslToHex(140, 60, 36),
        '--jp-warn-color1': hslToHex(35, 90, 42),
        '--jp-error-color1': hslToHex(0, 70, 45),
        '--jp-info-color1': hslToHex(205, 75, 42),
        '--jp-mirror-editor-comment-color': tint(10, 50),
        '--jp-mirror-editor-variable-color': tint(12, 16),
        '--jp-mirror-editor-punctuation-color': tint(12, 38)
      };

  palette['--jp-brand-color1'] = hslToHex(h, accentS, accentL);
  palette['--jp-brand-color0'] = hslToHex(h, accentS, accentL - 10);
  palette['--jp-brand-color2'] = hslToHex(
    h,
    accentS,
    dark ? accentL + 15 : accentL + 25
  );
  palette['--jp-accent-color1'] = hslToHex(
    h + HARMONY_OFFSETS[harmony],
    accentS,
    accentL
  );
  palette['--jp-editor-cursor-color'] = hslToHex(h, accentS, dark ? 70 : 40);
  palette['--jp-cell-editor-active-border-color'] = hslToHex(
    h,
    accentS,
    accentL
  );

  for (const [variable, offset] of Object.entries(SYNTAX_HUES)) {
    palette[variable] = hslToHex(h + offset, 65, dark ? 70 : 38);
  }
  // Tokens that should match other parts of the palette.
  palette['--jp-mirror-editor-header-color'] = palette['--jp-brand-color1'];
  palette['--jp-mirror-editor-link-color'] = palette['--jp-content-link-color'];
  palette['--jp-mirror-editor-quote-color'] =
    palette['--jp-mirror-editor-comment-color'];
  palette['--jp-mirror-editor-bracket-color'] =
    palette['--jp-mirror-editor-punctuation-color'];
  palette['--jp-mirror-editor-hr-color'] = palette['--jp-border-color1'];
  palette['--jp-mirror-editor-error-color'] = palette['--jp-error-color1'];
  return palette;
}

export interface IImageSeed {
  accent: string;
  mode: PaletteMode;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('neptuneatelier: image could not be decoded'));
    image.src = dataUrl;
  });
}

/**
 * Samples an image down to 64×64 and picks its dominant saturated hue as
 * the accent, and light or dark mode from its average brightness.
 * @param dataUrl - the image, as a data URL
 */
export async function extractImageSeed(dataUrl: string): Promise<IImageSeed> {
  const image = await loadImage(dataUrl);
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('neptuneatelier: canvas is unavailable');
  }
  ctx.drawImage(image, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size).data;

  const buckets = Array.from({ length: 12 }, () => ({
    weight: 0,
    r: 0,
    g: 0,
    b: 0
  }));
  let luminanceTotal = 0;
  const count = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) {
    const color = { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2], a: 1 };
    luminanceTotal += relativeLuminance(color);
    const { h, s, l } = rgbToHsl(color);
    if (s < 20 || l < 15 || l > 85) {
      continue;
    }
    const bucket = buckets[Math.floor(h / 30) % 12];
    const weight = s / 100;
    bucket.weight += weight;
    bucket.r += color.r * weight;
    bucket.g += color.g * weight;
    bucket.b += color.b * weight;
  }

  const best = buckets.reduce((a, b) => (b.weight > a.weight ? b : a));
  const accent =
    best.weight > 0
      ? toHex({
          r: best.r / best.weight,
          g: best.g / best.weight,
          b: best.b / best.weight,
          a: 1
        })
      : '#6c8cff';
  return { accent, mode: luminanceTotal / count < 0.4 ? 'dark' : 'light' };
}
