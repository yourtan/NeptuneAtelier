import { ILabShell, JupyterFrontEnd } from '@jupyterlab/application';
import { Notification } from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IDisposable } from '@lumino/disposable';
import { Widget } from '@lumino/widgets';
import { normalizeEffects } from './config-normalizers';
import { IEffect } from './effects/animation-loop';
import { EffectTarget, IEffectLayer, IImageStore } from './types';

/** WebGL contexts are a scarce browser resource (often ~16 per page). */
const MAX_SHADER_INSTANCES = 8;
const PULSE_PEAK = 2.5;

export type WindowKind =
  'notebook' | 'terminal' | 'editor' | 'console' | 'other';

/** Classifies a main-area window by the JupyterLab classes it carries. */
export function windowKind(node: HTMLElement): WindowKind {
  if (node.classList.contains('jp-NotebookPanel')) {
    return 'notebook';
  }
  if (node.classList.contains('jp-ConsolePanel')) {
    return 'console';
  }
  if (node.querySelector('.jp-Terminal')) {
    return 'terminal';
  }
  if (node.querySelector('.jp-FileEditor')) {
    return 'editor';
  }
  return 'other';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** The file path of a document window (via its public `context`), or ''. */
export function documentPath(widget: Widget): string {
  const context: unknown = 'context' in widget ? widget.context : undefined;
  return isRecord(context) && typeof context.path === 'string'
    ? context.path
    : '';
}

function normalizePath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, '/')
    .replace(/^(\.\/|\/)+/, '');
}

/**
 * Whether a window matches a layer's target. The `file` target matches a
 * document whose path is `path` or ends with `/path`, so a bare file name
 * works too.
 */
export function matchesTarget(
  target: EffectTarget,
  path: string,
  kind: WindowKind,
  docPath: string
): boolean {
  switch (target) {
    case 'all-windows':
      return true;
    case 'notebooks':
      return kind === 'notebook';
    case 'terminals':
      return kind === 'terminal';
    case 'editors':
      return kind === 'editor';
    case 'consoles':
      return kind === 'console';
    case 'file': {
      const wanted = normalizePath(path);
      const actual = normalizePath(docPath);
      return (
        wanted !== '' && (actual === wanted || actual.endsWith(`/${wanted}`))
      );
    }
    default:
      return false;
  }
}

interface IInstance {
  layer: IEffectLayer;
  container: HTMLDivElement;
  effect: IEffect | null;
  /** Bumped when the instance is replaced, to discard stale async loads. */
  token: number;
}

interface IMount {
  key: string;
  node: HTMLElement;
  layer: IEffectLayer;
}

/**
 * Renders effect layers: into the global background layer, or — for
 * window targets — one instance inside every matching open window,
 * tracking windows as they open, close, and move.
 *
 * Also exposes runtime controls used by event rules (pulse, toggle, show
 * briefly); these don't change saved settings.
 */
export class EffectsApplier implements IDisposable {
  constructor(
    app: JupyterFrontEnd,
    settings: ISettingRegistry.ISettings,
    backgroundHost: HTMLElement,
    labShell: ILabShell | null,
    images: IImageStore
  ) {
    this._app = app;
    this._settings = settings;
    this._backgroundHost = backgroundHost;
    this._labShell = labShell;
    this._images = images;
    this._settings.changed.connect(this._scheduleSync, this);
    this._labShell?.layoutModified.connect(this._scheduleSync, this);
    void app.restored.then(() => this._scheduleSync());
    this._sync();
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /** Current layers (as saved), for UI such as the Events tab. */
  get layers(): IEffectLayer[] {
    return normalizeEffects(this._settings.get('effects').composite);
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._settings.changed.disconnect(this._scheduleSync, this);
    this._labShell?.layoutModified.disconnect(this._scheduleSync, this);
    window.clearTimeout(this._syncTimer);
    for (const timer of this._briefTimers.values()) {
      window.clearTimeout(timer);
    }
    for (const key of [...this._instances.keys()]) {
      this._removeInstance(key);
    }
  }

  /**
   * Briefly speeds up and brightens layers, easing back over `duration`.
   * @param layerId - one layer's id, or '' for every layer
   * @param duration - milliseconds until back to normal
   */
  pulse(layerId: string, duration: number): void {
    const targets = [...this._instances.values()].filter(
      instance => !layerId || instance.layer.id === layerId
    );
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      // Fast attack, smooth release.
      const boost = 1 + (PULSE_PEAK - 1) * Math.pow(1 - t, 2);
      for (const instance of targets) {
        instance.effect?.setBoost(boost);
      }
      if (t < 1 && !this._isDisposed) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  /**
   * Flips a layer on or off for this session (saved settings unchanged).
   * @param layerId - the layer's id, or '' for every layer
   */
  toggle(layerId: string): void {
    for (const layer of this._matchingLayers(layerId)) {
      this._runtimeEnabled.set(layer.id, !this._isEnabled(layer));
    }
    this._sync();
  }

  /**
   * Shows a layer (even if disabled) for a while, then restores it.
   * @param layerId - the layer's id, or '' for every layer
   * @param duration - milliseconds to show it for
   */
  showBriefly(layerId: string, duration: number): void {
    for (const layer of this._matchingLayers(layerId)) {
      window.clearTimeout(this._briefTimers.get(layer.id));
      this._runtimeEnabled.set(layer.id, true);
      this._briefTimers.set(
        layer.id,
        window.setTimeout(() => {
          this._runtimeEnabled.delete(layer.id);
          this._briefTimers.delete(layer.id);
          this._sync();
        }, duration)
      );
    }
    this._sync();
  }

  private _matchingLayers(layerId: string): IEffectLayer[] {
    return this.layers.filter(layer => !layerId || layer.id === layerId);
  }

  private _isEnabled(layer: IEffectLayer): boolean {
    return this._runtimeEnabled.get(layer.id) ?? layer.enabled;
  }

  private _scheduleSync(): void {
    // Settings writes and layout changes arrive in bursts; coalesce them.
    window.clearTimeout(this._syncTimer);
    this._syncTimer = window.setTimeout(() => this._sync(), 50);
  }

  /** Every place each enabled layer should currently be rendering. */
  private _resolveMounts(layers: IEffectLayer[]): IMount[] {
    const windows = [...this._app.shell.widgets('main')];
    const mounts: IMount[] = [];
    for (const layer of layers) {
      if (!this._isEnabled(layer)) {
        continue;
      }
      if (layer.target === 'background') {
        mounts.push({
          key: `${layer.id}@background`,
          node: this._backgroundHost,
          layer
        });
        continue;
      }
      for (const widget of windows) {
        if (
          matchesTarget(
            layer.target,
            layer.path,
            windowKind(widget.node),
            documentPath(widget)
          )
        ) {
          mounts.push({
            key: `${layer.id}@${widget.id}`,
            node: widget.node,
            layer
          });
        }
      }
    }
    return mounts;
  }

  private _sync(): void {
    if (this._isDisposed) {
      return;
    }
    const mounts = this._resolveMounts(this.layers);
    const wanted = new Set(mounts.map(mount => mount.key));
    for (const key of [...this._instances.keys()]) {
      if (!wanted.has(key)) {
        this._removeInstance(key);
      }
    }

    let shaders = 0;
    let skippedShaders = false;
    for (const mount of mounts) {
      if (mount.layer.kind === 'shader') {
        shaders++;
        if (shaders > MAX_SHADER_INSTANCES) {
          skippedShaders = true;
          this._removeInstance(mount.key);
          continue;
        }
      }
      const existing = this._instances.get(mount.key);
      if (existing && existing.layer.kind === mount.layer.kind) {
        const moved =
          existing.layer.placement !== mount.layer.placement ||
          existing.layer.target !== mount.layer.target;
        existing.layer = mount.layer;
        this._styleContainer(existing.container, mount.layer);
        existing.effect?.update(mount.layer);
        if (moved) {
          this._place(existing.container, mount);
        }
      } else {
        this._removeInstance(mount.key);
        this._createInstance(mount);
      }
    }
    this._reorderBackground(mounts);
    if (skippedShaders && !this._warnedShaderLimit) {
      this._warnedShaderLimit = true;
      Notification.warning(
        `Only ${MAX_SHADER_INSTANCES} shader effects can run at once; extra windows won't show one.`,
        { autoClose: 6000 }
      );
    }
  }

  private _styleContainer(
    container: HTMLDivElement,
    layer: IEffectLayer
  ): void {
    container.style.opacity = String(layer.opacity);
    container.style.mixBlendMode = layer.blend;
    container.classList.toggle(
      'jp-neptuneatelier-mod-behind',
      layer.target !== 'background' && layer.placement === 'behind'
    );
  }

  /**
   * Puts a layer's container in its mount: background layers stack in
   * list order above the base paint; window overlays go last (on top of
   * the window's content), window "behind" layers go first.
   */
  private _place(container: HTMLDivElement, mount: IMount): void {
    const behind =
      mount.layer.target !== 'background' && mount.layer.placement === 'behind';
    if (behind) {
      if (mount.node.firstChild !== container) {
        mount.node.insertBefore(container, mount.node.firstChild);
      }
    } else if (mount.node.lastChild !== container) {
      mount.node.appendChild(container);
    }
  }

  /** Keeps background layers stacked in list order (later on top),
   * touching the DOM only when the order actually differs. */
  private _reorderBackground(mounts: IMount[]): void {
    const expected = mounts
      .filter(mount => mount.node === this._backgroundHost)
      .map(mount => this._instances.get(mount.key)?.container)
      .filter((container): container is HTMLDivElement => !!container);
    const current = Array.from(this._backgroundHost.children).filter(child =>
      child.classList.contains('jp-neptuneatelier-EffectLayer')
    );
    if (
      expected.length !== current.length ||
      expected.some((container, i) => container !== current[i])
    ) {
      for (const container of expected) {
        this._backgroundHost.appendChild(container);
      }
    }
  }

  private _createInstance(mount: IMount): void {
    const container = document.createElement('div');
    container.className = 'jp-neptuneatelier-EffectLayer';
    this._styleContainer(container, mount.layer);
    this._place(container, mount);
    const instance: IInstance = {
      layer: mount.layer,
      container,
      effect: null,
      token: ++this._tokens
    };
    this._instances.set(mount.key, instance);
    void this._loadEffect(mount.key, instance);
  }

  private async _loadEffect(key: string, instance: IInstance): Promise<void> {
    try {
      const effect =
        instance.layer.kind === 'particles'
          ? new (await import('./effects/particles-effect')).ParticlesEffect(
              instance.container,
              instance.layer,
              this._images
            )
          : new (await import('./effects/shader-effect')).ShaderEffect(
              instance.container,
              instance.layer
            );
      if (this._instances.get(key)?.token !== instance.token) {
        effect.dispose();
        return;
      }
      instance.effect = effect;
      // Settings may have changed while the effect's code was loading.
      effect.update(instance.layer);
    } catch (error) {
      console.warn('neptuneatelier: effect layer failed to start', error);
      if (!this._warnedFailure) {
        this._warnedFailure = true;
        Notification.warning(
          instance.layer.kind === 'shader'
            ? 'Shader effects need WebGL, which is unavailable in this browser.'
            : 'A particle effect could not start.',
          { autoClose: 6000 }
        );
      }
    }
  }

  private _removeInstance(key: string): void {
    const instance = this._instances.get(key);
    if (!instance) {
      return;
    }
    this._instances.delete(key);
    instance.effect?.dispose();
    instance.container.remove();
  }

  private _app: JupyterFrontEnd;
  private _settings: ISettingRegistry.ISettings;
  private _backgroundHost: HTMLElement;
  private _labShell: ILabShell | null;
  private _images: IImageStore;
  private _instances = new Map<string, IInstance>();
  private _runtimeEnabled = new Map<string, boolean>();
  private _briefTimers = new Map<string, number>();
  private _syncTimer = 0;
  private _tokens = 0;
  private _warnedShaderLimit = false;
  private _warnedFailure = false;
  private _isDisposed = false;
}
