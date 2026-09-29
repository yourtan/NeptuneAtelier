/**
 * Builds a coherent-but-random theme from the same building blocks the
 * rest of the engine already uses (palettes, gradients, shaders, fonts).
 */

import {
  createEffectLayer,
  DEFAULT_APPEARANCE_CONFIG,
  DEFAULT_BACKGROUND_CONFIG,
  DEFAULT_LAYOUT_CONFIG,
  DEFAULT_PARTICLES,
  DEFAULT_SHADER,
  DEFAULT_THEME_CONFIG,
  GRADIENT_PRESETS,
  SHADER_PRESETS,
  CODE_FONT_OPTIONS,
  UI_FONT_OPTIONS
} from './defaults';
import {
  generatePalette,
  PaletteHarmony,
  PaletteMode
} from './palette-generator';
import {
  IAppearanceConfig,
  IBackgroundConfig,
  IEffectLayer,
  ILayoutConfig,
  IThemeConfig,
  ParticleShape
} from './types';

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** A full, ready-to-apply random theme (colors, background, an effect
 * layer roughly half the time, shape, and fonts). */
export function randomizeTheme(): IThemeConfig {
  const mode: PaletteMode = Math.random() < 0.65 ? 'dark' : 'light';
  const hue = Math.floor(Math.random() * 360);
  const accent = `hsl(${hue}, 70%, 55%)`;
  const harmony = pick<PaletteHarmony>([
    'complementary',
    'triadic',
    'analogous'
  ]);
  const colors = generatePalette(accent, mode, harmony);

  const useGradient = Math.random() < 0.5;
  const background: IBackgroundConfig = {
    ...DEFAULT_BACKGROUND_CONFIG,
    type: useGradient ? 'gradient' : 'color',
    color: mode === 'dark' ? `hsl(${hue}, 25%, 10%)` : `hsl(${hue}, 35%, 95%)`,
    gradient: useGradient
      ? pick(GRADIENT_PRESETS).gradient
      : DEFAULT_BACKGROUND_CONFIG.gradient,
    chromeOpacity: 0.2 + Math.random() * 0.5
  };

  const effects: IEffectLayer[] = [];
  if (Math.random() < 0.6) {
    if (Math.random() < 0.5) {
      effects.push({
        ...createEffectLayer('shader', 'background'),
        shader: {
          ...DEFAULT_SHADER,
          preset: pick(SHADER_PRESETS).value,
          color1: background.color,
          color2: accent,
          color3: colors['--jp-accent-color1'] ?? accent
        }
      });
    } else {
      effects.push({
        ...createEffectLayer('particles', 'background'),
        particles: {
          ...DEFAULT_PARTICLES,
          color: accent,
          shape: pick<ParticleShape>(['circle', 'square', 'triangle', 'star']),
          twinkle: Math.random() < 0.5
        }
      });
    }
  }

  const appearance: IAppearanceConfig = {
    ...DEFAULT_APPEARANCE_CONFIG,
    baseTheme: mode,
    radius: pick([0, 2, 6, 12, 20]),
    floatingPanels: Math.random() < 0.4,
    glass: Math.random() < 0.4,
    glow: Math.random() < 0.3,
    uiFont: pick(UI_FONT_OPTIONS).label,
    codeFont: pick(CODE_FONT_OPTIONS).label,
    animations: true
  };

  const layout: ILayoutConfig = {
    ...DEFAULT_LAYOUT_CONFIG,
    tabStyle: pick(['default', 'pill', 'underline', 'minimal'] as const),
    cellStyle: pick(['default', 'card', 'borderless', 'accent'] as const)
  };

  return {
    ...DEFAULT_THEME_CONFIG,
    colors,
    background,
    appearance,
    layout,
    effects,
    events: []
  };
}
