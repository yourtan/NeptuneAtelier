import { IThemeManager } from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import {
  normalizeAppearance,
  normalizeBackground,
  normalizeColors,
  normalizeEffects
} from './config-normalizers';
import {
  ALL_COLOR_VARIABLES,
  CHROME_VARIABLES,
  CONTENT_VARIABLE
} from './defaults';
import {
  BaseTheme,
  IBackgroundConfig,
  IColorOverrides,
  IEffectLayer
} from './types';

/**
 * Chrome variables that, in JupyterLab's themes, are defined in terms of
 * another variable; if the user overrode the source, follow it.
 */
const CHROME_ALIASES: Record<string, string> = {
  '--jp-toolbar-background': '--jp-layout-color1'
};

/** JupyterLab removes its loading splash 200ms after startup; wait past it. */
const SPLASH_TEARDOWN_MS = 400;

/** Gives up waiting for a requested theme switch to be confirmed. */
const SWITCH_TIMEOUT_MS = 10000;

function translucent(base: string, opacity: number): string {
  const percent = Math.round(opacity * 100);
  if (percent <= 0) {
    return 'transparent';
  }
  if (percent >= 100) {
    return base;
  }
  return `color-mix(in srgb, ${base} ${percent}%, transparent)`;
}

/**
 * Sole owner of this extension's inline color variables on
 * `document.documentElement`.
 *
 * Only colors the user actually overrode are written; everything else is
 * left to the active JupyterLab theme, so light and dark themes both keep
 * working. While a background is active, the chrome surfaces (and
 * optionally the content surface) are made translucent by mixing their
 * effective color with transparency.
 *
 * Each apply first removes exactly the properties it wrote last time, then
 * reads the theme's own values from the computed style. That makes
 * translucency track the theme, and lets the Colors tab show what an
 * un-overridden color currently inherits.
 */
export class ThemeApplier implements IDisposable {
  /**
   * @param settings - this extension's live settings
   * @param themeManager - JupyterLab's theme manager, if available
   * @param restored - resolves once JupyterLab has finished starting up.
   *   Base-theme switching waits for it: JupyterLab's loading splash is
   *   torn down on a timer, and a theme load started in that window makes
   *   it try to remove the splash twice.
   */
  constructor(
    settings: ISettingRegistry.ISettings,
    themeManager: IThemeManager | null,
    restored: Promise<void> = Promise.resolve()
  ) {
    this._settings = settings;
    this._themeManager = themeManager;
    this._settings.changed.connect(this._onSettingsChanged, this);
    this._themeManager?.themeChanged.connect(this._onThemeChanged, this);
    this._onSettingsChanged();
    void restored.then(() => {
      window.setTimeout(() => {
        if (!this._isDisposed) {
          this._startupSettled = true;
          this._onSettingsChanged();
        }
      }, SPLASH_TEARDOWN_MS);
    });
  }

  /** Emits after every apply, e.g. so the UI can refresh inherited values. */
  get applied(): ISignal<this, void> {
    return this._applied;
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
    this._themeManager?.themeChanged.disconnect(this._onThemeChanged, this);
    window.clearTimeout(this._switchTimeout);
    this._clearWritten();
    Signal.clearData(this);
  }

  /**
   * The active theme's own value for a variable, ignoring this extension's
   * overrides, as of the last apply.
   * @param variable - a `--jp-*` custom property name
   */
  themeValue(variable: string): string {
    return this._themeValues.get(variable) ?? '';
  }

  /**
   * A variable's solid color before any translucency: the user's override
   * if set, otherwise the theme's value.
   * @param variable - a `--jp-*` custom property name
   */
  effectiveColor(variable: string): string {
    return this._colors[variable] || this.themeValue(variable);
  }

  /** Opacity currently applied to window content (1 = solid). */
  get contentOpacity(): number {
    return this._contentOpacity;
  }

  /**
   * Writes color overrides and, if something is showing behind the
   * interface, translucency.
   * @param colors - the user's color overrides
   * @param background - the base background configuration
   * @param effects - effect layers; enabled background layers count as a
   *   background, and "behind the content" window layers need translucent
   *   window content to be seen
   */
  apply(
    colors: IColorOverrides,
    background: IBackgroundConfig,
    effects: IEffectLayer[] = []
  ): void {
    const root = document.documentElement.style;
    this._clearWritten();
    this._colors = colors;
    const enabled = effects.filter(layer => layer.enabled);
    // Only make chrome see-through when something is actually behind it;
    // otherwise it would reveal the browser's blank page.
    const chromeActive =
      background.type !== 'none' ||
      enabled.some(layer => layer.target === 'background');
    const contentActive =
      chromeActive ||
      enabled.some(
        layer => layer.target !== 'background' && layer.placement === 'behind'
      );
    this._contentOpacity = contentActive ? background.contentOpacity : 1;

    const computed = getComputedStyle(document.documentElement);
    this._themeValues = new Map(
      ALL_COLOR_VARIABLES.map(variable => [
        variable,
        computed.getPropertyValue(variable).trim()
      ])
    );

    const write = (variable: string, value: string): void => {
      root.setProperty(variable, value);
      this._written.add(variable);
    };
    for (const [variable, color] of Object.entries(colors)) {
      write(variable, color);
    }

    const base = (variable: string): string => {
      const alias = CHROME_ALIASES[variable];
      return (
        colors[variable] ||
        (alias ? colors[alias] : '') ||
        this.themeValue(variable) ||
        'transparent'
      );
    };
    if (chromeActive) {
      for (const variable of CHROME_VARIABLES) {
        write(variable, translucent(base(variable), background.chromeOpacity));
      }
    }
    if (this._contentOpacity < 1) {
      write(
        CONTENT_VARIABLE,
        translucent(base(CONTENT_VARIABLE), this._contentOpacity)
      );
    }
    this._applied.emit();
  }

  private _clearWritten(): void {
    const root = document.documentElement.style;
    for (const variable of this._written) {
      root.removeProperty(variable);
    }
    this._written.clear();
  }

  private _onSettingsChanged(): void {
    this._syncBaseTheme(
      normalizeAppearance(this._settings.get('appearance').composite).baseTheme
    );
    this.apply(
      normalizeColors(this._settings.get('colors').composite),
      normalizeBackground(this._settings.get('background').composite),
      normalizeEffects(this._settings.get('effects').composite)
    );
  }

  /**
   * Switches JupyterLab's built-in theme to the requested brightness, so
   * the many derived variables a palette doesn't override (toolbars,
   * dialogs, prompts, extra syntax tokens) also suit it. Re-entry via the
   * resulting `themeChanged` is a no-op, since the theme then matches.
   */
  private _syncBaseTheme(baseTheme: BaseTheme): void {
    const manager = this._themeManager;
    if (!manager || baseTheme === 'auto' || !this._startupSettled) {
      return;
    }
    const wantLight = baseTheme === 'light';
    const current = manager.theme;
    if (current && manager.isLight(current) === wantLight) {
      return;
    }
    const target = wantLight ? 'JupyterLab Light' : 'JupyterLab Dark';
    // A preset writes several keys in a row, and setTheme() resolves when
    // the theme *setting* is saved, before the theme has actually loaded.
    // Stay "switching" until themeChanged confirms the new theme, or each
    // write would start another load on top of the first.
    if (!manager.themes.includes(target) || this._switchingTo !== null) {
      return;
    }
    this._switchingTo = target;
    window.clearTimeout(this._switchTimeout);
    this._switchTimeout = window.setTimeout(() => {
      this._switchingTo = null;
    }, SWITCH_TIMEOUT_MS);
    manager.setTheme(target).catch(error => {
      console.warn(`neptuneatelier: could not switch to ${target}`, error);
      this._switchingTo = null;
    });
  }

  private _onThemeChanged(): void {
    // The new theme's stylesheet is swapped in around this signal; wait a
    // frame so the computed values read in apply() belong to the new theme.
    requestAnimationFrame(() => {
      if (this._isDisposed) {
        return;
      }
      if (
        this._switchingTo &&
        this._themeManager?.theme === this._switchingTo
      ) {
        this._switchingTo = null;
        window.clearTimeout(this._switchTimeout);
        return this._onSettingsChanged();
      }
      this._respectManualThemeChange();
      this.apply(
        normalizeColors(this._settings.get('colors').composite),
        normalizeBackground(this._settings.get('background').composite),
        normalizeEffects(this._settings.get('effects').composite)
      );
    });
  }

  /**
   * If the user switched JupyterLab's theme themselves (not via this
   * extension) to one that contradicts the base-theme setting, their choice
   * wins: the setting goes back to "auto" instead of switching the theme
   * straight back, which would fight them.
   */
  private _respectManualThemeChange(): void {
    const manager = this._themeManager;
    if (!manager?.theme || !this._startupSettled || this._switchingTo) {
      return;
    }
    const appearance = normalizeAppearance(
      this._settings.get('appearance').composite
    );
    if (appearance.baseTheme === 'auto') {
      return;
    }
    if (manager.isLight(manager.theme) !== (appearance.baseTheme === 'light')) {
      this._settings
        .set('appearance', { ...appearance, baseTheme: 'auto' })
        .catch(error => {
          console.warn('neptuneatelier: could not update base theme', error);
        });
    }
  }

  private _settings: ISettingRegistry.ISettings;
  private _themeManager: IThemeManager | null;
  private _themeValues = new Map<string, string>();
  private _colors: IColorOverrides = {};
  private _contentOpacity = 1;
  private _written = new Set<string>();
  private _switchingTo: string | null = null;
  private _switchTimeout = 0;
  private _startupSettled = false;
  private _applied = new Signal<this, void>(this);
  private _isDisposed = false;
}
