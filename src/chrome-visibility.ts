import { JupyterFrontEnd } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { Widget } from '@lumino/widgets';
import { normalizeLayout } from './config-normalizers';
import { ILayoutConfig } from './types';

interface IChromeToggle {
  key: 'hideStatusBar' | 'hideLeftActivityBar' | 'hideRightActivityBar';
  command: string;
  args: ReadonlyPartialJSONObject;
}

/** Chrome whose visibility JupyterLab itself exposes as toggle commands. */
const TOGGLES: IChromeToggle[] = [
  { key: 'hideStatusBar', command: 'statusbar:toggle', args: {} },
  {
    key: 'hideLeftActivityBar',
    command: 'application:toggle-side-tabbar',
    args: { side: 'left' }
  },
  {
    key: 'hideRightActivityBar',
    command: 'application:toggle-side-tabbar',
    args: { side: 'right' }
  }
];

const HIDE_HEADER_CLASS = 'jp-neptuneatelier-hide-header';

/**
 * Shows or hides JupyterLab chrome per the layout settings.
 *
 * The status bar and activity bars are driven through JupyterLab's own
 * toggle commands (only executed when their current state differs), so
 * the shell stays consistent with the View menu. A setting is only pushed
 * when it changes, or at startup when it asks to hide something, so manual
 * View-menu changes aren't reverted every time any other setting changes.
 *
 * JupyterLab's header toggle only works in single-document mode, so the
 * header is instead collapsed via CSS, followed by a shell re-layout so
 * the freed space is reclaimed.
 */
export class ChromeVisibility implements IDisposable {
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
    document.body.classList.remove(HIDE_HEADER_CLASS);
  }

  private _sync(): void {
    if (!this._ready) {
      return;
    }
    const layout = normalizeLayout(this._settings.get('layout').composite);
    const previous = this._previous;
    this._previous = layout;

    if (!previous || previous.hideHeader !== layout.hideHeader) {
      document.body.classList.toggle(HIDE_HEADER_CLASS, layout.hideHeader);
      if (this._app.shell instanceof Widget) {
        this._app.shell.fit();
      }
    }

    for (const toggle of TOGGLES) {
      const hide = layout[toggle.key];
      const changed = previous ? previous[toggle.key] !== hide : hide;
      if (changed) {
        this._ensureShown(toggle, !hide);
      }
    }
  }

  private _ensureShown(toggle: IChromeToggle, shown: boolean): void {
    const commands = this._app.commands;
    if (!commands.hasCommand(toggle.command)) {
      return;
    }
    if (commands.isToggled(toggle.command, toggle.args) !== shown) {
      commands.execute(toggle.command, toggle.args).catch(error => {
        console.warn(`neptuneatelier: could not run ${toggle.command}`, error);
      });
    }
  }

  private _app: JupyterFrontEnd;
  private _settings: ISettingRegistry.ISettings;
  private _previous: ILayoutConfig | null = null;
  private _ready = false;
  private _isDisposed = false;
}
