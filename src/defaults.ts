/**
 * Default values and static option lists for the theme customization engine.
 */

import { generateId } from './ids';
import {
  BackgroundImageFit,
  BlendMode,
  EffectKind,
  EffectPlacement,
  EffectTarget,
  EventAction,
  EventLocation,
  EventSound,
  EventTrigger,
  IAppearanceConfig,
  IBackgroundConfig,
  IBrandingConfig,
  IColorOverrides,
  IEffectLayer,
  IEventRule,
  IGradientConfig,
  ILayoutConfig,
  IParticlePreset,
  IParticlesConfig,
  IQolConfig,
  IShaderConfig,
  IThemeConfig,
  ParticleEmitter,
  ParticleShape,
  ShaderPreset
} from './types';

/** Mirrors JupyterLab core's CodeMirror defaults, except `autoClosingBrackets`,
 * which core ships disabled. */
export const DEFAULT_QOL_CONFIG: IQolConfig = {
  autoClosingBrackets: true,
  matchBrackets: true,
  codeFolding: false,
  highlightActiveLine: false,
  lineNumbers: true,
  lineWrap: true,
  highlightWhitespace: false,
  highlightTrailingWhitespace: false,
  indentUnit: '4',
  cursorBlinkRate: 1200
};

/** No overrides: every color inherits the active theme. */
export const DEFAULT_COLORS: IColorOverrides = {};

export const DEFAULT_GRADIENT: IGradientConfig = {
  kind: 'linear',
  angle: 135,
  stops: [
    { color: '#1e1e2f', position: 0 },
    { color: '#3a1c71', position: 50 },
    { color: '#d76d77', position: 100 }
  ],
  animation: 'none',
  speed: 1,
  scrollSize: 1200
};

export const DEFAULT_PARTICLES: IParticlesConfig = {
  count: 80,
  color: '#8ab4ff',
  size: 2,
  speed: 1,
  links: true,
  linkDistance: 120,
  mouse: true,
  shape: 'circle',
  twinkle: false,
  gravity: 0,
  spin: 0,
  sizeVariation: 0.5,
  opacity: 1,
  glow: 0,
  colorBlend: '',
  imageRef: '',
  trail: 0,
  emitter: 'screen'
};

export const DEFAULT_SHADER: IShaderConfig = {
  preset: 'aurora',
  color1: '#0b1026',
  color2: '#1fd1a5',
  color3: '#7a5cff',
  speed: 1,
  intensity: 1,
  resolution: 0.5
};

export const DEFAULT_BACKGROUND_CONFIG: IBackgroundConfig = {
  type: 'none',
  color: '#1e1e1e',
  gradient: DEFAULT_GRADIENT,
  imageRef: '',
  opacity: 1,
  blur: 0,
  chromeOpacity: 0.3,
  contentOpacity: 1,
  imageFit: 'cover',
  imagePositionX: 50,
  imagePositionY: 50,
  imageZoom: 1,
  noise: 0,
  vignette: 0
};

export const DEFAULT_APPEARANCE_CONFIG: IAppearanceConfig = {
  baseTheme: 'auto',
  radius: 2,
  borderWidth: 1,
  floatingPanels: false,
  panelGap: 8,
  shadow: 1,
  glass: false,
  glassBlur: 12,
  glow: false,
  glowIntensity: 0.6,
  uiFont: '',
  codeFont: '',
  uiFontSize: 0,
  codeFontSize: 0,
  codeLineHeight: 0,
  ligatures: true,
  cursorStyle: 'line',
  animations: false,
  borderStyle: 'solid',
  shadowColor: '#000000',
  acrylicNoise: false,
  gradientHeadings: false,
  cursorTrail: false
};

export const DEFAULT_BRANDING_CONFIG: IBrandingConfig = {
  faviconRef: '',
  animatedFavicon: false,
  splashEnabled: false,
  splashText: 'Loading…',
  splashColor: '#0b1026'
};

export const DEFAULT_LAYOUT_CONFIG: ILayoutConfig = {
  hideHeader: false,
  hideStatusBar: false,
  hideLeftActivityBar: false,
  hideRightActivityBar: false,
  density: 'normal',
  tabStyle: 'default',
  hidePrompts: false,
  notebookMaxWidth: 0,
  cellStyle: 'default',
  scrollbarStyle: 'default',
  scrollbarColor: ''
};

export const DEFAULT_THEME_CONFIG: IThemeConfig = {
  qol: DEFAULT_QOL_CONFIG,
  colors: DEFAULT_COLORS,
  background: DEFAULT_BACKGROUND_CONFIG,
  appearance: DEFAULT_APPEARANCE_CONFIG,
  layout: DEFAULT_LAYOUT_CONFIG,
  effects: [],
  events: [],
  customCss: ''
};

export interface IColorField {
  variable: string;
  label: string;
}

export interface IColorGroup {
  title: string;
  fields: IColorField[];
}

/** Every color the Colors tab exposes, grouped for display. */
export const COLOR_GROUPS: IColorGroup[] = [
  {
    title: 'Accent',
    fields: [
      { variable: '--jp-brand-color1', label: 'Accent' },
      { variable: '--jp-brand-color0', label: 'Accent (strong)' },
      { variable: '--jp-brand-color2', label: 'Accent (soft)' },
      { variable: '--jp-accent-color1', label: 'Secondary accent' }
    ]
  },
  {
    title: 'Surfaces',
    fields: [
      { variable: '--jp-layout-color0', label: 'Content background' },
      { variable: '--jp-layout-color1', label: 'Panel background' },
      { variable: '--jp-layout-color2', label: 'Raised panels and hover' },
      { variable: '--jp-layout-color3', label: 'Window backdrop' },
      { variable: '--jp-cell-editor-background', label: 'Code cell background' }
    ]
  },
  {
    title: 'Text',
    fields: [
      { variable: '--jp-ui-font-color0', label: 'UI text (strong)' },
      { variable: '--jp-ui-font-color1', label: 'UI text' },
      { variable: '--jp-ui-font-color2', label: 'UI text (muted)' },
      { variable: '--jp-ui-font-color3', label: 'UI text (faint)' },
      { variable: '--jp-content-font-color1', label: 'Document text' },
      { variable: '--jp-content-link-color', label: 'Links' }
    ]
  },
  {
    title: 'Borders',
    fields: [
      { variable: '--jp-border-color0', label: 'Border (strong)' },
      { variable: '--jp-border-color1', label: 'Border' },
      { variable: '--jp-border-color2', label: 'Border (soft)' }
    ]
  },
  {
    title: 'Status',
    fields: [
      { variable: '--jp-success-color1', label: 'Success' },
      { variable: '--jp-warn-color1', label: 'Warning' },
      { variable: '--jp-error-color1', label: 'Error' },
      { variable: '--jp-info-color1', label: 'Info' }
    ]
  },
  {
    title: 'Editor',
    fields: [
      { variable: '--jp-editor-cursor-color', label: 'Cursor' },
      { variable: '--jp-editor-selected-background', label: 'Selection' },
      {
        variable: '--jp-editor-selected-focused-background',
        label: 'Selection (focused)'
      },
      {
        variable: '--jp-cell-editor-active-border-color',
        label: 'Active cell border'
      }
    ]
  },
  {
    title: 'Syntax highlighting',
    fields: [
      { variable: '--jp-mirror-editor-keyword-color', label: 'Keywords' },
      { variable: '--jp-mirror-editor-string-color', label: 'Strings' },
      {
        variable: '--jp-mirror-editor-string-2-color',
        label: 'Special strings (f-strings, regex)'
      },
      { variable: '--jp-mirror-editor-comment-color', label: 'Comments' },
      { variable: '--jp-mirror-editor-number-color', label: 'Numbers' },
      { variable: '--jp-mirror-editor-def-color', label: 'Definitions' },
      { variable: '--jp-mirror-editor-variable-color', label: 'Variables' },
      { variable: '--jp-mirror-editor-builtin-color', label: 'Built-ins' },
      { variable: '--jp-mirror-editor-operator-color', label: 'Operators' },
      { variable: '--jp-mirror-editor-property-color', label: 'Properties' },
      { variable: '--jp-mirror-editor-atom-color', label: 'Constants' },
      { variable: '--jp-mirror-editor-meta-color', label: 'Decorators' },
      { variable: '--jp-mirror-editor-punctuation-color', label: 'Punctuation' }
    ]
  }
];

/** One-click syntax-only color packs: they set just the `--jp-mirror-editor-*`
 * variables, leaving every other color (UI, surfaces) as-is. */
export interface ISyntaxThemePack {
  name: string;
  colors: Record<string, string>;
}

export const SYNTAX_THEME_PACKS: ISyntaxThemePack[] = [
  {
    name: 'Dracula',
    colors: {
      '--jp-mirror-editor-keyword-color': '#ff79c6',
      '--jp-mirror-editor-string-color': '#f1fa8c',
      '--jp-mirror-editor-string-2-color': '#f1fa8c',
      '--jp-mirror-editor-number-color': '#bd93f9',
      '--jp-mirror-editor-def-color': '#50fa7b',
      '--jp-mirror-editor-builtin-color': '#8be9fd',
      '--jp-mirror-editor-operator-color': '#ff79c6',
      '--jp-mirror-editor-property-color': '#66d9ef',
      '--jp-mirror-editor-atom-color': '#bd93f9',
      '--jp-mirror-editor-meta-color': '#6272a4',
      '--jp-mirror-editor-comment-color': '#6272a4',
      '--jp-mirror-editor-variable-color': '#f8f8f2',
      '--jp-mirror-editor-punctuation-color': '#f8f8f2'
    }
  },
  {
    name: 'Nord',
    colors: {
      '--jp-mirror-editor-keyword-color': '#81a1c1',
      '--jp-mirror-editor-string-color': '#a3be8c',
      '--jp-mirror-editor-string-2-color': '#a3be8c',
      '--jp-mirror-editor-number-color': '#b48ead',
      '--jp-mirror-editor-def-color': '#88c0d0',
      '--jp-mirror-editor-builtin-color': '#8fbcbb',
      '--jp-mirror-editor-operator-color': '#81a1c1',
      '--jp-mirror-editor-property-color': '#8fbcbb',
      '--jp-mirror-editor-atom-color': '#b48ead',
      '--jp-mirror-editor-meta-color': '#616e88',
      '--jp-mirror-editor-comment-color': '#616e88',
      '--jp-mirror-editor-variable-color': '#d8dee9',
      '--jp-mirror-editor-punctuation-color': '#eceff4'
    }
  },
  {
    name: 'Solarized Dark',
    colors: {
      '--jp-mirror-editor-keyword-color': '#859900',
      '--jp-mirror-editor-string-color': '#2aa198',
      '--jp-mirror-editor-string-2-color': '#2aa198',
      '--jp-mirror-editor-number-color': '#d33682',
      '--jp-mirror-editor-def-color': '#268bd2',
      '--jp-mirror-editor-builtin-color': '#b58900',
      '--jp-mirror-editor-operator-color': '#859900',
      '--jp-mirror-editor-property-color': '#268bd2',
      '--jp-mirror-editor-atom-color': '#d33682',
      '--jp-mirror-editor-meta-color': '#93a1a1',
      '--jp-mirror-editor-comment-color': '#586e75',
      '--jp-mirror-editor-variable-color': '#839496',
      '--jp-mirror-editor-punctuation-color': '#93a1a1'
    }
  },
  {
    name: 'Monokai',
    colors: {
      '--jp-mirror-editor-keyword-color': '#f92672',
      '--jp-mirror-editor-string-color': '#e6db74',
      '--jp-mirror-editor-string-2-color': '#e6db74',
      '--jp-mirror-editor-number-color': '#ae81ff',
      '--jp-mirror-editor-def-color': '#a6e22e',
      '--jp-mirror-editor-builtin-color': '#66d9ef',
      '--jp-mirror-editor-operator-color': '#f92672',
      '--jp-mirror-editor-property-color': '#a6e22e',
      '--jp-mirror-editor-atom-color': '#ae81ff',
      '--jp-mirror-editor-meta-color': '#75715e',
      '--jp-mirror-editor-comment-color': '#75715e',
      '--jp-mirror-editor-variable-color': '#f8f8f2',
      '--jp-mirror-editor-punctuation-color': '#f8f8f2'
    }
  }
];

/** Maps the first release's named color keys onto the variables they set. */
export const LEGACY_COLOR_KEYS: Record<string, string> = {
  accentColor: '--jp-brand-color1',
  layoutColor0: '--jp-layout-color0',
  layoutColor1: '--jp-layout-color1',
  layoutColor2: '--jp-layout-color2',
  uiFontColor1: '--jp-ui-font-color1',
  editorCursorColor: '--jp-editor-cursor-color'
};

/**
 * Chrome-only layout variables made translucent while a background layer is
 * active. `--jp-layout-color3` paints JupyterLab's outermost
 * `.jp-ThemedContainer`; without it the layer is fully hidden.
 */
export const CHROME_VARIABLES: readonly string[] = [
  '--jp-layout-color1',
  '--jp-layout-color2',
  '--jp-layout-color3',
  '--jp-toolbar-background'
];

/** Notebook/editor content surface, only made translucent on request. */
export const CONTENT_VARIABLE = '--jp-layout-color0';

/** Every variable whose theme value the engine reads or may override. */
export const ALL_COLOR_VARIABLES: readonly string[] = Array.from(
  new Set([
    ...COLOR_GROUPS.reduce<string[]>(
      (all, group) => all.concat(group.fields.map(f => f.variable)),
      []
    ),
    ...CHROME_VARIABLES,
    CONTENT_VARIABLE
  ])
);

export interface IFontOption {
  label: string;
  /** Google Fonts family name, when the font must be loaded. */
  google?: string;
  /** CSS `font-family` value. */
  stack: string;
}

export const UI_FONT_OPTIONS: IFontOption[] = [
  {
    label: 'System',
    stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
  },
  { label: 'Inter', google: 'Inter', stack: "'Inter', system-ui, sans-serif" },
  {
    label: 'Roboto',
    google: 'Roboto',
    stack: "'Roboto', system-ui, sans-serif"
  },
  {
    label: 'Poppins',
    google: 'Poppins',
    stack: "'Poppins', system-ui, sans-serif"
  },
  {
    label: 'Nunito',
    google: 'Nunito',
    stack: "'Nunito', system-ui, sans-serif"
  },
  {
    label: 'Outfit',
    google: 'Outfit',
    stack: "'Outfit', system-ui, sans-serif"
  },
  {
    label: 'Space Grotesk',
    google: 'Space Grotesk',
    stack: "'Space Grotesk', system-ui, sans-serif"
  },
  {
    label: 'IBM Plex Sans',
    google: 'IBM Plex Sans',
    stack: "'IBM Plex Sans', system-ui, sans-serif"
  },
  {
    label: 'Lexend',
    google: 'Lexend',
    stack: "'Lexend', system-ui, sans-serif"
  },
  {
    label: 'Silkscreen',
    google: 'Silkscreen',
    stack: "'Silkscreen', monospace"
  }
];

export const CODE_FONT_OPTIONS: IFontOption[] = [
  {
    label: 'System monospace',
    stack: "ui-monospace, Consolas, 'Courier New', monospace"
  },
  {
    label: 'JetBrains Mono',
    google: 'JetBrains Mono',
    stack: "'JetBrains Mono', monospace"
  },
  { label: 'Fira Code', google: 'Fira Code', stack: "'Fira Code', monospace" },
  {
    label: 'Source Code Pro',
    google: 'Source Code Pro',
    stack: "'Source Code Pro', monospace"
  },
  {
    label: 'IBM Plex Mono',
    google: 'IBM Plex Mono',
    stack: "'IBM Plex Mono', monospace"
  },
  {
    label: 'Roboto Mono',
    google: 'Roboto Mono',
    stack: "'Roboto Mono', monospace"
  },
  {
    label: 'Space Mono',
    google: 'Space Mono',
    stack: "'Space Mono', monospace"
  },
  {
    label: 'Ubuntu Mono',
    google: 'Ubuntu Mono',
    stack: "'Ubuntu Mono', monospace"
  },
  { label: 'VT323', google: 'VT323', stack: "'VT323', monospace" }
];

export interface IGradientPreset {
  name: string;
  gradient: IGradientConfig;
}

function preset(
  name: string,
  angle: number,
  colors: string[]
): IGradientPreset {
  const last = colors.length - 1;
  return {
    name,
    gradient: {
      kind: 'linear',
      angle,
      stops: colors.map((color, index) => ({
        color,
        position: Math.round((index / last) * 100)
      })),
      animation: 'none',
      speed: 1,
      scrollSize: 1200
    }
  };
}

export const GRADIENT_PRESETS: IGradientPreset[] = [
  preset('Sunset', 135, ['#1e1e2f', '#3a1c71', '#d76d77', '#ffaf7b']),
  preset('Ocean', 160, ['#0f2027', '#203a43', '#2c5364']),
  preset('Aurora', 120, ['#0b1026', '#1fd1a5', '#7a5cff']),
  preset('Midnight', 180, ['#000000', '#0f0c29', '#302b63']),
  preset('Candy', 135, ['#ff9a9e', '#fad0c4', '#a18cd1']),
  preset('Forest', 150, ['#0b3d2e', '#1e6f50', '#a8e063']),
  preset('Ember', 45, ['#200122', '#6f0000', '#ff512f']),
  preset('Mint', 90, ['#e0fff4', '#a8edea', '#79d7c9'])
];

export const SHADER_PRESETS: { value: ShaderPreset; label: string }[] = [
  { value: 'aurora', label: 'Aurora' },
  { value: 'liquid', label: 'Liquid gradient' },
  { value: 'plasma', label: 'Plasma' },
  { value: 'waves', label: 'Glowing waves' },
  { value: 'nebula', label: 'Nebula' },
  { value: 'starfield', label: 'Starfield warp' },
  { value: 'rain', label: 'Rain' },
  { value: 'grid', label: 'Retro grid' },
  { value: 'embers', label: 'Rising embers' }
];

export const PARTICLE_SHAPE_OPTIONS: IOptionItem<ParticleShape>[] = [
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'star', label: 'Star' },
  { value: 'char', label: 'Falling characters (digital rain)' }
];

export const PARTICLE_EMITTER_OPTIONS: IOptionItem<ParticleEmitter>[] = [
  { value: 'screen', label: 'Whole screen' },
  { value: 'cursor', label: 'From the cursor' },
  { value: 'edges', label: 'From the edges' },
  { value: 'center', label: 'From the center' }
];

/** A new saved particle preset with sensible bookkeeping defaults. */
export function createParticlePreset(
  name: string,
  particles: IParticlesConfig
): IParticlePreset {
  return {
    id: generateId(),
    name,
    createdAt: new Date().toISOString(),
    particles
  };
}

/** Built-in particle presets offered in the Particle Lab tab, alongside
 * anything the user has saved. Not stored in settings and not deletable. */
export const PARTICLE_STARTER_PRESETS: {
  name: string;
  particles: IParticlesConfig;
}[] = [
  {
    name: 'Snow',
    particles: {
      ...DEFAULT_PARTICLES,
      color: '#ffffff',
      count: 120,
      size: 2.5,
      speed: 0.4,
      links: false,
      mouse: false,
      shape: 'circle',
      twinkle: false,
      gravity: 1.2
    }
  },
  {
    name: 'Fireflies',
    particles: {
      ...DEFAULT_PARTICLES,
      color: '#e8ff6b',
      count: 40,
      size: 2,
      speed: 0.5,
      links: false,
      mouse: false,
      shape: 'circle',
      twinkle: true,
      gravity: -0.15
    }
  },
  {
    name: 'Embers',
    particles: {
      ...DEFAULT_PARTICLES,
      color: '#ff8a3d',
      count: 60,
      size: 1.5,
      speed: 1,
      links: false,
      mouse: false,
      shape: 'circle',
      twinkle: true,
      gravity: -2
    }
  },
  {
    name: 'Fairy dust',
    particles: {
      ...DEFAULT_PARTICLES,
      color: '#d18bff',
      count: 90,
      size: 1.5,
      speed: 0.8,
      links: true,
      linkDistance: 90,
      mouse: true,
      shape: 'star',
      twinkle: true,
      gravity: 0
    }
  },
  {
    name: 'Bubbles',
    particles: {
      ...DEFAULT_PARTICLES,
      color: '#8ad8ff',
      count: 35,
      size: 4,
      speed: 0.6,
      links: false,
      mouse: true,
      shape: 'circle',
      twinkle: false,
      gravity: -0.8
    }
  }
];

export interface IOptionItem<T extends string> {
  value: T;
  label: string;
}

export const IMAGE_FIT_OPTIONS: IOptionItem<BackgroundImageFit>[] = [
  { value: 'cover', label: 'Cover (fill, may crop)' },
  { value: 'contain', label: 'Contain (fit whole image)' },
  { value: 'stretch', label: 'Stretch (fill exactly)' },
  { value: 'tile', label: 'Tile (repeat)' }
];

export const EFFECT_TARGET_OPTIONS: IOptionItem<EffectTarget>[] = [
  { value: 'background', label: 'Background (behind everything)' },
  { value: 'all-windows', label: 'Every window' },
  { value: 'notebooks', label: 'Notebooks' },
  { value: 'terminals', label: 'Terminals' },
  { value: 'editors', label: 'Text editors' },
  { value: 'consoles', label: 'Consoles' },
  { value: 'file', label: 'One specific file…' }
];

export const EFFECT_PLACEMENT_OPTIONS: IOptionItem<EffectPlacement>[] = [
  { value: 'overlay', label: 'Over the content' },
  { value: 'behind', label: 'Behind the content' }
];

export const BLEND_MODE_OPTIONS: IOptionItem<BlendMode>[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'screen', label: 'Screen (brighten)' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft light' },
  { value: 'color-dodge', label: 'Color dodge (glow)' },
  { value: 'multiply', label: 'Multiply (darken)' }
];

/**
 * A new effect layer with sensible defaults. Window layers default to a
 * subtle overlay; background layers to fully opaque.
 */
export function createEffectLayer(
  kind: EffectKind,
  target: EffectTarget = 'background'
): IEffectLayer {
  const inWindow = target !== 'background';
  return {
    id: generateId(),
    name: kind === 'particles' ? 'Particles' : 'Shader',
    enabled: true,
    kind,
    target,
    path: '',
    placement: 'overlay',
    opacity: inWindow ? 0.6 : 1,
    blend: inWindow && kind === 'shader' ? 'screen' : 'normal',
    maxFps: 60,
    particles: DEFAULT_PARTICLES,
    shader: DEFAULT_SHADER
  };
}

export const EVENT_TRIGGER_OPTIONS: IOptionItem<EventTrigger>[] = [
  { value: 'cell-success', label: 'A cell runs successfully' },
  { value: 'cell-error', label: 'A cell fails with an error' },
  { value: 'toolbar-button', label: 'Any toolbar button is clicked' },
  { value: 'save', label: 'A file is saved' },
  { value: 'typing', label: 'Typing in an editor' },
  { value: 'command', label: 'A specific command runs…' },
  { value: 'shortcut', label: 'A keyboard shortcut is pressed…' },
  { value: 'idle', label: "You've been idle for a while…" },
  { value: 'startup', label: 'JupyterLab starts' }
];

export const EVENT_SOUND_OPTIONS: IOptionItem<EventSound>[] = [
  { value: 'none', label: 'No sound' },
  { value: 'chime', label: 'Chime' },
  { value: 'pop', label: 'Pop' },
  { value: 'click', label: 'Click' },
  { value: 'success', label: 'Success arpeggio' },
  { value: 'error', label: 'Error tone' }
];

export const EVENT_ACTION_OPTIONS: IOptionItem<EventAction>[] = [
  { value: 'confetti', label: 'Confetti burst' },
  { value: 'fireworks', label: 'Fireworks' },
  { value: 'sparkles', label: 'Sparkles' },
  { value: 'shockwave', label: 'Shockwave ring' },
  { value: 'flash', label: 'Screen flash' },
  { value: 'shake', label: 'Shake the window' },
  { value: 'glow', label: 'Glow pulse' },
  { value: 'typing-animation', label: 'Typing animation' },
  { value: 'shader-pulse', label: 'Pulse effect layers (speed + brightness)' },
  { value: 'toggle-layer', label: 'Turn an effect layer on/off' },
  { value: 'flash-layer', label: 'Show an effect layer briefly' }
];

/** Actions that drive effect layers rather than playing an animation. */
export const LAYER_ACTIONS: readonly EventAction[] = [
  'shader-pulse',
  'toggle-layer',
  'flash-layer'
];

export const EVENT_LOCATION_OPTIONS: IOptionItem<EventLocation>[] = [
  { value: 'target', label: 'Where it happened' },
  { value: 'cursor', label: 'At the mouse pointer' },
  { value: 'center', label: 'Center of the screen' }
];

/** Commands that count as "a file is saved". */
export const SAVE_COMMANDS: readonly string[] = [
  'docmanager:save',
  'docmanager:save-as',
  'docmanager:save-all'
];

/** Suggestions offered for the "specific command" trigger. */
export const COMMON_COMMANDS: { id: string; label: string }[] = [
  { id: 'notebook:run-cell', label: 'Run cell' },
  { id: 'notebook:run-cell-and-select-next', label: 'Run cell and advance' },
  { id: 'notebook:run-all-cells', label: 'Run all cells' },
  { id: 'notebook:restart-kernel', label: 'Restart kernel' },
  { id: 'notebook:create-new', label: 'New notebook' },
  { id: 'terminal:create-new', label: 'New terminal' },
  { id: 'console:create', label: 'New console' },
  { id: 'filebrowser:create-new-file', label: 'New file' },
  { id: 'apputils:activate-command-palette', label: 'Open command palette' },
  { id: 'application:toggle-left-area', label: 'Toggle left sidebar' }
];

export function createEventRule(changes: Partial<IEventRule> = {}): IEventRule {
  return {
    id: generateId(),
    name: 'New effect',
    enabled: true,
    trigger: 'cell-success',
    command: '',
    shortcut: '',
    action: 'confetti',
    location: 'target',
    color1: '#ff2e97',
    color2: '#ffd166',
    color3: '#4cc9f0',
    size: 1,
    duration: 1500,
    layerId: '',
    text: 'Hello!',
    idleMinutes: 5,
    secondaryTrigger: '',
    chainRuleId: '',
    chainDelay: 300,
    sound: 'none',
    soundVolume: 0.5,
    ...changes
  };
}

/** Ready-made rules offered in the Events tab. */
export const EVENT_PRESETS: { name: string; rule: Partial<IEventRule> }[] = [
  {
    name: 'Confetti when a cell succeeds',
    rule: {
      name: 'Celebrate runs',
      trigger: 'cell-success',
      action: 'confetti'
    }
  },
  {
    name: 'Shake the cell on errors',
    rule: { name: 'Error shake', trigger: 'cell-error', action: 'shake' }
  },
  {
    name: 'Red flash on errors',
    rule: {
      name: 'Error flash',
      trigger: 'cell-error',
      action: 'flash',
      location: 'center',
      color1: '#ff4d4d',
      size: 0.6
    }
  },
  {
    name: 'Power mode: sparks while typing',
    rule: {
      name: 'Power mode',
      trigger: 'typing',
      action: 'sparkles',
      size: 0.5,
      color1: '#4cc9f0',
      color2: '#7a5cff',
      color3: '#ffffff'
    }
  },
  {
    name: 'Shockwave on toolbar buttons',
    rule: {
      name: 'Button shockwave',
      trigger: 'toolbar-button',
      action: 'shockwave',
      color1: '#7a5cff'
    }
  },
  {
    name: 'Fireworks when saving',
    rule: {
      name: 'Save fireworks',
      trigger: 'save',
      action: 'fireworks',
      location: 'center'
    }
  },
  {
    name: 'Glow on the cell that ran',
    rule: {
      name: 'Run glow',
      trigger: 'cell-success',
      action: 'glow',
      color1: '#1fd1a5'
    }
  },
  {
    name: 'Pulse effect layers when a cell succeeds',
    rule: {
      name: 'Layer pulse',
      trigger: 'cell-success',
      action: 'shader-pulse',
      duration: 1200
    }
  },
  {
    name: 'Welcome message on startup',
    rule: {
      name: 'Welcome message',
      trigger: 'startup',
      action: 'typing-animation',
      location: 'center',
      text: 'Welcome back!'
    }
  },
  {
    name: 'Confetti on a keyboard shortcut',
    rule: {
      name: 'Secret confetti',
      trigger: 'shortcut',
      shortcut: 'Ctrl+Shift+K',
      action: 'confetti',
      location: 'center'
    }
  }
];
