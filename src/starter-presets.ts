/**
 * Built-in starter themes shown in the Presets tab.
 */

import {
  createEffectLayer,
  createEventRule,
  DEFAULT_APPEARANCE_CONFIG,
  DEFAULT_BACKGROUND_CONFIG,
  DEFAULT_GRADIENT,
  DEFAULT_LAYOUT_CONFIG,
  DEFAULT_PARTICLES,
  DEFAULT_QOL_CONFIG,
  DEFAULT_SHADER
} from './defaults';
import { generatePalette } from './palette-generator';
import {
  IAppearanceConfig,
  IBackgroundConfig,
  IEffectLayer,
  IEventRule,
  ILayoutConfig,
  IParticlesConfig,
  IShaderConfig,
  IThemePreset
} from './types';

interface IStarterSpec {
  id: string;
  name: string;
  accent: string;
  mode: 'light' | 'dark';
  background: Partial<IBackgroundConfig>;
  effects?: IEffectLayer[];
  events?: IEventRule[];
  appearance: Partial<IAppearanceConfig>;
  layout: Partial<ILayoutConfig>;
  /** Extra CSS applied after everything else, for a signature detail the
   * other settings can't express (e.g. beveled buttons, scanlines). */
  customCss?: string;
}

/** Fixed ids keep starter layers stable when a starter is re-applied. */
function shaderLayer(id: string, shader: Partial<IShaderConfig>): IEffectLayer {
  return {
    ...createEffectLayer('shader', 'background'),
    id,
    shader: { ...DEFAULT_SHADER, ...shader }
  };
}

function particlesLayer(
  id: string,
  particles: Partial<IParticlesConfig>,
  changes: Partial<IEffectLayer> = {}
): IEffectLayer {
  return {
    ...createEffectLayer('particles', changes.target ?? 'background'),
    id,
    ...changes,
    particles: { ...DEFAULT_PARTICLES, ...particles }
  };
}

const SPECS: IStarterSpec[] = [
  {
    id: 'starter-midnight-glass',
    name: 'Midnight Glass',
    accent: '#7a5cff',
    mode: 'dark',
    background: { type: 'color', color: '#0b1026', chromeOpacity: 0.35 },
    effects: [
      shaderLayer('starter-midnight-aurora', {
        preset: 'aurora',
        color1: '#0b1026',
        color2: '#1fd1a5',
        color3: '#7a5cff'
      })
    ],
    appearance: {
      radius: 10,
      floatingPanels: true,
      panelGap: 8,
      shadow: 1.5,
      glass: true,
      uiFont: 'Inter',
      codeFont: 'JetBrains Mono',
      animations: true
    },
    layout: { tabStyle: 'pill', cellStyle: 'card', scrollbarStyle: 'thin' }
  },
  {
    id: 'starter-deep-space',
    name: 'Deep Space',
    accent: '#4cc9f0',
    mode: 'dark',
    background: { type: 'color', color: '#05070f', chromeOpacity: 0.25 },
    effects: [
      particlesLayer('starter-deep-space-stars', {
        color: '#4cc9f0',
        count: 110
      })
    ],
    appearance: {
      radius: 12,
      floatingPanels: true,
      panelGap: 10,
      glass: true,
      uiFont: 'Space Grotesk',
      codeFont: 'Roboto Mono',
      animations: true
    },
    layout: { tabStyle: 'pill', cellStyle: 'card', scrollbarStyle: 'thin' }
  },
  {
    id: 'starter-synthwave',
    name: 'Synthwave',
    accent: '#ff2e97',
    mode: 'dark',
    background: {
      type: 'gradient',
      chromeOpacity: 0.4,
      gradient: {
        ...DEFAULT_GRADIENT,
        angle: 160,
        stops: [
          { color: '#1a0033', position: 0 },
          { color: '#3b0a57', position: 45 },
          { color: '#ff2e97', position: 80 },
          { color: '#00e5ff', position: 100 }
        ],
        animation: 'rotate',
        speed: 0.5
      }
    },
    appearance: {
      radius: 6,
      glass: true,
      codeFont: 'Fira Code',
      cursorStyle: 'thick',
      animations: true
    },
    layout: { tabStyle: 'underline', cellStyle: 'accent' }
  },
  {
    id: 'starter-cosmic-workshop',
    name: 'Cosmic Workshop',
    accent: '#b388ff',
    mode: 'dark',
    background: {
      type: 'gradient',
      chromeOpacity: 0.3,
      contentOpacity: 0.9,
      gradient: {
        ...DEFAULT_GRADIENT,
        angle: 90,
        stops: [
          { color: '#0d0221', position: 0 },
          { color: '#241734', position: 50 },
          { color: '#2e2157', position: 100 }
        ],
        animation: 'scroll',
        speed: 0.6,
        scrollSize: 1600
      }
    },
    effects: [
      {
        ...shaderLayer('starter-cosmic-nebula', {
          preset: 'nebula',
          color1: '#0d0221',
          color2: '#b388ff',
          color3: '#4cc9f0',
          speed: 0.5
        }),
        opacity: 0.55,
        blend: 'screen'
      },
      particlesLayer(
        'starter-cosmic-notebook-sparks',
        { color: '#b388ff', count: 40, links: false, size: 1.5 },
        { target: 'notebooks', placement: 'behind', opacity: 0.8 }
      )
    ],
    events: [
      createEventRule({
        id: 'starter-cosmic-confetti',
        name: 'Celebrate runs',
        trigger: 'cell-success',
        action: 'sparkles',
        color1: '#b388ff',
        color2: '#4cc9f0',
        color3: '#ffffff'
      }),
      createEventRule({
        id: 'starter-cosmic-error',
        name: 'Error shake',
        trigger: 'cell-error',
        action: 'shake'
      })
    ],
    appearance: {
      radius: 12,
      floatingPanels: true,
      panelGap: 10,
      shadow: 1.5,
      glass: true,
      uiFont: 'Outfit',
      codeFont: 'JetBrains Mono',
      animations: true
    },
    layout: { tabStyle: 'pill', cellStyle: 'card', scrollbarStyle: 'thin' }
  },
  {
    id: 'starter-ocean-liquid',
    name: 'Ocean Liquid',
    accent: '#1fd1a5',
    mode: 'dark',
    background: { type: 'color', color: '#0f2027', chromeOpacity: 0.3 },
    effects: [
      shaderLayer('starter-ocean-liquid', {
        preset: 'liquid',
        color1: '#0f2027',
        color2: '#1fd1a5',
        color3: '#2c5364',
        speed: 0.6
      })
    ],
    appearance: {
      radius: 14,
      floatingPanels: true,
      panelGap: 12,
      shadow: 2,
      glass: true,
      uiFont: 'Nunito',
      codeFont: 'Source Code Pro'
    },
    layout: { tabStyle: 'pill', cellStyle: 'card', density: 'comfortable' }
  },
  {
    id: 'starter-paper',
    name: 'Paper',
    accent: '#c2410c',
    mode: 'light',
    background: { type: 'color', color: '#efe8dc', chromeOpacity: 0.85 },
    appearance: {
      radius: 4,
      uiFont: 'IBM Plex Sans',
      codeFont: 'IBM Plex Mono'
    },
    layout: {
      tabStyle: 'minimal',
      cellStyle: 'borderless',
      hidePrompts: true,
      notebookMaxWidth: 900,
      density: 'comfortable'
    }
  },
  {
    id: 'starter-cyberpunk-hud',
    name: 'Cyberpunk HUD',
    accent: '#00fff2',
    mode: 'dark',
    background: {
      type: 'gradient',
      chromeOpacity: 0.25,
      gradient: {
        ...DEFAULT_GRADIENT,
        angle: 100,
        stops: [
          { color: '#05010a', position: 0 },
          { color: '#1a0033', position: 55 },
          { color: '#ff2e97', position: 100 }
        ],
        animation: 'scroll',
        speed: 0.4,
        scrollSize: 1400
      }
    },
    effects: [
      {
        ...shaderLayer('starter-cyberpunk-grid', {
          preset: 'grid',
          color1: '#05010a',
          color2: '#00fff2',
          color3: '#ff2e97',
          intensity: 1.1
        }),
        opacity: 0.75,
        blend: 'screen'
      }
    ],
    appearance: {
      radius: 2,
      borderWidth: 1,
      glass: true,
      glassBlur: 10,
      glow: true,
      glowIntensity: 0.9,
      codeFont: 'Fira Code',
      cursorStyle: 'block',
      animations: true
    },
    layout: {
      tabStyle: 'underline',
      cellStyle: 'accent',
      scrollbarStyle: 'thin'
    },
    customCss:
      '.jp-Toolbar, .jp-SideBar .lm-TabBar-tabLabel { text-shadow: 0 0 6px var(--jp-brand-color1); }'
  },
  {
    id: 'starter-windows-98',
    name: 'Windows 98',
    accent: '#000080',
    mode: 'light',
    background: { type: 'color', color: '#008080', chromeOpacity: 1 },
    appearance: {
      radius: 0,
      borderWidth: 2,
      shadow: 0,
      glass: false,
      uiFont: "'MS Sans Serif', Tahoma, sans-serif",
      codeFont: "'Courier New', monospace",
      cursorStyle: 'block',
      animations: false
    },
    layout: {
      tabStyle: 'default',
      cellStyle: 'default',
      density: 'compact',
      scrollbarStyle: 'default'
    },
    // The classic Windows 98 chunky 3D bevel is two nested inset shadows
    // (a light edge and a dark edge on opposite corners); inverted for the
    // pressed/active state. `!important` is needed on the chrome color
    // variables because `ThemeApplier` writes the palette-generated colors
    // inline, which otherwise outrank a plain stylesheet rule.
    customCss: `
:root {
  --jp-layout-color0: #ffffff !important;
  --jp-layout-color1: #c0c0c0 !important;
  --jp-layout-color2: #c0c0c0 !important;
  --jp-layout-color3: #c0c0c0 !important;
  --jp-toolbar-background: #c0c0c0 !important;
  --jp-border-color0: #000000 !important;
  --jp-border-color1: #808080 !important;
  --jp-border-color2: #808080 !important;
}

body {
  font-family: 'MS Sans Serif', Tahoma, sans-serif !important;
}

.jp-Toolbar button.jp-mod-styled,
.jp-neptuneatelier-Button,
.jp-neptuneatelier-Select,
select.jp-mod-styled,
input.jp-mod-styled,
.jp-neptuneatelier-TextInput {
  border-radius: 0 !important;
  border: none !important;
  box-shadow:
    inset -1px -1px 0 #0a0a0a,
    inset 1px 1px 0 #ffffff,
    inset -2px -2px 0 #808080,
    inset 2px 2px 0 #dfdfdf !important;
  background: #c0c0c0 !important;
  color: #000000 !important;
}

.jp-Toolbar button.jp-mod-styled:active,
.jp-neptuneatelier-Button:active {
  box-shadow:
    inset 1px 1px 0 #0a0a0a,
    inset -1px -1px 0 #ffffff,
    inset 2px 2px 0 #808080,
    inset -2px -2px 0 #dfdfdf !important;
}

.lm-TabBar-tab {
  border-radius: 0 !important;
  box-shadow:
    inset -1px -1px 0 #0a0a0a,
    inset 1px 1px 0 #ffffff,
    inset -2px -2px 0 #808080,
    inset 2px 2px 0 #dfdfdf !important;
  background: #c0c0c0 !important;
}

#jp-top-panel {
  background: linear-gradient(90deg, #000080, #1084d0) !important;
  border-bottom: 2px solid #ffffff;
}

#jp-top-panel,
#jp-top-panel * {
  color: #ffffff !important;
}

::-webkit-scrollbar {
  width: 16px;
  height: 16px;
}

::-webkit-scrollbar-track {
  background: #c0c0c0;
}

::-webkit-scrollbar-thumb {
  background: #c0c0c0;
  box-shadow:
    inset -1px -1px 0 #0a0a0a,
    inset 1px 1px 0 #ffffff,
    inset -2px -2px 0 #808080,
    inset 2px 2px 0 #dfdfdf;
}
`.trim()
  },
  {
    id: 'starter-windows-7',
    name: 'Windows 7',
    accent: '#3a8dde',
    mode: 'light',
    background: {
      type: 'gradient',
      chromeOpacity: 0.55,
      gradient: {
        ...DEFAULT_GRADIENT,
        angle: 135,
        stops: [
          { color: '#0f3a63', position: 0 },
          { color: '#2989d8', position: 55 },
          { color: '#8ec9f0', position: 100 }
        ]
      }
    },
    appearance: {
      radius: 8,
      borderWidth: 1,
      shadow: 2,
      glass: true,
      glassBlur: 16,
      uiFont: "'Segoe UI', Tahoma, sans-serif",
      codeFont: "'Consolas', 'Courier New', monospace",
      animations: true
    },
    layout: {
      tabStyle: 'default',
      cellStyle: 'card',
      scrollbarStyle: 'default'
    },
    // Aero glass: a glossy top highlight over a blue-tinted translucent
    // chrome, rounded "glass" window edges.
    customCss: `
#jp-top-panel {
  background: linear-gradient(
    180deg,
    rgb(255 255 255 / 55%) 0%,
    rgb(120 180 235 / 45%) 8%,
    rgb(40 110 190 / 55%) 100%
  ) !important;
  border-bottom: 1px solid rgb(255 255 255 / 60%);
  box-shadow: 0 1px 0 rgb(255 255 255 / 40%) inset;
}

.jp-Toolbar button.jp-mod-styled,
.jp-neptuneatelier-Button {
  border-radius: 4px !important;
  border: 1px solid rgb(58 141 222 / 40%) !important;
  background: linear-gradient(
    180deg,
    rgb(255 255 255 / 90%) 0%,
    rgb(222 238 252 / 80%) 100%
  ) !important;
}

.jp-Toolbar button.jp-mod-styled:hover,
.jp-neptuneatelier-Button:hover {
  background: linear-gradient(
    180deg,
    rgb(255 255 255 / 95%) 0%,
    rgb(200 228 252 / 90%) 100%
  ) !important;
  box-shadow: 0 0 6px rgb(58 141 222 / 60%);
}
`.trim()
  },
  {
    id: 'starter-windows-10',
    name: 'Windows 10',
    accent: '#0078d7',
    mode: 'light',
    background: { type: 'color', color: '#f3f3f3', chromeOpacity: 1 },
    appearance: {
      radius: 0,
      borderWidth: 1,
      shadow: 0,
      glass: false,
      uiFont: "'Segoe UI', Tahoma, sans-serif",
      codeFont: "'Cascadia Code', Consolas, monospace",
      animations: true
    },
    layout: {
      tabStyle: 'default',
      cellStyle: 'default',
      scrollbarStyle: 'thin'
    },
    // Flat, solid, modern chrome — no gradients or bevels, just a solid
    // accent-colored title bar and thin flat borders.
    customCss: `
#jp-top-panel {
  background: var(--jp-brand-color1) !important;
  border-bottom: none;
}

#jp-top-panel,
#jp-top-panel * {
  color: #ffffff !important;
}

.jp-Toolbar button.jp-mod-styled,
.jp-neptuneatelier-Button {
  border-radius: 0 !important;
  border: 1px solid var(--jp-border-color1) !important;
  background: #ffffff !important;
}

.jp-Toolbar button.jp-mod-styled:hover,
.jp-neptuneatelier-Button:hover {
  background: var(--jp-brand-color1) !important;
  color: #ffffff !important;
}
`.trim()
  },
  {
    id: 'starter-hacker-terminal',
    name: 'Hacker Terminal',
    accent: '#00ff41',
    mode: 'dark',
    background: { type: 'color', color: '#000000', chromeOpacity: 0.2 },
    effects: [
      {
        ...shaderLayer('starter-hacker-rain', {
          preset: 'rain',
          color1: '#000000',
          color2: '#00ff41',
          color3: '#00b32d',
          intensity: 0.9
        }),
        opacity: 0.5,
        blend: 'screen'
      }
    ],
    events: [
      createEventRule({
        id: 'starter-hacker-welcome',
        name: 'System ready',
        trigger: 'startup',
        action: 'typing-animation',
        location: 'center',
        color1: '#00ff41',
        text: 'SYSTEM READY_'
      })
    ],
    appearance: {
      radius: 0,
      borderWidth: 1,
      shadow: 0,
      uiFont: 'VT323',
      codeFont: 'VT323',
      cursorStyle: 'block',
      animations: true
    },
    layout: {
      tabStyle: 'default',
      cellStyle: 'borderless',
      density: 'compact'
    },
    customCss: `
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgb(0 0 0 / 15%) 0px,
    rgb(0 0 0 / 15%) 1px,
    transparent 1px,
    transparent 3px
  );
  animation: jp-neptuneatelier-crt-flicker 6s infinite;
}

@keyframes jp-neptuneatelier-crt-flicker {
  0%, 96%, 100% { opacity: 1; }
  97% { opacity: 0.85; }
  98% { opacity: 1; }
}
`.trim()
  },
  {
    id: 'starter-glassmorphism',
    name: 'Glassmorphism',
    accent: '#8ab4ff',
    mode: 'light',
    background: {
      type: 'gradient',
      chromeOpacity: 0.15,
      contentOpacity: 0.85,
      gradient: {
        ...DEFAULT_GRADIENT,
        kind: 'radial',
        stops: [
          { color: '#a1c4fd', position: 0 },
          { color: '#c2e9fb', position: 50 },
          { color: '#fbc2eb', position: 100 }
        ],
        animation: 'rotate',
        speed: 0.3
      }
    },
    appearance: {
      radius: 18,
      floatingPanels: true,
      panelGap: 14,
      shadow: 1.5,
      glass: true,
      glassBlur: 22,
      uiFont: 'Poppins',
      codeFont: 'JetBrains Mono',
      animations: true
    },
    layout: { tabStyle: 'pill', cellStyle: 'card', density: 'comfortable' }
  },
  {
    id: 'starter-vaporwave',
    name: 'Vaporwave',
    accent: '#ff71ce',
    mode: 'dark',
    background: {
      type: 'gradient',
      chromeOpacity: 0.3,
      gradient: {
        ...DEFAULT_GRADIENT,
        angle: 135,
        stops: [
          { color: '#1a0b2e', position: 0 },
          { color: '#ff71ce', position: 55 },
          { color: '#01cdfe', position: 100 }
        ]
      }
    },
    effects: [
      {
        ...shaderLayer('starter-vaporwave-grid', {
          preset: 'grid',
          color1: '#1a0b2e',
          color2: '#ff71ce',
          color3: '#01cdfe'
        }),
        opacity: 0.85
      }
    ],
    appearance: {
      radius: 0,
      borderWidth: 1,
      codeFont: 'Space Mono',
      cursorStyle: 'block',
      animations: true
    },
    layout: { tabStyle: 'underline', cellStyle: 'accent' },
    customCss:
      '.jp-SideBar .lm-TabBar-tabLabel, #jp-top-panel { text-shadow: 2px 0 #01cdfe, -2px 0 #ff71ce; }'
  },
  {
    id: 'starter-brutalist-web',
    name: 'Brutalist Web',
    accent: '#000000',
    mode: 'light',
    background: { type: 'color', color: '#ffffff', chromeOpacity: 1 },
    appearance: {
      radius: 0,
      borderWidth: 3,
      shadow: 0,
      glass: false,
      uiFont: 'System',
      uiFontSize: 17,
      codeFont: 'System monospace',
      codeFontSize: 16,
      animations: false
    },
    layout: {
      tabStyle: 'minimal',
      cellStyle: 'borderless',
      density: 'comfortable'
    },
    customCss: `
.jp-Toolbar button.jp-mod-styled.jp-mod-accept,
.jp-neptuneatelier-Button.jp-mod-accept {
  border: 3px solid #000 !important;
  box-shadow: 4px 4px 0 #000 !important;
  border-radius: 0 !important;
}
`.trim()
  },
  {
    id: 'starter-material-hologram',
    name: 'Material Hologram',
    accent: '#00e5ff',
    mode: 'dark',
    background: {
      type: 'gradient',
      chromeOpacity: 0.2,
      gradient: {
        ...DEFAULT_GRADIENT,
        angle: 120,
        stops: [
          { color: '#050b14', position: 0 },
          { color: '#0d2b3e', position: 50 },
          { color: '#00e5ff', position: 100 }
        ],
        animation: 'scroll',
        speed: 0.3,
        scrollSize: 1800
      }
    },
    effects: [
      {
        ...shaderLayer('starter-hologram-liquid', {
          preset: 'liquid',
          color1: '#050b14',
          color2: '#00e5ff',
          color3: '#b388ff',
          speed: 0.4
        }),
        opacity: 0.45,
        blend: 'screen'
      }
    ],
    appearance: {
      radius: 16,
      floatingPanels: true,
      panelGap: 10,
      shadow: 1.5,
      glass: true,
      glassBlur: 18,
      glow: true,
      glowIntensity: 0.7,
      uiFont: 'Space Grotesk',
      codeFont: 'IBM Plex Mono',
      animations: true
    },
    layout: { tabStyle: 'pill', cellStyle: 'card', scrollbarStyle: 'thin' }
  },
  {
    id: 'starter-everything-is-alive',
    name: 'Everything Is Alive',
    accent: '#ff6b6b',
    mode: 'dark',
    background: {
      type: 'gradient',
      chromeOpacity: 0.3,
      gradient: {
        ...DEFAULT_GRADIENT,
        kind: 'radial',
        stops: [
          { color: '#2b0b3a', position: 0 },
          { color: '#ff6b6b', position: 55 },
          { color: '#ffd166', position: 100 }
        ],
        animation: 'rotate',
        speed: 0.35
      }
    },
    events: [
      createEventRule({
        id: 'starter-alive-typing-sparkle',
        name: 'Power mode',
        trigger: 'typing',
        action: 'sparkles',
        size: 0.4,
        color1: '#ff6b6b',
        color2: '#ffd166',
        color3: '#ffffff'
      }),
      createEventRule({
        id: 'starter-alive-run-glow',
        name: 'Run glow',
        trigger: 'cell-success',
        action: 'glow',
        color1: '#ff6b6b'
      })
    ],
    appearance: {
      radius: 14,
      floatingPanels: true,
      panelGap: 10,
      shadow: 1.5,
      glow: true,
      glowIntensity: 0.6,
      animations: true
    },
    layout: { tabStyle: 'pill', cellStyle: 'card' },
    customCss: `
.jp-RenderedHTMLCommon a {
  background-image: linear-gradient(currentcolor, currentcolor);
  background-position: 0 100%;
  background-repeat: no-repeat;
  background-size: 0% 2px;
  transition: background-size 200ms ease;
}

.jp-RenderedHTMLCommon a:hover {
  background-size: 100% 2px;
}
`.trim()
  }
];

/** Full presets for the built-in starter themes. */
export const STARTER_PRESETS: IThemePreset[] = SPECS.map(spec => ({
  id: spec.id,
  name: spec.name,
  createdAt: '',
  config: {
    qol: DEFAULT_QOL_CONFIG,
    colors: generatePalette(spec.accent, spec.mode),
    background: { ...DEFAULT_BACKGROUND_CONFIG, ...spec.background },
    appearance: {
      ...DEFAULT_APPEARANCE_CONFIG,
      ...spec.appearance,
      baseTheme: spec.mode
    },
    layout: { ...DEFAULT_LAYOUT_CONFIG, ...spec.layout },
    effects: spec.effects ?? [],
    events: spec.events ?? [],
    customCss: spec.customCss ?? ''
  }
}));
