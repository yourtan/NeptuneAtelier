import { JupyterFrontEnd } from '@jupyterlab/application';
import { NotebookActions } from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IDisposable } from '@lumino/disposable';
import { normalizeBranding } from './config-normalizers';
import { IBrandingConfig, IImageStore } from './types';

/** How often the favicon frame swaps while a cell is running. */
const PULSE_INTERVAL_MS = 500;
const PULSE_COLORS = ['#4cc9f0', '#7a5cff'];

/**
 * Favicon (custom or pulsing while a notebook cell runs) and an optional
 * loading splash screen shown until JupyterLab finishes restoring.
 */
export class BrandingApplier implements IDisposable {
  constructor(
    app: JupyterFrontEnd,
    settings: ISettingRegistry.ISettings,
    images: IImageStore
  ) {
    this._settings = settings;
    this._images = images;
    this._favicon = this._findOrCreateFaviconLink();
    this._defaultFaviconHref = this._favicon.href;
    this._settings.changed.connect(this._onSettingsChanged, this);
    void this._onSettingsChanged();
    NotebookActions.executionScheduled.connect(
      this._onExecutionScheduled,
      this
    );
    NotebookActions.executed.connect(this._onExecuted, this);
    void app.restored.then(() => this._dismissSplash());
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
    NotebookActions.executionScheduled.disconnect(
      this._onExecutionScheduled,
      this
    );
    NotebookActions.executed.disconnect(this._onExecuted, this);
    this._stopPulse();
    this._splash?.remove();
  }

  private _findOrCreateFaviconLink(): HTMLLinkElement {
    const existing =
      document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (existing) {
      return existing;
    }
    const link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
    return link;
  }

  private async _onSettingsChanged(): Promise<void> {
    this._config = normalizeBranding(this._settings.get('branding').composite);
    await this._applyFavicon();
    this._applySplash();
  }

  private async _applyFavicon(): Promise<void> {
    if (this._pulseTimer !== null) {
      // Mid-pulse: the pulse loop will pick up the new base state itself.
      return;
    }
    if (!this._config.faviconRef) {
      this._favicon.href = this._defaultFaviconHref;
      return;
    }
    const dataUrl = await this._images.fetchImage(this._config.faviconRef);
    if (dataUrl) {
      this._favicon.href = dataUrl;
    }
  }

  private _applySplash(): void {
    if (!this._config.splashEnabled || this._splashDismissed) {
      this._splash?.remove();
      this._splash = null;
      return;
    }
    if (!this._splash) {
      this._splash = document.createElement('div');
      this._splash.className = 'jp-neptuneatelier-Splash';
      const label = document.createElement('div');
      label.className = 'jp-neptuneatelier-SplashText';
      this._splash.appendChild(label);
      document.body.appendChild(this._splash);
    }
    this._splash.style.background = this._config.splashColor;
    const label = this._splash.querySelector('.jp-neptuneatelier-SplashText');
    if (label) {
      label.textContent = this._config.splashText;
    }
  }

  private _dismissSplash(): void {
    this._splashDismissed = true;
    const splash = this._splash;
    if (!splash) {
      return;
    }
    splash.classList.add('jp-neptuneatelier-mod-fadeout');
    window.setTimeout(() => splash.remove(), 400);
    this._splash = null;
  }

  private _onExecutionScheduled = (): void => {
    this._busyCount += 1;
    if (this._config.animatedFavicon) {
      this._startPulse();
    }
  };

  private _onExecuted = (): void => {
    this._busyCount = Math.max(0, this._busyCount - 1);
    if (this._busyCount === 0) {
      this._stopPulse();
    }
  };

  private _startPulse(): void {
    if (this._pulseTimer !== null) {
      return;
    }
    let frame = 0;
    this._pulseTimer = window.setInterval(() => {
      frame = (frame + 1) % PULSE_COLORS.length;
      this._favicon.href = this._pulseFrame(PULSE_COLORS[frame]);
    }, PULSE_INTERVAL_MS);
  }

  private _stopPulse(): void {
    if (this._pulseTimer !== null) {
      window.clearInterval(this._pulseTimer);
      this._pulseTimer = null;
    }
    void this._applyFavicon();
  }

  private _pulseFrame(color: string): string {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return this._defaultFaviconHref;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(8, 8, 7, 0, Math.PI * 2);
    ctx.fill();
    return canvas.toDataURL('image/png');
  }

  private _settings: ISettingRegistry.ISettings;
  private _images: IImageStore;
  private _favicon: HTMLLinkElement;
  private _defaultFaviconHref: string;
  private _config: IBrandingConfig = normalizeBranding(undefined);
  private _splash: HTMLDivElement | null = null;
  private _splashDismissed = false;
  private _busyCount = 0;
  private _pulseTimer: number | null = null;
  private _isDisposed = false;
}
