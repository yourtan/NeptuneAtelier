import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { JSONExt, PartialJSONObject } from '@lumino/coreutils';
import { normalizeQol } from './config-normalizers';
import { IQolConfig } from './types';

/** Plugin id of JupyterLab core's own CodeMirror settings. */
const CODEMIRROR_PLUGIN_ID = '@jupyterlab/codemirror-extension:plugin';

/**
 * Mirrors the "qol" setting into JupyterLab core's own CodeMirror
 * `defaultConfig` (keys confirmed against the extensions
 * `@jupyterlab/codemirror` registers). This is a genuine, persisted
 * user-level override — the same as flipping the toggle in core's own
 * Settings Editor.
 *
 * Only pushes when the editor options actually change, since this
 * listener fires for every change to any of this extension's settings.
 * @param registry - the application's setting registry
 * @param settings - this extension's own live settings
 */
export function applyQolSettings(
  registry: ISettingRegistry,
  settings: ISettingRegistry.ISettings
): void {
  let lastPushed = '';
  const applyCurrent = (): void => {
    const qol = normalizeQol(settings.get('qol').composite);
    const serialized = JSON.stringify(qol);
    if (serialized === lastPushed) {
      return;
    }
    lastPushed = serialized;
    void pushToCodeMirror(registry, qol);
  };
  settings.changed.connect(applyCurrent);
  applyCurrent();
}

async function pushToCodeMirror(
  registry: ISettingRegistry,
  qol: IQolConfig
): Promise<void> {
  try {
    const codeMirrorSettings = await registry.load(CODEMIRROR_PLUGIN_ID);
    const existing = codeMirrorSettings.composite.defaultConfig;
    // Settings composites are JSON; the cast only drops `readonly`.
    const base =
      existing !== undefined && JSONExt.isObject(existing)
        ? (existing as PartialJSONObject)
        : {};
    await codeMirrorSettings.set('defaultConfig', { ...base, ...qol });
  } catch (error) {
    console.warn(
      'neptuneatelier: could not apply editor settings to CodeMirror',
      error
    );
  }
}
