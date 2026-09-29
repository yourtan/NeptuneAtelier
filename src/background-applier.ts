import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStateDB } from '@jupyterlab/statedb';
import { IDisposable } from '@lumino/disposable';
import { normalizeBackground } from './config-normalizers';
import { gradientMotion, gradientToCss } from './gradient';
import { noiseTextureDataUrl } from './noise-texture';
import { IBackgroundConfig, IImageStore } from './types';

const STATE_DB_NAMESPACE = 'neptuneatelier:background-image';

const MOTION_CLASSES = {
  spin: 'jp-neptuneatelier-mod-spin',
  drift: 'jp-neptuneatelier-mod-drift',
  scroll: 'jp-neptuneatelier-mod-scroll'
};

/** Maps `BackgroundImageFit` onto the CSS `background-size` it needs. */
const IMAGE_FIT_CSS: Record<IBackgroundConfig['imageFit'], string> = {
  cover: 'cover',
  contain: 'contain',
  stretch: '100% 100%',
  tile: 'auto'
};

/**
 * Owns a fixed, full-viewport layer behind JupyterLab's chrome and paints
 * the base background into it: a solid color, an (optionally animated)
 * gradient, or a stored image. Effect layers (particles, shaders) are
 * stacked into the same layer by `EffectsApplier`, via `host`.
 *
 * The base is drawn on an inner "paint" element, oversized by twice the
 * blur radius on every side: a CSS blur fades edges toward transparent,
 * so without the oversize the screen edges would show a white halo.
 *
 * Making the chrome translucent so the layer shows through is
 * `ThemeApplier`'s job, since it is the single writer of the `--jp-*`
 * variables involved.
 */
export class BackgroundApplier implements IDisposable, IImageStore {
  constructor(settings: ISettingRegistry.ISettings, stateDB: IStateDB) {
    this._settings = settings;
    this._stateDB = stateDB;
    this._host = document.createElement('div');
    this._host.className = 'jp-neptuneatelier-BackgroundLayer';
    this._paint = document.createElement('div');
    this._paint.className = 'jp-neptuneatelier-BackgroundPaint';
    this._host.appendChild(this._paint);
    this._noise = document.createElement('div');
    this._noise.className = 'jp-neptuneatelier-BackgroundNoise';
    this._noise.style.backgroundImage = `url("${noiseTextureDataUrl()}")`;
    this._host.appendChild(this._noise);
    this._vignette = document.createElement('div');
    this._vignette.className = 'jp-neptuneatelier-BackgroundVignette';
    this._host.appendChild(this._vignette);
    document.body.insertBefore(this._host, document.body.firstChild);
    this._settings.changed.connect(this._onSettingsChanged, this);
    void this._onSettingsChanged();
  }

  /** The full-viewport layer, for global effect layers to render into. */
  get host(): HTMLElement {
    return this._host;
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
    this._host.remove();
  }

  /**
   * Stores an image data URL under a reference key.
   * @param ref - reference key to store the image under
   * @param dataUrl - the image, as a data URL
   */
  async storeImage(ref: string, dataUrl: string): Promise<void> {
    await this._stateDB.save(`${STATE_DB_NAMESPACE}:${ref}`, dataUrl);
    this._imageCache.set(ref, dataUrl);
  }

  /**
   * Retrieves a stored image data URL by reference key.
   * @param ref - reference key the image was stored under
   */
  async fetchImage(ref: string): Promise<string | undefined> {
    const cached = this._imageCache.get(ref);
    if (cached) {
      return cached;
    }
    const value = await this._stateDB.fetch(`${STATE_DB_NAMESPACE}:${ref}`);
    if (typeof value === 'string') {
      this._imageCache.set(ref, value);
      return value;
    }
    return undefined;
  }

  /**
   * Paints the base layer per the given background configuration.
   * @param background - the background configuration to apply
   */
  async apply(background: IBackgroundConfig): Promise<void> {
    const generation = ++this._generation;
    const paint = this._paint.style;

    this._host.style.opacity = String(background.opacity);
    this._noise.style.opacity = String(background.noise * 0.3);
    this._vignette.style.opacity = String(background.vignette);
    paint.inset = background.blur > 0 ? `${-background.blur * 2}px` : '0';
    paint.filter = background.blur > 0 ? `blur(${background.blur}px)` : '';
    paint.backgroundColor = '';
    paint.backgroundImage = '';
    paint.backgroundPosition = '';
    paint.backgroundSize = '';
    paint.backgroundRepeat = '';
    paint.transform = '';
    paint.transformOrigin = '';
    paint.setProperty(
      '--jp-neptuneatelier-gradient-duration',
      `${(30 / background.gradient.speed).toFixed(2)}s`
    );
    this._paint.classList.remove(...Object.values(MOTION_CLASSES));

    switch (background.type) {
      case 'none':
        return;
      case 'color':
        paint.backgroundColor = background.color;
        return;
      case 'gradient': {
        const motion = gradientMotion(background.gradient);
        paint.backgroundImage = gradientToCss(background.gradient, true);
        if (motion !== 'static') {
          this._paint.classList.add(MOTION_CLASSES[motion]);
        }
        return;
      }
      case 'image': {
        const dataUrl = background.imageRef
          ? await this.fetchImage(background.imageRef)
          : undefined;
        if (generation !== this._generation) {
          return;
        }
        if (dataUrl) {
          paint.backgroundImage = `url("${dataUrl}")`;
          paint.backgroundPosition = `${background.imagePositionX}% ${background.imagePositionY}%`;
          paint.backgroundSize = IMAGE_FIT_CSS[background.imageFit];
          paint.backgroundRepeat =
            background.imageFit === 'tile' ? 'repeat' : 'no-repeat';
          if (background.imageZoom !== 1) {
            paint.transform = `scale(${background.imageZoom})`;
            paint.transformOrigin = `${background.imagePositionX}% ${background.imagePositionY}%`;
          }
        } else if (background.imageRef) {
          console.warn(
            `neptuneatelier: no stored image found for reference "${background.imageRef}"`
          );
        }
        return;
      }
    }
  }

  private async _onSettingsChanged(): Promise<void> {
    await this.apply(
      normalizeBackground(this._settings.get('background').composite)
    );
  }

  private _settings: ISettingRegistry.ISettings;
  private _stateDB: IStateDB;
  private _host: HTMLDivElement;
  private _paint: HTMLDivElement;
  private _noise: HTMLDivElement;
  private _vignette: HTMLDivElement;
  private _generation = 0;
  private _imageCache = new Map<string, string>();
  private _isDisposed = false;
}
