import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { readThemeConfig } from './config-normalizers';
import { writeThemeConfig } from './presets';
import { IThemeConfig } from './types';

/** Changes closer together than this collapse into one undo step, so a
 * slider drag is undone in one go. */
const SETTLE_MS = 600;
const MAX_ENTRIES = 100;

/**
 * In-memory undo/redo history of the full theme configuration for the
 * current session.
 */
export class ThemeHistory implements IDisposable {
  constructor(settings: ISettingRegistry.ISettings) {
    this._settings = settings;
    const initial = readThemeConfig(settings);
    this._entries = [initial];
    this._serialized = [JSON.stringify(initial)];
    this._settings.changed.connect(this._onSettingsChanged, this);
  }

  /** Emits whenever undo/redo availability may have changed. */
  get changed(): ISignal<this, void> {
    return this._changed;
  }

  get canUndo(): boolean {
    return this._index > 0;
  }

  get canRedo(): boolean {
    return this._index < this._entries.length - 1;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    window.clearTimeout(this._timer);
    this._settings.changed.disconnect(this._onSettingsChanged, this);
    Signal.clearData(this);
  }

  async undo(): Promise<void> {
    this._record();
    if (this.canUndo) {
      await this._restore(this._index - 1);
    }
  }

  async redo(): Promise<void> {
    if (this.canRedo) {
      await this._restore(this._index + 1);
    }
  }

  private async _restore(index: number): Promise<void> {
    this._index = index;
    this._restoring = true;
    try {
      await writeThemeConfig(this._settings, this._entries[index]);
    } finally {
      this._restoring = false;
      window.clearTimeout(this._timer);
      this._changed.emit();
    }
  }

  private _onSettingsChanged(): void {
    if (this._restoring) {
      return;
    }
    window.clearTimeout(this._timer);
    this._timer = window.setTimeout(() => this._record(), SETTLE_MS);
  }

  /** Captures the current config as a new entry if it differs from the
   * current one, discarding any redo branch. */
  private _record(): void {
    window.clearTimeout(this._timer);
    const config = readThemeConfig(this._settings);
    const serialized = JSON.stringify(config);
    if (serialized === this._serialized[this._index]) {
      return;
    }
    this._entries = this._entries.slice(0, this._index + 1);
    this._serialized = this._serialized.slice(0, this._index + 1);
    this._entries.push(config);
    this._serialized.push(serialized);
    if (this._entries.length > MAX_ENTRIES) {
      this._entries.shift();
      this._serialized.shift();
    }
    this._index = this._entries.length - 1;
    this._changed.emit();
  }

  private _settings: ISettingRegistry.ISettings;
  private _entries: IThemeConfig[];
  private _serialized: string[];
  private _index = 0;
  private _timer = 0;
  private _restoring = false;
  private _changed = new Signal<this, void>(this);
  private _isDisposed = false;
}
