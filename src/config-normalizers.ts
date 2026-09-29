/**
 * Turns arbitrary stored settings values into complete, valid configs.
 *
 * JupyterLab merges a plugin's user settings over its schema defaults only
 * at the top level, so a nested object saved by an older version (or edited
 * by hand) can be missing fields or hold the wrong types. Every read goes
 * through these functions, which fill each missing or invalid field from
 * its default rather than rejecting the whole object.
 */

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  createEffectLayer,
  createEventRule,
  DEFAULT_APPEARANCE_CONFIG,
  DEFAULT_BACKGROUND_CONFIG,
  DEFAULT_BRANDING_CONFIG,
  DEFAULT_GRADIENT,
  DEFAULT_LAYOUT_CONFIG,
  DEFAULT_PARTICLES,
  DEFAULT_QOL_CONFIG,
  DEFAULT_SHADER,
  LEGACY_COLOR_KEYS
} from './defaults';
import {
  EffectKind,
  IAppearanceConfig,
  IBackgroundConfig,
  IBrandingConfig,
  IColorOverrides,
  IEffectLayer,
  IEventRule,
  IGradientConfig,
  IGradientStop,
  ILayoutConfig,
  IParticlePreset,
  IParticlesConfig,
  IQolConfig,
  IShaderConfig,
  IThemeConfig,
  IThemePreset
} from './types';

type Source = Record<string, unknown>;

function isRecord(value: unknown): value is Source {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Source {
  return isRecord(value) ? value : {};
}

function num(
  src: Source,
  key: string,
  fallback: number,
  min: number,
  max: number
): number {
  const value = src[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function bool(src: Source, key: string, fallback: boolean): boolean {
  const value = src[key];
  return typeof value === 'boolean' ? value : fallback;
}

function str(src: Source, key: string, fallback: string): string {
  const value = src[key];
  return typeof value === 'string' ? value : fallback;
}

function isOneOf<T extends string>(
  value: unknown,
  options: readonly T[]
): value is T {
  return (
    typeof value === 'string' && (options as readonly string[]).includes(value)
  );
}

function oneOf<T extends string>(
  src: Source,
  key: string,
  options: readonly T[],
  fallback: T
): T {
  const value = src[key];
  return isOneOf(value, options) ? value : fallback;
}

export function normalizeQol(value: unknown): IQolConfig {
  const src = asRecord(value);
  const d = DEFAULT_QOL_CONFIG;
  return {
    autoClosingBrackets: bool(
      src,
      'autoClosingBrackets',
      d.autoClosingBrackets
    ),
    matchBrackets: bool(src, 'matchBrackets', d.matchBrackets),
    codeFolding: bool(src, 'codeFolding', d.codeFolding),
    highlightActiveLine: bool(
      src,
      'highlightActiveLine',
      d.highlightActiveLine
    ),
    lineNumbers: bool(src, 'lineNumbers', d.lineNumbers),
    lineWrap: bool(src, 'lineWrap', d.lineWrap),
    highlightWhitespace: bool(
      src,
      'highlightWhitespace',
      d.highlightWhitespace
    ),
    highlightTrailingWhitespace: bool(
      src,
      'highlightTrailingWhitespace',
      d.highlightTrailingWhitespace
    ),
    indentUnit: oneOf(
      src,
      'indentUnit',
      ['Tab', '1', '2', '4', '8'] as const,
      d.indentUnit
    ),
    cursorBlinkRate: num(src, 'cursorBlinkRate', d.cursorBlinkRate, 0, 5000)
  };
}

/**
 * Keeps only non-empty string overrides for `--jp-*` variables, migrating
 * the first release's named keys (e.g. `accentColor`) to their variables.
 */
export function normalizeColors(value: unknown): IColorOverrides {
  const result: IColorOverrides = {};
  for (const [key, color] of Object.entries(asRecord(value))) {
    if (typeof color !== 'string' || color.trim() === '') {
      continue;
    }
    const variable = LEGACY_COLOR_KEYS[key] ?? key;
    if (variable.startsWith('--jp-')) {
      result[variable] = color;
    }
  }
  return result;
}

function normalizeStops(value: unknown): IGradientStop[] {
  if (!Array.isArray(value)) {
    return DEFAULT_GRADIENT.stops;
  }
  const stops = value.filter(isRecord).map(stop => ({
    color: str(stop, 'color', '#000000'),
    position: num(stop, 'position', 0, 0, 100)
  }));
  return stops.length >= 2 ? stops : DEFAULT_GRADIENT.stops;
}

export function normalizeGradient(value: unknown): IGradientConfig {
  const src = asRecord(value);
  const d = DEFAULT_GRADIENT;
  return {
    kind: oneOf(src, 'kind', ['linear', 'radial', 'conic'] as const, d.kind),
    angle: num(src, 'angle', d.angle, 0, 360),
    stops: normalizeStops(src.stops),
    // The first release stored a boolean `animate`, which meant rotate.
    animation: oneOf(
      src,
      'animation',
      ['none', 'rotate', 'scroll'] as const,
      src.animate === true ? 'rotate' : d.animation
    ),
    speed: num(src, 'speed', d.speed, 0.1, 5),
    scrollSize: num(src, 'scrollSize', d.scrollSize, 200, 4000)
  };
}

export function normalizeParticles(value: unknown): IParticlesConfig {
  const src = asRecord(value);
  const d = DEFAULT_PARTICLES;
  return {
    count: num(src, 'count', d.count, 5, 300),
    color: str(src, 'color', d.color),
    size: num(src, 'size', d.size, 0.5, 8),
    speed: num(src, 'speed', d.speed, 0, 5),
    links: bool(src, 'links', d.links),
    linkDistance: num(src, 'linkDistance', d.linkDistance, 40, 300),
    mouse: bool(src, 'mouse', d.mouse),
    shape: oneOf(
      src,
      'shape',
      ['circle', 'square', 'triangle', 'star', 'char'] as const,
      d.shape
    ),
    twinkle: bool(src, 'twinkle', d.twinkle),
    gravity: num(src, 'gravity', d.gravity, -3, 3),
    spin: num(src, 'spin', d.spin, -3, 3),
    sizeVariation: num(src, 'sizeVariation', d.sizeVariation, 0, 1),
    opacity: num(src, 'opacity', d.opacity, 0, 1),
    glow: num(src, 'glow', d.glow, 0, 1),
    colorBlend: str(src, 'colorBlend', d.colorBlend),
    imageRef: str(src, 'imageRef', d.imageRef),
    trail: num(src, 'trail', d.trail, 0, 1),
    emitter: oneOf(
      src,
      'emitter',
      ['screen', 'cursor', 'edges', 'center'] as const,
      d.emitter
    )
  };
}

export function normalizeShader(value: unknown): IShaderConfig {
  const src = asRecord(value);
  const d = DEFAULT_SHADER;
  return {
    preset: oneOf(
      src,
      'preset',
      [
        'aurora',
        'plasma',
        'waves',
        'nebula',
        'starfield',
        'liquid',
        'rain',
        'grid',
        'embers'
      ] as const,
      d.preset
    ),
    color1: str(src, 'color1', d.color1),
    color2: str(src, 'color2', d.color2),
    color3: str(src, 'color3', d.color3),
    speed: num(src, 'speed', d.speed, 0, 5),
    intensity: num(src, 'intensity', d.intensity, 0, 2),
    resolution: num(src, 'resolution', d.resolution, 0.25, 1)
  };
}

/** Earlier versions stored animated effects as background types. */
function isLegacyEffectType(type: unknown): type is EffectKind {
  return type === 'particles' || type === 'shader';
}

export function normalizeBackground(value: unknown): IBackgroundConfig {
  const src = asRecord(value);
  const d = DEFAULT_BACKGROUND_CONFIG;
  return {
    // A legacy particle/shader background keeps its base color; the effect
    // itself moves to an effect layer (see legacyEffectLayers).
    type: isLegacyEffectType(src.type)
      ? 'color'
      : oneOf(
          src,
          'type',
          ['none', 'color', 'gradient', 'image'] as const,
          d.type
        ),
    color: str(src, 'color', d.color),
    gradient: normalizeGradient(src.gradient),
    imageRef: str(src, 'imageRef', d.imageRef),
    opacity: num(src, 'opacity', d.opacity, 0, 1),
    blur: num(src, 'blur', d.blur, 0, 40),
    chromeOpacity: num(src, 'chromeOpacity', d.chromeOpacity, 0, 1),
    contentOpacity: num(src, 'contentOpacity', d.contentOpacity, 0.5, 1),
    imageFit: oneOf(
      src,
      'imageFit',
      ['cover', 'contain', 'stretch', 'tile'] as const,
      d.imageFit
    ),
    imagePositionX: num(src, 'imagePositionX', d.imagePositionX, 0, 100),
    imagePositionY: num(src, 'imagePositionY', d.imagePositionY, 0, 100),
    imageZoom: num(src, 'imageZoom', d.imageZoom, 0.5, 3),
    noise: num(src, 'noise', d.noise, 0, 1),
    vignette: num(src, 'vignette', d.vignette, 0, 1)
  };
}

/** Id given to the layer migrated from a legacy effect background, so
 * repeated migration of the same data is idempotent. */
export const MIGRATED_LAYER_ID = 'migrated-background-effect';

/**
 * Effect layers equivalent to a first-release background whose type was
 * `particles` or `shader` (empty for anything else).
 */
export function legacyEffectLayers(background: unknown): IEffectLayer[] {
  const src = asRecord(background);
  if (!isLegacyEffectType(src.type)) {
    return [];
  }
  return [
    {
      ...createEffectLayer(src.type, 'background'),
      id: MIGRATED_LAYER_ID,
      maxFps: num(src, 'maxFps', 60, 15, 120),
      particles: normalizeParticles(src.particles),
      shader: normalizeShader(src.shader)
    }
  ];
}

export function normalizeEffectLayer(value: unknown): IEffectLayer | null {
  const src = asRecord(value);
  const kind = src.kind;
  if (!isLegacyEffectType(kind)) {
    return null;
  }
  const d = createEffectLayer(kind);
  const id = str(src, 'id', '');
  return {
    id: id || d.id,
    name: str(src, 'name', d.name),
    enabled: bool(src, 'enabled', d.enabled),
    kind,
    target: oneOf(
      src,
      'target',
      [
        'background',
        'all-windows',
        'notebooks',
        'terminals',
        'editors',
        'consoles',
        'file'
      ] as const,
      d.target
    ),
    path: str(src, 'path', d.path),
    placement: oneOf(
      src,
      'placement',
      ['overlay', 'behind'] as const,
      d.placement
    ),
    opacity: num(src, 'opacity', d.opacity, 0, 1),
    blend: oneOf(
      src,
      'blend',
      [
        'normal',
        'screen',
        'lighten',
        'overlay',
        'soft-light',
        'color-dodge',
        'multiply'
      ] as const,
      d.blend
    ),
    maxFps: num(src, 'maxFps', d.maxFps, 15, 120),
    particles: normalizeParticles(src.particles),
    shader: normalizeShader(src.shader)
  };
}

export function normalizeEffects(value: unknown): IEffectLayer[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const layers: IEffectLayer[] = [];
  for (const item of value) {
    const layer = normalizeEffectLayer(item);
    if (layer) {
      layers.push(layer);
    }
  }
  return layers;
}

export function normalizeEventRule(value: unknown): IEventRule | null {
  if (!isRecord(value)) {
    return null;
  }
  const src = value;
  const d = createEventRule();
  const id = str(src, 'id', '');
  return {
    id: id || d.id,
    name: str(src, 'name', d.name),
    enabled: bool(src, 'enabled', d.enabled),
    trigger: oneOf(
      src,
      'trigger',
      [
        'cell-success',
        'cell-error',
        'toolbar-button',
        'command',
        'save',
        'typing',
        'startup',
        'shortcut',
        'idle'
      ] as const,
      d.trigger
    ),
    command: str(src, 'command', d.command),
    shortcut: str(src, 'shortcut', d.shortcut),
    action: oneOf(
      src,
      'action',
      [
        'confetti',
        'fireworks',
        'sparkles',
        'shockwave',
        'flash',
        'shake',
        'glow',
        'typing-animation',
        'shader-pulse',
        'toggle-layer',
        'flash-layer'
      ] as const,
      d.action
    ),
    location: oneOf(
      src,
      'location',
      ['target', 'cursor', 'center'] as const,
      d.location
    ),
    color1: str(src, 'color1', d.color1),
    color2: str(src, 'color2', d.color2),
    color3: str(src, 'color3', d.color3),
    size: num(src, 'size', d.size, 0.25, 3),
    duration: num(src, 'duration', d.duration, 200, 10000),
    layerId: str(src, 'layerId', d.layerId),
    text: str(src, 'text', d.text),
    idleMinutes: num(src, 'idleMinutes', d.idleMinutes, 1, 120),
    secondaryTrigger: isOneOf(src.secondaryTrigger, [
      'cell-success',
      'cell-error',
      'toolbar-button',
      'command',
      'save',
      'typing',
      'startup',
      'shortcut',
      'idle'
    ] as const)
      ? src.secondaryTrigger
      : '',
    chainRuleId: str(src, 'chainRuleId', d.chainRuleId),
    chainDelay: num(src, 'chainDelay', d.chainDelay, 0, 10000),
    sound: oneOf(
      src,
      'sound',
      ['none', 'chime', 'pop', 'click', 'success', 'error'] as const,
      d.sound
    ),
    soundVolume: num(src, 'soundVolume', d.soundVolume, 0, 1)
  };
}

export function normalizeEvents(value: unknown): IEventRule[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const rules: IEventRule[] = [];
  for (const item of value) {
    const rule = normalizeEventRule(item);
    if (rule) {
      rules.push(rule);
    }
  }
  return rules;
}

export function normalizeAppearance(value: unknown): IAppearanceConfig {
  const src = asRecord(value);
  const d = DEFAULT_APPEARANCE_CONFIG;
  return {
    baseTheme: oneOf(
      src,
      'baseTheme',
      ['auto', 'light', 'dark'] as const,
      d.baseTheme
    ),
    radius: num(src, 'radius', d.radius, 0, 24),
    borderWidth: num(src, 'borderWidth', d.borderWidth, 0, 3),
    floatingPanels: bool(src, 'floatingPanels', d.floatingPanels),
    panelGap: num(src, 'panelGap', d.panelGap, 0, 24),
    shadow: num(src, 'shadow', d.shadow, 0, 3),
    glass: bool(src, 'glass', d.glass),
    glassBlur: num(src, 'glassBlur', d.glassBlur, 0, 40),
    glow: bool(src, 'glow', d.glow),
    glowIntensity: num(src, 'glowIntensity', d.glowIntensity, 0.1, 1),
    uiFont: str(src, 'uiFont', d.uiFont),
    codeFont: str(src, 'codeFont', d.codeFont),
    uiFontSize: num(src, 'uiFontSize', d.uiFontSize, 0, 24),
    codeFontSize: num(src, 'codeFontSize', d.codeFontSize, 0, 28),
    codeLineHeight: num(src, 'codeLineHeight', d.codeLineHeight, 0, 2.5),
    ligatures: bool(src, 'ligatures', d.ligatures),
    cursorStyle: oneOf(
      src,
      'cursorStyle',
      ['line', 'thick', 'block'] as const,
      d.cursorStyle
    ),
    animations: bool(src, 'animations', d.animations),
    borderStyle: oneOf(
      src,
      'borderStyle',
      ['solid', 'dashed', 'dotted', 'double'] as const,
      d.borderStyle
    ),
    shadowColor: str(src, 'shadowColor', d.shadowColor),
    acrylicNoise: bool(src, 'acrylicNoise', d.acrylicNoise),
    gradientHeadings: bool(src, 'gradientHeadings', d.gradientHeadings),
    cursorTrail: bool(src, 'cursorTrail', d.cursorTrail)
  };
}

export function normalizeBranding(value: unknown): IBrandingConfig {
  const src = asRecord(value);
  const d = DEFAULT_BRANDING_CONFIG;
  return {
    faviconRef: str(src, 'faviconRef', d.faviconRef),
    animatedFavicon: bool(src, 'animatedFavicon', d.animatedFavicon),
    splashEnabled: bool(src, 'splashEnabled', d.splashEnabled),
    splashText: str(src, 'splashText', d.splashText),
    splashColor: str(src, 'splashColor', d.splashColor)
  };
}

export function normalizeLayout(value: unknown): ILayoutConfig {
  const src = asRecord(value);
  const d = DEFAULT_LAYOUT_CONFIG;
  return {
    hideHeader: bool(src, 'hideHeader', d.hideHeader),
    hideStatusBar: bool(src, 'hideStatusBar', d.hideStatusBar),
    hideLeftActivityBar: bool(
      src,
      'hideLeftActivityBar',
      d.hideLeftActivityBar
    ),
    hideRightActivityBar: bool(
      src,
      'hideRightActivityBar',
      d.hideRightActivityBar
    ),
    density: oneOf(
      src,
      'density',
      ['compact', 'normal', 'comfortable'] as const,
      d.density
    ),
    tabStyle: oneOf(
      src,
      'tabStyle',
      ['default', 'pill', 'underline', 'minimal'] as const,
      d.tabStyle
    ),
    hidePrompts: bool(src, 'hidePrompts', d.hidePrompts),
    notebookMaxWidth: num(src, 'notebookMaxWidth', d.notebookMaxWidth, 0, 2400),
    cellStyle: oneOf(
      src,
      'cellStyle',
      ['default', 'card', 'borderless', 'accent'] as const,
      d.cellStyle
    ),
    scrollbarStyle: oneOf(
      src,
      'scrollbarStyle',
      ['default', 'thin', 'hidden'] as const,
      d.scrollbarStyle
    ),
    scrollbarColor: str(src, 'scrollbarColor', d.scrollbarColor)
  };
}

export function normalizeCustomCss(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function normalizeThemeConfig(value: unknown): IThemeConfig {
  const src = asRecord(value);
  return {
    qol: normalizeQol(src.qol),
    colors: normalizeColors(src.colors),
    background: normalizeBackground(src.background),
    appearance: normalizeAppearance(src.appearance),
    layout: normalizeLayout(src.layout),
    // Presets saved before effect layers existed have no `effects` key;
    // recreate their animated background as a layer.
    effects:
      src.effects === undefined
        ? legacyEffectLayers(src.background)
        : normalizeEffects(src.effects),
    events: normalizeEvents(src.events),
    customCss: normalizeCustomCss(src.customCss)
  };
}

/** Normalizes a stored or imported preset, or returns null if it has no
 * usable identity or config. */
export function normalizePreset(value: unknown): IThemePreset | null {
  if (!isRecord(value) || !isRecord(value.config)) {
    return null;
  }
  const name = str(value, 'name', '').trim();
  if (!name) {
    return null;
  }
  return {
    id: str(value, 'id', ''),
    name,
    createdAt: str(value, 'createdAt', new Date().toISOString()),
    config: normalizeThemeConfig(value.config)
  };
}

export function normalizePresets(value: unknown): IThemePreset[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const presets: IThemePreset[] = [];
  for (const item of value) {
    const preset = normalizePreset(item);
    if (preset && preset.id) {
      presets.push(preset);
    }
  }
  return presets;
}

/** Normalizes a saved particle preset, or returns null if it has no usable
 * identity. */
export function normalizeParticlePreset(
  value: unknown
): IParticlePreset | null {
  if (!isRecord(value)) {
    return null;
  }
  const name = str(value, 'name', '').trim();
  if (!name) {
    return null;
  }
  return {
    id: str(value, 'id', ''),
    name,
    createdAt: str(value, 'createdAt', new Date().toISOString()),
    particles: normalizeParticles(value.particles)
  };
}

export function normalizeParticlePresets(value: unknown): IParticlePreset[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const presets: IParticlePreset[] = [];
  for (const item of value) {
    const preset = normalizeParticlePreset(item);
    if (preset && preset.id) {
      presets.push(preset);
    }
  }
  return presets;
}

/** Reads the full, normalized theme configuration from live settings. */
export function readThemeConfig(
  settings: ISettingRegistry.ISettings
): IThemeConfig {
  return {
    qol: normalizeQol(settings.get('qol').composite),
    colors: normalizeColors(settings.get('colors').composite),
    background: normalizeBackground(settings.get('background').composite),
    appearance: normalizeAppearance(settings.get('appearance').composite),
    layout: normalizeLayout(settings.get('layout').composite),
    effects: normalizeEffects(settings.get('effects').composite),
    events: normalizeEvents(settings.get('events').composite),
    customCss: normalizeCustomCss(settings.get('customCss').composite)
  };
}

/**
 * One-time upgrade of live settings saved by the first release: an
 * animated (particles/shader) background becomes a base color plus an
 * effect layer. Runs once at startup, before anything reads the settings.
 * @param settings - this extension's live settings
 */
export async function migrateLegacySettings(
  settings: ISettingRegistry.ISettings
): Promise<void> {
  const rawBackground = settings.get('background').composite;
  const migrated = legacyEffectLayers(rawBackground);
  if (migrated.length === 0) {
    return;
  }
  const existing = normalizeEffects(settings.get('effects').composite);
  const effects = existing.some(layer => layer.id === MIGRATED_LAYER_ID)
    ? existing
    : [...migrated, ...existing];
  await settings.set('effects', effects);
  await settings.set('background', normalizeBackground(rawBackground));
}
