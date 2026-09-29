import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { BackgroundApplier } from '../background-applier';
import { EffectsApplier } from '../effects-applier';
import { EventEngine } from '../event-engine';
import { ThemeHistory } from '../history';
import { PresetManager } from '../presets';
import { ThemeApplier } from '../theme-applier';

/** Everything the Theme Studio's tabs need access to. */
export interface IStudioServices {
  settings: ISettingRegistry.ISettings;
  backgroundApplier: BackgroundApplier;
  presetManager: PresetManager;
  themeApplier: ThemeApplier;
  history: ThemeHistory;
  effectsApplier: EffectsApplier;
  eventEngine: EventEngine;
}
