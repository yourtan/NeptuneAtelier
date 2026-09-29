import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { normalizePreset, normalizePresets } from './config-normalizers';
import { generateId } from './ids';
import {
  IExportedPreset,
  IImageStore,
  IThemeConfig,
  IThemePreset,
  THEME_CONFIG_KEYS
} from './types';

/** The URL hash key a shareable preset link is stored under. */
const SHARE_HASH_KEY = 'neptuneatelier-preset';

/**
 * Encodes a preset (without any embedded image, to keep the link short) as
 * a shareable URL: the current page's URL with the preset in the hash.
 * @param preset - the preset to encode
 */
export function toShareLink(preset: IThemePreset): string {
  const shareable: IThemePreset = {
    ...preset,
    config: {
      ...preset.config,
      background: { ...preset.config.background, imageRef: '' }
    }
  };
  const json = JSON.stringify(shareable);
  const base64 = btoa(
    encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_match, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
  );
  // URL-safe base64: '+'/'/' are otherwise ambiguous in a URL, and '='
  // padding isn't needed since we know where the hash ends.
  const encoded = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const url = new URL(window.location.href);
  url.hash = `${SHARE_HASH_KEY}=${encoded}`;
  return url.toString();
}

/**
 * Decodes a preset from the current page's URL hash, if one is present.
 * Returns null if there's no preset link, or it can't be parsed.
 */
export function parseShareLink(): IThemePreset | null {
  const hash = window.location.hash.replace(/^#/, '');
  const prefix = `${SHARE_HASH_KEY}=`;
  if (!hash.startsWith(prefix)) {
    return null;
  }
  const encoded = hash.slice(prefix.length);
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(ch => '%' + ch.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return normalizePreset(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Removes the preset from the URL hash, once it's been handled. */
export function clearShareLink(): void {
  const url = new URL(window.location.href);
  url.hash = '';
  window.history.replaceState(null, '', url.toString());
}

/** A validated preset read from an import file, not yet saved. */
export interface IParsedImport {
  preset: IThemePreset;
  imageData?: string;
}

/**
 * Writes a full theme configuration to live settings, one key at a time.
 * @param settings - this extension's live settings
 * @param config - the configuration to write
 */
export async function writeThemeConfig(
  settings: ISettingRegistry.ISettings,
  config: IThemeConfig
): Promise<void> {
  for (const key of THEME_CONFIG_KEYS) {
    await settings.set(key, config[key]);
  }
}

/**
 * Manages named, saved snapshots of the full theme configuration: save,
 * list, apply, delete, and export/import as JSON files. Exported files
 * embed the background image (if any) so a preset is fully portable.
 */
export class PresetManager {
  constructor(settings: ISettingRegistry.ISettings, images: IImageStore) {
    this._settings = settings;
    this._images = images;
  }

  /** Currently saved presets, normalized; malformed entries are dropped. */
  list(): IThemePreset[] {
    return normalizePresets(this._settings.get('presets').composite);
  }

  /**
   * Saves the given configuration as a new named preset.
   * @param name - display name for the preset
   * @param config - the theme configuration to snapshot
   */
  async save(name: string, config: IThemeConfig): Promise<IThemePreset> {
    const preset: IThemePreset = {
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
      config
    };
    await this._settings.set('presets', [...this.list(), preset]);
    return preset;
  }

  /**
   * Applies a saved preset's configuration to the live settings.
   * @param id - id of the preset to apply
   */
  async apply(id: string): Promise<void> {
    const preset = this.list().find(item => item.id === id);
    if (!preset) {
      console.warn(`neptuneatelier: no preset found with id "${id}"`);
      return;
    }
    await writeThemeConfig(this._settings, preset.config);
  }

  /**
   * Deletes a saved preset.
   * @param id - id of the preset to delete
   */
  async delete(id: string): Promise<void> {
    await this._settings.set(
      'presets',
      this.list().filter(item => item.id !== id)
    );
  }

  /**
   * Builds the exportable form of a preset, embedding its background image.
   * @param id - id of the preset to export
   */
  async toExport(id: string): Promise<IExportedPreset | null> {
    const preset = this.list().find(item => item.id === id);
    if (!preset) {
      return null;
    }
    const exported: IExportedPreset = { ...preset };
    const { imageRef } = preset.config.background;
    if (imageRef) {
      const imageData = await this._images.fetchImage(imageRef);
      if (imageData) {
        exported.imageData = imageData;
      }
    }
    return exported;
  }

  /**
   * Downloads a preset as a JSON file via a temporary object URL.
   * @param id - id of the preset to export
   */
  async export(id: string): Promise<void> {
    const exported = await this.toExport(id);
    if (!exported) {
      console.warn(`neptuneatelier: no preset found with id "${id}"`);
      return;
    }
    const blob = new Blob([JSON.stringify(exported, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${exported.name || 'theme-preset'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Reads and validates an uploaded preset file without saving it, so the
   * caller can confirm anything risky (like custom CSS) first.
   * @param file - the uploaded JSON file
   */
  async parseImport(file: File): Promise<IParsedImport> {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('neptuneatelier: imported file is not valid JSON');
    }
    const preset = normalizePreset(parsed);
    if (!preset) {
      throw new Error(
        'neptuneatelier: imported file is not a valid theme preset'
      );
    }
    const imageData =
      typeof parsed === 'object' &&
      parsed !== null &&
      'imageData' in parsed &&
      typeof parsed.imageData === 'string' &&
      parsed.imageData.startsWith('data:image/')
        ? parsed.imageData
        : undefined;
    return { preset, imageData };
  }

  /**
   * Saves a parsed import under a fresh id (so it never collides with an
   * existing preset), storing its embedded image under a fresh reference.
   * @param parsed - the result of `parseImport`
   */
  async addImported(parsed: IParsedImport): Promise<IThemePreset> {
    const { preset, imageData } = parsed;
    let background = preset.config.background;
    if (imageData) {
      const imageRef = generateId();
      await this._images.storeImage(imageRef, imageData);
      background = { ...background, imageRef };
    }
    const saved: IThemePreset = {
      ...preset,
      id: generateId(),
      config: { ...preset.config, background }
    };
    await this._settings.set('presets', [...this.list(), saved]);
    return saved;
  }

  private _settings: ISettingRegistry.ISettings;
  private _images: IImageStore;
}
