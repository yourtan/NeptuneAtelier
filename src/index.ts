import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  Dialog,
  ICommandPalette,
  IThemeManager,
  showDialog,
  WidgetTracker
} from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStateDB } from '@jupyterlab/statedb';
import { ITerminalTracker } from '@jupyterlab/terminal';
import { AppearanceApplier } from './appearance-applier';
import { BackgroundApplier } from './background-applier';
import { BrandingApplier } from './branding-applier';
import { ChromeVisibility } from './chrome-visibility';
import { CommandIDs, registerCommands } from './commands';
import { migrateLegacySettings } from './config-normalizers';
import { CursorTrail } from './cursor-trail';
import { EffectsApplier } from './effects-applier';
import { EventEngine } from './event-engine';
import { FloatingLayout } from './floating-layout';
import { FxOverlay } from './fx-overlay';
import { ThemeHistory } from './history';
import { PresetManager } from './presets';
import { applyQolSettings } from './qol-settings';
import { TerminalTransparency } from './terminal-transparency';
import { ThemeApplier } from './theme-applier';
import type { ThemeStudioPanel } from './widgets/ThemeStudioPanel';

const PLUGIN_ID = 'neptuneatelier:plugin';
const THEME_STUDIO_NAMESPACE = 'neptuneatelier-theme-studio';
const TOUR_STATE_ID = 'neptuneatelier:seen-tour';

/**
 * Theme customization engine: a no-code panel for restyling JupyterLab's
 * colors, backgrounds and effects, shape, fonts, layout, and editor.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description:
    'A no-code theme customization engine for colors, backgrounds, effects, layout, and editor settings.',
  autoStart: true,
  requires: [ISettingRegistry, IStateDB],
  optional: [
    ILayoutRestorer,
    ICommandPalette,
    IThemeManager,
    ILabShell,
    ITerminalTracker
  ],
  activate: async (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry,
    stateDB: IStateDB,
    restorer: ILayoutRestorer | null,
    palette: ICommandPalette | null,
    themeManager: IThemeManager | null,
    labShell: ILabShell | null,
    terminalTracker: ITerminalTracker | null
  ): Promise<void> => {
    let settings: ISettingRegistry.ISettings;
    try {
      settings = await settingRegistry.load(PLUGIN_ID);
    } catch (error) {
      console.error('neptuneatelier: failed to load its own settings', error);
      return;
    }

    try {
      await migrateLegacySettings(settings);
    } catch (error) {
      console.warn('neptuneatelier: could not migrate older settings', error);
    }

    // Self-managing: each connects to `settings.changed` and lives for the
    // app session, same as JupyterLab core's own singleton plugin services.
    const themeApplier = new ThemeApplier(settings, themeManager, app.restored);
    new AppearanceApplier(settings);
    new CursorTrail(settings);
    new ChromeVisibility(app, settings);
    new FloatingLayout(app, settings);
    const backgroundApplier = new BackgroundApplier(settings, stateDB);
    new BrandingApplier(app, settings, backgroundApplier);
    const effectsApplier = new EffectsApplier(
      app,
      settings,
      backgroundApplier.host,
      labShell,
      backgroundApplier
    );
    const eventEngine = new EventEngine(
      app,
      settings,
      new FxOverlay(),
      effectsApplier
    );
    if (terminalTracker) {
      new TerminalTransparency(terminalTracker, themeApplier, themeManager);
    }
    const presetManager = new PresetManager(settings, backgroundApplier);
    const history = new ThemeHistory(settings);
    applyQolSettings(settingRegistry, settings);

    // The panel is loaded on demand (dynamic import) rather than up front,
    // since its React tree is only needed once a user actually opens it.
    const tracker = new WidgetTracker<ThemeStudioPanel>({
      namespace: THEME_STUDIO_NAMESPACE
    });

    const showTourOnce = async (): Promise<void> => {
      const seen = await stateDB.fetch(TOUR_STATE_ID);
      if (seen) {
        return;
      }
      await stateDB.save(TOUR_STATE_ID, true);
      await showDialog({
        title: 'Welcome to Theme Studio',
        body: 'Restyle JupyterLab from here, no code required. A quick map of what is where: Colors, Background, Effects, and Particle Lab shape what you see; Events adds animations and sounds that react to what you do; Style, Layout, Editor, and Branding cover shape, chrome, and editor behavior; Presets saves, randomizes, shares, and applies starter themes; CSS is a raw escape hatch. Try Presets → Starter themes to see a few finished looks, or Presets → Randomize for a surprise.',
        buttons: [Dialog.okButton({ label: 'Got it' })]
      });
    };

    const openThemeStudio = async (): Promise<void> => {
      let panel = tracker.currentWidget;
      if (!panel || panel.isDisposed) {
        const { ThemeStudioPanel } = await import('./widgets/ThemeStudioPanel');
        panel = new ThemeStudioPanel({
          settings,
          backgroundApplier,
          presetManager,
          themeApplier,
          history,
          effectsApplier,
          eventEngine
        });
        await tracker.add(panel);
        app.shell.add(panel, 'right', { rank: 500 });
        void showTourOnce();
      }
      app.shell.activateById(panel.id);
    };

    if (restorer) {
      void restorer.restore(tracker, {
        command: CommandIDs.openThemeStudio,
        name: () => THEME_STUDIO_NAMESPACE
      });
    }

    registerCommands(app, { openThemeStudio, settings, history });

    if (palette) {
      const category = 'Theme Studio';
      for (const command of [
        CommandIDs.openThemeStudio,
        CommandIDs.undo,
        CommandIDs.redo,
        CommandIDs.resetTheme,
        CommandIDs.safeMode
      ]) {
        palette.addItem({ command, category });
      }
    }
  }
};

export default plugin;
