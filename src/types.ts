/**
 * Shared type definitions for the theme customization engine.
 *
 * Every config interface extends `PartialJSONObject` so instances satisfy
 * `ISettingRegistry.ISettings.set()`'s `PartialJSONValue` parameter without
 * a cast.
 */

import { PartialJSONObject } from '@lumino/coreutils';

export type IndentUnit = 'Tab' | '1' | '2' | '4' | '8';

/**
 * Editor behavior toggles, mapped onto
 * `@jupyterlab/codemirror-extension:plugin`'s `defaultConfig`.
 */
export interface IQolConfig extends PartialJSONObject {
  autoClosingBrackets: boolean;
  matchBrackets: boolean;
  codeFolding: boolean;
  highlightActiveLine: boolean;
  lineNumbers: boolean;
  lineWrap: boolean;
  highlightWhitespace: boolean;
  highlightTrailingWhitespace: boolean;
  indentUnit: IndentUnit;
  cursorBlinkRate: number;
}

/**
 * Color overrides keyed by the `--jp-*` CSS variable they replace. A
 * variable that is absent (or an empty string) inherits the active
 * JupyterLab theme's value.
 */
export interface IColorOverrides extends PartialJSONObject {
  [variable: string]: string;
}

export type GradientKind = 'linear' | 'radial' | 'conic';

export interface IGradientStop extends PartialJSONObject {
  color: string;
  /** Position along the gradient, 0–100. */
  position: number;
}

/**
 * - `rotate`: spins linear/conic gradients (radial ones drift instead).
 * - `scroll`: pans endlessly in the direction of `angle` (radial ones
 *   ripple outward), by repeating the gradient mirrored so it's seamless.
 */
export type GradientAnimation = 'none' | 'rotate' | 'scroll';

export interface IGradientConfig extends PartialJSONObject {
  kind: GradientKind;
  /** Angle in degrees; also the scroll direction. */
  angle: number;
  stops: IGradientStop[];
  animation: GradientAnimation;
  /** Animation speed multiplier, 0.1–5. */
  speed: number;
  /** Length in px of one full (mirrored) repeat while scrolling. */
  scrollSize: number;
}

/** How each particle is drawn. `char` draws a random falling character
 * (digital-rain / Matrix style), overriding shape entirely. */
export type ParticleShape = 'circle' | 'square' | 'triangle' | 'star' | 'char';

export interface IParticlesConfig extends PartialJSONObject {
  count: number;
  color: string;
  size: number;
  speed: number;
  links: boolean;
  linkDistance: number;
  mouse: boolean;
  shape: ParticleShape;
  /** Fades each particle in and out on its own cycle. */
  twinkle: boolean;
  /** Constant directional bias, -3 (float up) to 3 (fall down), 0 = none. */
  gravity: number;
  /** Rotation speed, -3 to 3 (visible on square, triangle, and star). */
  spin: number;
  /** How much each particle's size varies from the base size, 0–1. */
  sizeVariation: number;
  /** Base transparency, 0–1. */
  opacity: number;
  /** Soft blur halo strength, 0 (none) to 1 (strong). */
  glow: number;
  /** A second color particles randomly blend toward. '' disables blending. */
  colorBlend: string;
  /** Reference to a stored image drawn in place of the shape. '' uses the
   * `shape` setting instead. */
  imageRef: string;
  /** A motion-blur trail behind each moving particle, 0 (none) to 1. */
  trail: number;
  /** Where particles spawn from. */
  emitter: ParticleEmitter;
}

/** Where particles are spawned. `screen` fills the whole area randomly, as
 * before; the others emit from one moving or fixed point. */
export type ParticleEmitter = 'screen' | 'cursor' | 'edges' | 'center';

export type ShaderPreset =
  | 'aurora'
  | 'plasma'
  | 'waves'
  | 'nebula'
  | 'starfield'
  | 'liquid'
  | 'rain'
  | 'grid'
  | 'embers';

export interface IShaderConfig extends PartialJSONObject {
  preset: ShaderPreset;
  color1: string;
  color2: string;
  color3: string;
  speed: number;
  intensity: number;
  /** Render resolution as a fraction of the screen, 0.25–1. */
  resolution: number;
}

/** The base background. Animated effects live in separate effect layers. */
export type BackgroundType = 'none' | 'color' | 'gradient' | 'image';

/**
 * How a background image fills its area: `cover` crops to fill (no gaps),
 * `contain` fits the whole image (may letterbox), `stretch` fills exactly
 * (may distort), `tile` repeats the image at its natural size.
 */
export type BackgroundImageFit = 'cover' | 'contain' | 'stretch' | 'tile';

/**
 * Base background configuration. `imageRef` is a small key referencing an
 * image data URL stored separately in `IStateDB` — the settings schema only
 * ever holds this reference, never the image bytes themselves.
 */
export interface IBackgroundConfig extends PartialJSONObject {
  type: BackgroundType;
  color: string;
  gradient: IGradientConfig;
  imageRef: string;
  opacity: number;
  blur: number;
  /** How opaque the chrome panels stay while a background is active, 0–1. */
  chromeOpacity: number;
  /** How opaque windows (notebooks, editors, terminals…) stay while a
   * background is active, 0.5–1. */
  contentOpacity: number;
  /** How the image fills its area. */
  imageFit: BackgroundImageFit;
  /** Horizontal position of the image within its area, 0–100 (%). */
  imagePositionX: number;
  /** Vertical position of the image within its area, 0–100 (%). */
  imagePositionY: number;
  /** Zoom multiplier applied around the position above, 0.5–3 (1 = 100%). */
  imageZoom: number;
  /** Grain/noise texture overlay strength, 0 (none) to 1. */
  noise: number;
  /** Darkened-edges vignette strength, 0 (none) to 1. */
  vignette: number;
}

export type EffectKind = 'particles' | 'shader';

/**
 * Where an effect layer renders: the global background, or inside every
 * open window of a kind (each gets its own instance), or one file.
 */
export type EffectTarget =
  | 'background'
  | 'all-windows'
  | 'notebooks'
  | 'terminals'
  | 'editors'
  | 'consoles'
  | 'file';

/** For window targets: drawn over the content, or behind it (visible
 * where the window is translucent). */
export type EffectPlacement = 'overlay' | 'behind';

export type BlendMode =
  | 'normal'
  | 'screen'
  | 'lighten'
  | 'overlay'
  | 'soft-light'
  | 'color-dodge'
  | 'multiply';

/** One animated effect (particles or a shader) and where it renders. */
export interface IEffectLayer extends PartialJSONObject {
  id: string;
  name: string;
  enabled: boolean;
  kind: EffectKind;
  target: EffectTarget;
  /** File path (or file name) for the `file` target. */
  path: string;
  placement: EffectPlacement;
  opacity: number;
  blend: BlendMode;
  maxFps: number;
  particles: IParticlesConfig;
  shader: IShaderConfig;
}

export type EventTrigger =
  | 'cell-success'
  | 'cell-error'
  | 'toolbar-button'
  | 'command'
  | 'save'
  | 'typing'
  | 'startup'
  | 'shortcut'
  | 'idle';

/** Built-in synthesized tones (Web Audio, no sound files needed). */
export type EventSound =
  'none' | 'chime' | 'pop' | 'click' | 'success' | 'error';

export type EventAction =
  | 'confetti'
  | 'fireworks'
  | 'sparkles'
  | 'shockwave'
  | 'flash'
  | 'shake'
  | 'glow'
  | 'typing-animation'
  | 'shader-pulse'
  | 'toggle-layer'
  | 'flash-layer';

/** Where a visual action plays: at the thing that triggered it (the cell,
 * button, or text cursor), at the mouse pointer, or screen center. */
export type EventLocation = 'target' | 'cursor' | 'center';

/** "When <trigger> happens, play <action>." */
export interface IEventRule extends PartialJSONObject {
  id: string;
  name: string;
  enabled: boolean;
  trigger: EventTrigger;
  /** Command id, for the `command` trigger. */
  command: string;
  /** Key combo, e.g. "Ctrl+Shift+K", for the `shortcut` trigger. */
  shortcut: string;
  action: EventAction;
  location: EventLocation;
  color1: string;
  color2: string;
  color3: string;
  /** Size/amount multiplier, 0.25–3. */
  size: number;
  /** For layer actions: how long (ms) a pulse or brief show lasts. */
  duration: number;
  /** For layer actions: the effect layer id ('' = every layer). */
  layerId: string;
  /** Text to type out, for the `typing-animation` action. */
  text: string;
  /** Minutes of inactivity before the `idle` trigger fires. */
  idleMinutes: number;
  /** An additional trigger that must also have fired recently (within a few
   * seconds) for this rule to run — a simple "when X and Y" condition.
   * '' means no compound condition. */
  secondaryTrigger: EventTrigger | '';
  /** Another rule to run after this one, for simple macro chains.
   * '' means no chaining. */
  chainRuleId: string;
  /** Delay (ms) before the chained rule runs. */
  chainDelay: number;
  /** A short synthesized tone played alongside the visual action. */
  sound: EventSound;
  soundVolume: number;
}

export type CursorStyle = 'line' | 'thick' | 'block';
/** 'auto' leaves JupyterLab's own theme choice alone. */
export type BaseTheme = 'auto' | 'light' | 'dark';

/** Visual style: shape, surfaces, fonts, cursor, and motion. */
export interface IAppearanceConfig extends PartialJSONObject {
  /** Switches JupyterLab's built-in light/dark theme to match, so every
   * color the palette doesn't override still suits it. */
  baseTheme: BaseTheme;
  radius: number;
  borderWidth: number;
  floatingPanels: boolean;
  panelGap: number;
  shadow: number;
  glass: boolean;
  glassBlur: number;
  /** Ambient accent glow around the active cell, accent buttons, and the
   * active tab (a standing style, not a one-shot event). */
  glow: boolean;
  /** Glow strength, 0.1–1. */
  glowIntensity: number;
  /** Empty string inherits the theme's font. */
  uiFont: string;
  codeFont: string;
  /** 0 inherits the theme's size. */
  uiFontSize: number;
  codeFontSize: number;
  /** 0 inherits the theme's line height. */
  codeLineHeight: number;
  ligatures: boolean;
  cursorStyle: CursorStyle;
  animations: boolean;
  /** Style of cell/panel/button borders. */
  borderStyle: BorderStyle;
  /** Drop-shadow color for floating panels, e.g. `#000000`. */
  shadowColor: string;
  /** A subtle noise/grain texture over glass surfaces, for an "acrylic"
   * (Windows 11 Mica-like) feel. Only visible when `glass` is on. */
  acrylicNoise: boolean;
  /** Animates an accent-colored gradient across markdown headings. */
  gradientHeadings: boolean;
  /** A persistent trail of small accent-colored sparkles following the
   * cursor, independent of any click-triggered event. */
  cursorTrail: boolean;
}

export type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'double';

export type Density = 'compact' | 'normal' | 'comfortable';
export type TabStyle = 'default' | 'pill' | 'underline' | 'minimal';
export type CellStyle = 'default' | 'card' | 'borderless' | 'accent';
export type ScrollbarStyle = 'default' | 'thin' | 'hidden';

/** Layout: which chrome is shown and how tabs, cells, and scrollbars look. */
export interface ILayoutConfig extends PartialJSONObject {
  hideHeader: boolean;
  hideStatusBar: boolean;
  hideLeftActivityBar: boolean;
  hideRightActivityBar: boolean;
  density: Density;
  tabStyle: TabStyle;
  hidePrompts: boolean;
  /** 0 means full width. */
  notebookMaxWidth: number;
  cellStyle: CellStyle;
  scrollbarStyle: ScrollbarStyle;
  /** Empty string inherits the browser/theme scrollbar color. */
  scrollbarColor: string;
}

/** Full engine configuration, as stored under `neptuneatelier:plugin`. */
export interface IThemeConfig extends PartialJSONObject {
  qol: IQolConfig;
  colors: IColorOverrides;
  background: IBackgroundConfig;
  appearance: IAppearanceConfig;
  layout: ILayoutConfig;
  effects: IEffectLayer[];
  events: IEventRule[];
  customCss: string;
}

/** Top-level settings keys that together make up an `IThemeConfig`. */
export const THEME_CONFIG_KEYS = [
  'qol',
  'colors',
  'background',
  'appearance',
  'layout',
  'effects',
  'events',
  'customCss'
] as const;

export type ThemeConfigKey = (typeof THEME_CONFIG_KEYS)[number];

/** A named, saved snapshot of an `IThemeConfig`, for the preset system. */
export interface IThemePreset extends PartialJSONObject {
  id: string;
  name: string;
  createdAt: string;
  config: IThemeConfig;
}

/**
 * A preset as written to an exported file: the same shape, plus the
 * background image embedded as a data URL so it travels with the file.
 */
export interface IExportedPreset extends IThemePreset {
  imageData?: string;
}

/** Favicon, loading splash screen, and kernel-busy favicon animation. */
export interface IBrandingConfig extends PartialJSONObject {
  /** Reference to a stored favicon image; '' keeps JupyterLab's own. */
  faviconRef: string;
  /** Pulses the favicon while a notebook cell is running. */
  animatedFavicon: boolean;
  splashEnabled: boolean;
  splashText: string;
  splashColor: string;
}

/** Stores and retrieves background images by reference key. */
export interface IImageStore {
  storeImage(ref: string, dataUrl: string): Promise<void>;
  fetchImage(ref: string): Promise<string | undefined>;
}

/**
 * A named, saved particle configuration — built with the Particle Lab tab
 * and reusable from any Particles effect layer, independent of any single
 * applied theme.
 */
export interface IParticlePreset extends PartialJSONObject {
  id: string;
  name: string;
  createdAt: string;
  particles: IParticlesConfig;
}
