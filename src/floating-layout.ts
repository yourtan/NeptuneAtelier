import { JupyterFrontEnd } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IDisposable } from '@lumino/disposable';
import { BoxLayout, DockLayout, SplitLayout, Widget } from '@lumino/widgets';
import { normalizeAppearance } from './config-normalizers';

type SpacedLayout = BoxLayout | SplitLayout | DockLayout;

/**
 * Shell panels whose layout spacing becomes the gap between floating
 * panels: the shell itself (header / main / status bar), the main row
 * (activity bars / content), both split panels (sidebars / editor area /
 * bottom panel), and the dock (between split editor areas).
 */
const SPACED_PANEL_IDS = [
  'jp-main-content-panel',
  'jp-main-vsplit-panel',
  'jp-main-split-panel',
  'jp-main-dock-panel'
];

function isSpacedLayout(layout: unknown): layout is SpacedLayout {
  return (
    layout instanceof BoxLayout ||
    layout instanceof SplitLayout ||
    layout instanceof DockLayout
  );
}

function* descendants(widget: Widget): IterableIterator<Widget> {
  yield widget;
  for (const child of widget.children()) {
    yield* descendants(child);
  }
}

/**
 * Creates real gaps between JupyterLab's panels for "Floating panels".
 *
 * Gaps come from Lumino's own layout `spacing` (plus padding around the
 * whole shell), so every panel is genuinely resized and keeps its own
 * internal padding — unlike clipping panel edges, which ate into content.
 * The gaps are the split handles, so panels stay resizable by dragging
 * them. Original spacings are remembered and restored when turned off.
 */
export class FloatingLayout implements IDisposable {
  constructor(app: JupyterFrontEnd, settings: ISettingRegistry.ISettings) {
    this._app = app;
    this._settings = settings;
    this._settings.changed.connect(this._sync, this);
    void app.restored.then(() => {
      if (!this._isDisposed) {
        this._ready = true;
        this._sync();
      }
    });
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._settings.changed.disconnect(this._sync, this);
    this._apply(null);
  }

  private _sync(): void {
    if (!this._ready) {
      return;
    }
    const appearance = normalizeAppearance(
      this._settings.get('appearance').composite
    );
    const gap = appearance.floatingPanels ? appearance.panelGap : null;
    if (gap !== this._currentGap) {
      this._apply(gap);
    }
  }

  /** @param gap - gap in px, or null to restore JupyterLab's own spacing */
  private _apply(gap: number | null): void {
    this._currentGap = gap;
    const shell = this._app.shell;
    if (!(shell instanceof Widget)) {
      return;
    }
    const layouts: SpacedLayout[] = [];
    if (isSpacedLayout(shell.layout)) {
      layouts.push(shell.layout);
    }
    for (const widget of descendants(shell)) {
      if (
        SPACED_PANEL_IDS.includes(widget.id) &&
        isSpacedLayout(widget.layout)
      ) {
        layouts.push(widget.layout);
      }
    }
    for (const layout of layouts) {
      if (!this._originalSpacing.has(layout)) {
        this._originalSpacing.set(layout, layout.spacing);
      }
      // Lumino's spacing setter re-lays out the panel itself.
      layout.spacing = gap ?? this._originalSpacing.get(layout) ?? 0;
    }
    // Outer margin: padding on the shell node, which its root layout only
    // picks up when asked to re-measure (fit).
    // No top padding: the shell's first row is JupyterLab's zero-height
    // skip link, so the spacing after it already makes the top gap.
    shell.node.style.padding = gap === null ? '' : `0 ${gap}px ${gap}px`;
    shell.node.style.boxSizing = gap === null ? '' : 'border-box';
    shell.fit();
  }

  private _app: JupyterFrontEnd;
  private _settings: ISettingRegistry.ISettings;
  private _originalSpacing = new Map<SpacedLayout, number>();
  private _currentGap: number | null = null;
  private _ready = false;
  private _isDisposed = false;
}
