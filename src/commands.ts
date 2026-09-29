import { JupyterFrontEnd } from '@jupyterlab/application';
import { Notification } from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { DEFAULT_THEME_CONFIG } from './defaults';
import { ThemeHistory } from './history';
import { writeThemeConfig } from './presets';

/** Command IDs registered by this extension. */
export namespace CommandIDs {
  export const openThemeStudio = 'neptuneatelier:open-theme-studio';
  export const resetTheme = 'neptuneatelier:reset-theme';
  export const safeMode = 'neptuneatelier:safe-mode';
  export const undo = 'neptuneatelier:undo';
  export const redo = 'neptuneatelier:redo';
}

export interface IRegisterCommandsOptions {
  /** Opens (or focuses, if already open) the Theme Studio panel. */
  openThemeStudio: () => Promise<void>;
  /** This extension's own live settings. */
  settings: ISettingRegistry.ISettings;
  history: ThemeHistory;
}

/**
 * Registers all commands with the application command registry.
 * @param app - the JupyterLab application
 * @param options - callbacks/services the commands need
 */
export function registerCommands(
  app: JupyterFrontEnd,
  options: IRegisterCommandsOptions
): void {
  const { settings, history } = options;

  app.commands.addCommand(CommandIDs.openThemeStudio, {
    label: 'Open Theme Studio',
    caption: 'Open the theme customization panel',
    execute: () => options.openThemeStudio()
  });

  app.commands.addCommand(CommandIDs.resetTheme, {
    label: 'Reset Theme to Defaults',
    caption:
      'Reset every Theme Studio setting (saved presets are kept) to its default',
    execute: () => writeThemeConfig(settings, DEFAULT_THEME_CONFIG)
  });

  app.commands.addCommand(CommandIDs.safeMode, {
    label: 'Theme Studio Safe Mode (reset everything)',
    caption:
      'Instantly restore the default look, e.g. if a theme made JupyterLab unusable',
    execute: async () => {
      await writeThemeConfig(settings, DEFAULT_THEME_CONFIG);
      Notification.info(
        'Theme Studio was reset to defaults. Use Undo in the Theme Studio to bring your theme back.',
        { autoClose: 6000 }
      );
    }
  });

  app.commands.addCommand(CommandIDs.undo, {
    label: 'Undo Theme Change',
    isEnabled: () => history.canUndo,
    execute: () => history.undo()
  });

  app.commands.addCommand(CommandIDs.redo, {
    label: 'Redo Theme Change',
    isEnabled: () => history.canRedo,
    execute: () => history.redo()
  });

  history.changed.connect(() => {
    app.commands.notifyCommandChanged(CommandIDs.undo);
    app.commands.notifyCommandChanged(CommandIDs.redo);
  });
}
