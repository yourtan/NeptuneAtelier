import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IDisposable } from '@lumino/disposable';
import { parseColor } from './color-values';
import { noiseTextureDataUrl } from './noise-texture';
import {
  normalizeAppearance,
  normalizeCustomCss,
  normalizeLayout
} from './config-normalizers';
import {
  CODE_FONT_OPTIONS,
  DEFAULT_APPEARANCE_CONFIG,
  IFontOption,
  UI_FONT_OPTIONS
} from './defaults';
import { IAppearanceConfig, ILayoutConfig } from './types';

const CLASS_PREFIX = 'jp-neptuneatelier-';
const CUSTOM_CSS_ID = 'jp-neptuneatelier-custom-css';
const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2';

interface IResolvedFont {
  stack: string;
  google?: string;
}

/**
 * Resolves a stored font value: a known option's label maps to its full
 * stack (and Google Fonts family); anything else is used as a raw
 * `font-family` value the user typed.
 */
function resolveFont(value: string, options: IFontOption[]): IResolvedFont {
  const option = options.find(item => item.label === value);
  return option
    ? { stack: option.stack, google: option.google }
    : { stack: value };
}

/**
 * Applies the style and layout settings: shape, surfaces, fonts, cursor,
 * motion, density, tabs, cells, notebook width, and scrollbars, plus the
 * user's custom CSS.
 *
 * Values JupyterLab exposes as variables (radius, border width, fonts) are
 * written as inline `--jp-*` properties, and only when they differ from
 * the theme's defaults. Everything else is expressed as `jp-neptuneatelier-*`
 * classes on `<body>` plus this extension's own `--jp-neptuneatelier-*`
 * variables, which the rules in `style/base.css` consume.
 */
export class AppearanceApplier implements IDisposable {
  constructor(settings: ISettingRegistry.ISettings) {
    this._settings = settings;
    this._settings.changed.connect(this._onSettingsChanged, this);
    this._onSettingsChanged();
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._settings.changed.disconnect(this._onSettingsChanged, this);
    this._clear();
    for (const link of this._fontLinks.values()) {
      link.remove();
    }
    this._fontLinks.clear();
    document.getElementById(CUSTOM_CSS_ID)?.remove();
  }

  /**
   * Applies style, layout, and custom CSS.
   * @param appearance - shape, surfaces, fonts, cursor, and motion
   * @param layout - density, tabs, cells, notebook width, and scrollbars
   * @param customCss - raw CSS appended after all other styles
   */
  apply(
    appearance: IAppearanceConfig,
    layout: ILayoutConfig,
    customCss: string
  ): void {
    this._clear();
    const root = document.documentElement.style;
    const setVar = (name: string, value: string): void => {
      root.setProperty(name, value);
      this._written.add(name);
    };
    const addClass = (name: string): void => {
      document.body.classList.add(CLASS_PREFIX + name);
      this._classes.add(CLASS_PREFIX + name);
    };

    // Shape
    if (appearance.radius !== DEFAULT_APPEARANCE_CONFIG.radius) {
      setVar('--jp-border-radius', `${appearance.radius}px`);
    }
    if (appearance.borderWidth !== DEFAULT_APPEARANCE_CONFIG.borderWidth) {
      setVar('--jp-border-width', `${appearance.borderWidth}px`);
    }
    setVar('--jp-neptuneatelier-radius', `${appearance.radius}px`);
    setVar('--jp-neptuneatelier-gap', `${appearance.panelGap}px`);
    setVar(
      '--jp-neptuneatelier-shadow-alpha',
      (appearance.shadow * 0.12).toFixed(2)
    );
    setVar('--jp-neptuneatelier-glass-blur', `${appearance.glassBlur}px`);
    if (appearance.floatingPanels) {
      addClass('floating');
    }
    if (appearance.glass) {
      addClass('glass');
    }
    if (appearance.glow) {
      addClass('glow');
      setVar(
        '--jp-neptuneatelier-glow-alpha',
        String(appearance.glowIntensity)
      );
    }
    if (appearance.borderStyle !== DEFAULT_APPEARANCE_CONFIG.borderStyle) {
      addClass(`border-${appearance.borderStyle}`);
    }
    if (appearance.shadowColor !== DEFAULT_APPEARANCE_CONFIG.shadowColor) {
      const rgb = parseColor(appearance.shadowColor);
      if (rgb) {
        setVar(
          '--jp-neptuneatelier-shadow-rgb',
          `${Math.round(rgb.r)} ${Math.round(rgb.g)} ${Math.round(rgb.b)}`
        );
      }
    }
    if (appearance.acrylicNoise) {
      addClass('acrylic');
      setVar(
        '--jp-neptuneatelier-noise-url',
        `url("${noiseTextureDataUrl()}")`
      );
    }
    if (appearance.gradientHeadings) {
      addClass('gradient-headings');
    }

    // Fonts
    const googleFamilies = new Set<string>();
    if (appearance.uiFont) {
      const font = resolveFont(appearance.uiFont, UI_FONT_OPTIONS);
      setVar('--jp-ui-font-family', font.stack);
      setVar('--jp-content-font-family', font.stack);
      if (font.google) {
        googleFamilies.add(font.google);
      }
    }
    if (appearance.codeFont) {
      const font = resolveFont(appearance.codeFont, CODE_FONT_OPTIONS);
      setVar('--jp-code-font-family', font.stack);
      if (font.google) {
        googleFamilies.add(font.google);
      }
    }
    if (appearance.uiFontSize > 0) {
      const size = appearance.uiFontSize;
      setVar('--jp-ui-font-size0', `${(size * 0.833).toFixed(1)}px`);
      setVar('--jp-ui-font-size1', `${size}px`);
      setVar('--jp-ui-font-size2', `${(size * 1.2).toFixed(1)}px`);
      setVar('--jp-ui-font-size3', `${(size * 1.44).toFixed(1)}px`);
      setVar('--jp-content-font-size1', `${size}px`);
    }
    if (appearance.codeFontSize > 0) {
      setVar('--jp-code-font-size', `${appearance.codeFontSize}px`);
    }
    if (appearance.codeLineHeight > 0) {
      setVar('--jp-code-line-height', String(appearance.codeLineHeight));
    }
    if (!appearance.ligatures) {
      addClass('ligatures-off');
    }
    this._syncGoogleFonts(googleFamilies);

    // Cursor and motion
    if (appearance.cursorStyle !== 'line') {
      addClass(`cursor-${appearance.cursorStyle}`);
    }
    if (appearance.animations) {
      addClass('animations');
    }

    // Layout
    if (layout.density !== 'normal') {
      addClass(`density-${layout.density}`);
    }
    if (layout.tabStyle !== 'default') {
      addClass(`tabs-${layout.tabStyle}`);
    }
    if (layout.hidePrompts) {
      addClass('hide-prompts');
    }
    if (layout.notebookMaxWidth > 0) {
      addClass('notebook-limited');
      setVar(
        '--jp-neptuneatelier-notebook-width',
        `${layout.notebookMaxWidth}px`
      );
    }
    if (layout.cellStyle !== 'default') {
      addClass(`cells-${layout.cellStyle}`);
    }
    if (layout.scrollbarStyle !== 'default') {
      addClass(`scrollbar-${layout.scrollbarStyle}`);
    }
    if (layout.scrollbarColor) {
      addClass('scrollbar-colored');
      setVar('--jp-neptuneatelier-scrollbar-color', layout.scrollbarColor);
    }

    this._applyCustomCss(customCss);
  }

  private _clear(): void {
    const root = document.documentElement.style;
    for (const name of this._written) {
      root.removeProperty(name);
    }
    this._written.clear();
    for (const name of this._classes) {
      document.body.classList.remove(name);
    }
    this._classes.clear();
  }

  /**
   * Adds a `<link>` per Google Fonts family in use and removes unused ones.
   * One link per family keeps a single failing family from blocking others.
   */
  private _syncGoogleFonts(families: Set<string>): void {
    for (const [family, link] of this._fontLinks) {
      if (!families.has(family)) {
        link.remove();
        this._fontLinks.delete(family);
      }
    }
    for (const family of families) {
      if (this._fontLinks.has(family)) {
        continue;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${GOOGLE_FONTS_URL}?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;700&display=swap`;
      document.head.appendChild(link);
      this._fontLinks.set(family, link);
    }
  }

  private _applyCustomCss(css: string): void {
    let style = document.getElementById(CUSTOM_CSS_ID);
    if (!css.trim()) {
      style?.remove();
      return;
    }
    if (!style) {
      style = document.createElement('style');
      style.id = CUSTOM_CSS_ID;
    }
    // Re-append so it stays after any stylesheet loaded since, and wins
    // ties in specificity.
    document.head.appendChild(style);
    style.textContent = css;
  }

  private _onSettingsChanged(): void {
    this.apply(
      normalizeAppearance(this._settings.get('appearance').composite),
      normalizeLayout(this._settings.get('layout').composite),
      normalizeCustomCss(this._settings.get('customCss').composite)
    );
  }

  private _settings: ISettingRegistry.ISettings;
  private _written = new Set<string>();
  private _classes = new Set<string>();
  private _fontLinks = new Map<string, HTMLLinkElement>();
  private _isDisposed = false;
}
