import { IThemeManager } from '@jupyterlab/apputils';
import { ITerminal, ITerminalTracker } from '@jupyterlab/terminal';
import { IDisposable } from '@lumino/disposable';
import { parseColor } from './color-values';
import { ThemeApplier } from './theme-applier';

/** The parts of an xterm.js `Terminal` this class touches. */
interface IXterm {
  options: {
    allowTransparency?: boolean;
    theme?: Record<string, unknown>;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * The xterm.js instance behind a JupyterLab terminal widget, or null.
 *
 * JupyterLab keeps it in the private `_term` field and exposes no API for
 * transparency, so this is read defensively: if a future JupyterLab
 * renames or reshapes it, terminals simply stay opaque.
 */
function xtermOf(terminal: ITerminal.ITerminal): IXterm | null {
  const candidate: unknown = isRecord(terminal) ? terminal['_term'] : null;
  return isRecord(candidate) && isRecord(candidate.options)
    ? (candidate as unknown as IXterm)
    : null;
}

/**
 * Resolves once a terminal's xterm instance exists. `ready` is only on
 * JupyterLab's concrete terminal class, not the public interface.
 */
function whenReady(terminal: ITerminal.ITerminal): Promise<void> {
  const ready: unknown = 'ready' in terminal ? terminal.ready : undefined;
  return ready instanceof Promise
    ? ready.then(() => undefined)
    : Promise.resolve();
}

/** Delay after a theme change, letting JupyterLab re-theme terminals first. */
const RETHEME_DELAY_MS = 300;

/**
 * Applies the "window opacity" setting to terminals. They draw on a canvas
 * with a background from their own theme, so the CSS translucency that
 * covers every other window doesn't reach them. This enables xterm.js's
 * transparency and gives it a translucent background of the same color.
 */
export class TerminalTransparency implements IDisposable {
  constructor(
    tracker: ITerminalTracker,
    themeApplier: ThemeApplier,
    themeManager: IThemeManager | null
  ) {
    this._tracker = tracker;
    this._themeApplier = themeApplier;
    this._themeManager = themeManager;
    this._themeApplier.applied.connect(this._applyAll, this);
    this._tracker.widgetAdded.connect(this._onWidgetAdded, this);
    this._themeManager?.themeChanged.connect(this._onThemeChanged, this);
    this._applyAll();
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._themeApplier.applied.disconnect(this._applyAll, this);
    this._tracker.widgetAdded.disconnect(this._onWidgetAdded, this);
    this._themeManager?.themeChanged.disconnect(this._onThemeChanged, this);
    window.clearTimeout(this._rethemeTimer);
  }

  private _applyAll(): void {
    this._tracker.forEach(widget => this._applyTo(widget.content));
  }

  private _onWidgetAdded(
    _: ITerminalTracker,
    widget: { content: ITerminal.ITerminal }
  ): void {
    this._applyTo(widget.content);
  }

  private _onThemeChanged(): void {
    // JupyterLab rewrites each terminal's theme on theme change, which
    // replaces the translucent background; re-apply after it has.
    window.clearTimeout(this._rethemeTimer);
    this._rethemeTimer = window.setTimeout(
      () => this._applyAll(),
      RETHEME_DELAY_MS
    );
  }

  private _applyTo(terminal: ITerminal.ITerminal): void {
    // The xterm instance only exists once the terminal is ready.
    void whenReady(terminal).then(() => {
      if (this._isDisposed || terminal.isDisposed) {
        return;
      }
      const term = xtermOf(terminal);
      if (!term) {
        return;
      }
      const opacity = this._themeApplier.contentOpacity;
      if (opacity >= 1) {
        if (this._modified.has(term)) {
          this._modified.delete(term);
          term.options.allowTransparency = false;
          // Let JupyterLab rebuild the terminal's own theme.
          terminal.setOption('theme', terminal.getOption('theme'));
        }
        return;
      }
      const base = parseColor(
        this._themeApplier.effectiveColor('--jp-layout-color0')
      ) ?? { r: 0, g: 0, b: 0, a: 1 };
      term.options.allowTransparency = true;
      term.options.theme = {
        ...term.options.theme,
        background: `rgba(${Math.round(base.r)}, ${Math.round(base.g)}, ${Math.round(base.b)}, ${opacity})`
      };
      this._modified.add(term);
    });
  }

  private _tracker: ITerminalTracker;
  private _themeApplier: ThemeApplier;
  private _themeManager: IThemeManager | null;
  private _modified = new WeakSet<IXterm>();
  private _rethemeTimer = 0;
  private _isDisposed = false;
}
